import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET teams registered for an event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, name: true, isPublished: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventTeams = await prisma.eventTeam.findMany({
      where: { eventId: id },
      include: {
        team: {
          include: {
            _count: {
              select: { roster: true },
            },
          },
        },
      },
      orderBy: [
        { pool: 'asc' },
        { seed: 'asc' },
        { registeredAt: 'asc' },
      ],
    })

    return NextResponse.json({
      event: { id: event.id, name: event.name },
      teams: eventTeams,
      count: eventTeams.length,
    })
  } catch (error) {
    console.error('Error fetching event teams:', error)
    return NextResponse.json({ error: 'Failed to fetch event teams' }, { status: 500 })
  }
}

// POST register a team for an event (admin only)
export async function POST(
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
    const { teamId, pool, seed } = body

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Verify event exists
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if already registered
    const existing = await prisma.eventTeam.findUnique({
      where: { eventId_teamId: { eventId: id, teamId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Team is already registered for this event' }, { status: 400 })
    }

    const eventTeam = await prisma.eventTeam.create({
      data: {
        eventId: id,
        teamId,
        pool: pool || null,
        seed: seed ? parseInt(seed) : null,
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

    return NextResponse.json({ eventTeam }, { status: 201 })
  } catch (error) {
    console.error('Error registering team:', error)
    return NextResponse.json({ error: 'Failed to register team' }, { status: 500 })
  }
}
