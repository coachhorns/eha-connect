import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        courts: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { events: true },
        },
      },
    })

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    return NextResponse.json({ venue })
  } catch (error) {
    console.error('Error fetching venue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch venue' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, address, city, state, zip, timezone, courts } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Venue name is required' }, { status: 400 })
    }

    // Check venue exists
    const existingVenue = await prisma.venue.findUnique({
      where: { id },
      include: { courts: true },
    })

    if (!existingVenue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Process courts
    const courtsToUpdate: Array<{ id: string; name: string }> = []
    const courtsToCreate: Array<{ name: string }> = []
    const courtIdsToKeep: string[] = []

    if (courts && Array.isArray(courts)) {
      for (const court of courts) {
        if (court.id && !court.id.startsWith('new-')) {
          // Existing court - update
          courtsToUpdate.push({ id: court.id, name: court.name.trim() })
          courtIdsToKeep.push(court.id)
        } else if (court.name && court.name.trim()) {
          // New court - create
          courtsToCreate.push({ name: court.name.trim() })
        }
      }
    }

    // Find courts to delete (existing courts not in the keep list)
    const courtsToDelete = existingVenue.courts
      .filter((c) => !courtIdsToKeep.includes(c.id))
      .map((c) => c.id)

    // Check if any courts to delete have games assigned
    if (courtsToDelete.length > 0) {
      const gamesOnCourts = await prisma.game.count({
        where: { courtId: { in: courtsToDelete } },
      })

      if (gamesOnCourts > 0) {
        return NextResponse.json(
          { error: 'Cannot delete courts that have games scheduled. Please reassign or remove the games first.' },
          { status: 400 }
        )
      }
    }

    // Perform all updates in a transaction
    const venue = await prisma.$transaction(async (tx) => {
      // Update venue details
      const updatedVenue = await tx.venue.update({
        where: { id },
        data: {
          name: name.trim(),
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          zip: zip?.trim() || null,
          timezone: timezone || 'America/Chicago',
        },
      })

      // Delete removed courts
      if (courtsToDelete.length > 0) {
        await tx.court.deleteMany({
          where: { id: { in: courtsToDelete } },
        })
      }

      // Update existing courts
      for (const court of courtsToUpdate) {
        await tx.court.update({
          where: { id: court.id },
          data: { name: court.name },
        })
      }

      // Create new courts
      if (courtsToCreate.length > 0) {
        await tx.court.createMany({
          data: courtsToCreate.map((c) => ({
            name: c.name,
            venueId: id,
          })),
        })
      }

      // Return venue with updated courts
      return tx.venue.findUnique({
        where: { id },
        include: {
          courts: { orderBy: { name: 'asc' } },
        },
      })
    })

    return NextResponse.json({ venue })
  } catch (error) {
    console.error('Error updating venue:', error)
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check venue exists
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        courts: {
          include: {
            _count: { select: { games: true } },
          },
        },
        _count: { select: { events: true } },
      },
    })

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Check if any courts have games
    const totalGames = venue.courts.reduce((sum, c) => sum + c._count.games, 0)
    if (totalGames > 0) {
      return NextResponse.json(
        { error: 'Cannot delete venue with scheduled games. Please remove all games first.' },
        { status: 400 }
      )
    }

    // Check if venue is linked to events
    if (venue._count.events > 0) {
      return NextResponse.json(
        { error: 'Cannot delete venue linked to events. Please unlink from events first.' },
        { status: 400 }
      )
    }

    // Delete venue (courts cascade delete)
    await prisma.venue.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting venue:', error)
    return NextResponse.json(
      { error: 'Failed to delete venue' },
      { status: 500 }
    )
  }
}
