import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') // YYYY-MM-DD format
    const eventId = searchParams.get('eventId')
    const division = searchParams.get('division')

    // Build where clause for unscheduled games
    const unscheduledWhere: any = {
      status: 'SCHEDULED',
      courtId: null,
    }

    if (eventId) {
      unscheduledWhere.eventId = eventId
    }

    if (division) {
      unscheduledWhere.division = division
    }

    // Build where clause for scheduled games on specific date
    const scheduledWhere: any = {
      status: 'SCHEDULED',
      courtId: { not: null },
    }

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      scheduledWhere.scheduledAt = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    // Fetch all data in parallel
    const [unscheduledGames, scheduledGames, venues, events] = await Promise.all([
      // Unscheduled games (no court assigned)
      prisma.game.findMany({
        where: unscheduledWhere,
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          event: { select: { id: true, name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      // Scheduled games for the selected date
      prisma.game.findMany({
        where: scheduledWhere,
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          event: { select: { id: true, name: true } },
          assignedCourt: {
            include: {
              venue: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      // All venues with courts
      prisma.venue.findMany({
        include: {
          courts: true, // Fetch all, we'll sort manually for natural order
        },
        orderBy: { name: 'asc' },
      }),
      // All events for filter dropdown
      prisma.event.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { startDate: 'desc' },
      }),
    ])

    // Get unique divisions from games
    const divisions = await prisma.game.findMany({
      where: { division: { not: null } },
      select: { division: true },
      distinct: ['division'],
    })

    // Sort courts alphanumerically (e.g., Court 1, Court 2, Court 10)
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    venues.forEach(venue => {
      venue.courts.sort((a, b) => collator.compare(a.name, b.name))
    })

    return NextResponse.json({
      unscheduledGames,
      scheduledGames,
      venues,
      events,
      divisions: divisions.map(d => d.division).filter(Boolean),
    })
  } catch (error) {
    console.error('Error fetching schedule data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule data' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { gameId, courtId, scheduledAt } = body

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}

    if (courtId !== undefined) {
      updateData.courtId = courtId // Can be null to unassign
    }

    if (scheduledAt) {
      updateData.scheduledAt = new Date(scheduledAt)
    }

    // Verify no scheduling conflict (same court, overlapping time)
    if (courtId && scheduledAt) {
      const gameTime = new Date(scheduledAt)
      const gameEndTime = new Date(gameTime.getTime() + 60 * 60 * 1000) // Assume 1 hour games
      const gameStartBuffer = new Date(gameTime.getTime() - 60 * 60 * 1000)

      const conflictingGame = await prisma.game.findFirst({
        where: {
          id: { not: gameId },
          courtId,
          scheduledAt: {
            gte: gameStartBuffer,
            lt: gameEndTime,
          },
          status: { not: 'CANCELED' },
        },
      })

      if (conflictingGame) {
        return NextResponse.json(
          { error: 'Schedule conflict: Another game is already scheduled at this court and time' },
          { status: 409 }
        )
      }
    }

    const game = await prisma.game.update({
      where: { id: gameId },
      data: updateData,
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        event: { select: { id: true, name: true } },
        assignedCourt: {
          include: {
            venue: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json({ game })
  } catch (error) {
    console.error('Error updating game schedule:', error)
    return NextResponse.json(
      { error: 'Failed to update game schedule' },
      { status: 500 }
    )
  }
}
