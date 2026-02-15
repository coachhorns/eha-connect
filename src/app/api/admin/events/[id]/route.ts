import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeParseDate } from '@/lib/timezone'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// GET single event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
        games: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: { scheduledAt: 'asc' },
        },
        _count: {
          select: { teams: true, games: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Also fetch venues for dropdown population
    const venues = await prisma.venue.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ event, venues })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

// PUT update event
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      type,
      description,
      venue,
      address,
      city,
      state,
      startDate,
      endDate,
      registrationDeadline,
      divisions,
      entryFee,
      bannerImage,
      flyerImage,
      isPublished,
      isNcaaCertified,
      isActive,
    } = body

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({ where: { id } })
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // If name changed, update slug
    let slug = existingEvent.slug
    if (name && name !== existingEvent.name) {
      slug = generateSlug(name)
      let slugExists = await prisma.event.findFirst({
        where: { slug, NOT: { id } },
      })
      let counter = 1
      while (slugExists) {
        slug = `${generateSlug(name)}-${counter}`
        slugExists = await prisma.event.findFirst({
          where: { slug, NOT: { id } },
        })
        counter++
      }
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug !== existingEvent.slug && { slug }),
        ...(type && { type }),
        description: description !== undefined ? description : existingEvent.description,
        venue: venue !== undefined ? venue : existingEvent.venue,
        address: address !== undefined ? address : existingEvent.address,
        city: city !== undefined ? city : existingEvent.city,
        state: state !== undefined ? state : existingEvent.state,
        ...(startDate && { startDate: safeParseDate(startDate) }),
        ...(endDate && { endDate: safeParseDate(endDate) }),
        registrationDeadline: registrationDeadline ? safeParseDate(registrationDeadline) : null,
        ...(divisions !== undefined && { divisions }),
        ...(entryFee !== undefined && { entryFee: entryFee ? parseFloat(entryFee) : null }),
        ...(bannerImage !== undefined && { bannerImage }),
        ...(flyerImage !== undefined && { flyerImage }),
        ...(isPublished !== undefined && { isPublished }),
        ...(isNcaaCertified !== undefined && { isNcaaCertified }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        _count: {
          select: { teams: true, games: true },
        },
      },
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

// DELETE event
// Use ?force=true to permanently delete event and all related data (games, stats, etc.)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { games: true, teams: true },
        },
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Force delete: permanently remove event and ALL related data
    if (force) {
      await prisma.$transaction(async (tx) => {
        // 1. Get game IDs for this event
        const games = await tx.game.findMany({
          where: { eventId: id },
          select: { id: true },
        })
        const gameIds = games.map((g) => g.id)

        // 2. Nullify BracketSlot.gameId references to prevent FK violation
        if (gameIds.length > 0) {
          await tx.bracketSlot.updateMany({
            where: { gameId: { in: gameIds } },
            data: { gameId: null },
          })
        }

        // 3. Delete all games (cascades GameStats, StatLog)
        await tx.game.deleteMany({ where: { eventId: id } })

        // 4. Delete the event (cascades EventTeam, EventAward, Bracket->BracketSlot, ScheduleConstraint)
        await tx.event.delete({ where: { id } })
      }, { timeout: 30000 })

      return NextResponse.json({
        message: 'Event and all related data permanently deleted',
        deleted: true,
      })
    }

    // Non-force: soft delete if event has games
    if (existingEvent._count.games > 0) {
      await prisma.event.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        message: 'Event has games and was deactivated instead of deleted',
        deactivated: true,
      })
    }

    // No games - hard delete directly
    await prisma.event.delete({ where: { id } })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
