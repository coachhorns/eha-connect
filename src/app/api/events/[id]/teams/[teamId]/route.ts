import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET single team registration details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id, teamId } = await params

    const eventTeam = await prisma.eventTeam.findUnique({
      where: { eventId_teamId: { eventId: id, teamId } },
      include: {
        event: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        team: {
          include: {
            roster: {
              include: {
                player: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    slug: true,
                    primaryPosition: true,
                    jerseyNumber: true,
                    profilePhoto: true,
                  },
                },
              },
            },
            _count: {
              select: { roster: true },
            },
          },
        },
      },
    })

    if (!eventTeam) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    return NextResponse.json({ eventTeam })
  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json({ error: 'Failed to fetch registration' }, { status: 500 })
  }
}

// PUT update team registration (pool, seed)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, teamId } = await params
    const body = await request.json()
    const { pool, seed } = body

    const eventTeam = await prisma.eventTeam.findUnique({
      where: { eventId_teamId: { eventId: id, teamId } },
    })

    if (!eventTeam) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const updated = await prisma.eventTeam.update({
      where: { id: eventTeam.id },
      data: {
        pool: pool !== undefined ? pool : eventTeam.pool,
        seed: seed !== undefined ? (seed ? parseInt(seed) : null) : eventTeam.seed,
      },
      include: {
        team: {
          include: {
            _count: {
              select: { roster: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ eventTeam: updated })
  } catch (error) {
    console.error('Error updating registration:', error)
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  }
}

// DELETE remove team from event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, teamId } = await params

    const eventTeam = await prisma.eventTeam.findUnique({
      where: { eventId_teamId: { eventId: id, teamId } },
    })

    if (!eventTeam) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Check if team has any games in this event
    const gamesCount = await prisma.game.count({
      where: {
        eventId: id,
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId },
        ],
      },
    })

    if (gamesCount > 0) {
      return NextResponse.json(
        { error: 'Cannot remove team with scheduled games. Remove games first.' },
        { status: 400 }
      )
    }

    await prisma.eventTeam.delete({
      where: { id: eventTeam.id },
    })

    return NextResponse.json({ message: 'Team removed from event' })
  } catch (error) {
    console.error('Error removing team:', error)
    return NextResponse.json({ error: 'Failed to remove team' }, { status: 500 })
  }
}
