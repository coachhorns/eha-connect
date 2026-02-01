import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Bulk team registration for an event (Director only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json(
        { error: 'Only Program Directors can register teams' },
        { status: 403 }
      )
    }

    const { id: eventId } = await params
    const body = await request.json()
    const { teamIds } = body

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one team ID is required' },
        { status: 400 }
      )
    }

    // Verify event exists and is open for registration
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        isPublished: true,
        isActive: true,
        startDate: true,
        ageGroups: true,
        divisions: true,
        teams: {
          select: {
            teamId: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.isPublished || !event.isActive) {
      return NextResponse.json(
        { error: 'Event is not open for registration' },
        { status: 400 }
      )
    }

    if (new Date() > new Date(event.startDate)) {
      return NextResponse.json(
        { error: 'Registration has closed for this event' },
        { status: 400 }
      )
    }

    // Get director's program
    const program = await prisma.program.findFirst({
      where: {
        ownerId: session.user.id,
      },
      select: {
        id: true,
        teams: {
          where: {
            id: { in: teamIds },
          },
          select: {
            id: true,
            name: true,
            ageGroup: true,
            division: true,
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json(
        { error: 'You do not have a program. Please create one first.' },
        { status: 400 }
      )
    }

    // Verify all teams belong to the director's program
    if (program.teams.length !== teamIds.length) {
      return NextResponse.json(
        { error: 'Some teams do not belong to your program' },
        { status: 403 }
      )
    }

    // Check for already registered teams
    const alreadyRegisteredTeamIds = new Set(event.teams.map(t => t.teamId))
    const duplicateTeams = teamIds.filter(id => alreadyRegisteredTeamIds.has(id))

    if (duplicateTeams.length > 0) {
      const duplicateNames = program.teams
        .filter(t => duplicateTeams.includes(t.id))
        .map(t => t.name)
        .join(', ')

      return NextResponse.json(
        { error: `The following teams are already registered: ${duplicateNames}` },
        { status: 400 }
      )
    }

    // Validate age group/division compatibility
    const incompatibleTeams: string[] = []

    for (const team of program.teams) {
      // Check age group
      if (event.ageGroups.length > 0 && team.ageGroup) {
        if (!event.ageGroups.includes(team.ageGroup)) {
          incompatibleTeams.push(
            `${team.name} (age group ${team.ageGroup} not accepted)`
          )
          continue
        }
      }

      // Check division
      if (event.divisions.length > 0 && team.division) {
        if (!event.divisions.includes(team.division)) {
          incompatibleTeams.push(
            `${team.name} (division ${team.division} not accepted)`
          )
        }
      }
    }

    if (incompatibleTeams.length > 0) {
      return NextResponse.json(
        {
          error: `The following teams are not compatible with this event: ${incompatibleTeams.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Create EventTeam records in a transaction
    const eventTeams = await prisma.$transaction(
      teamIds.map(teamId =>
        prisma.eventTeam.create({
          data: {
            eventId,
            teamId,
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                ageGroup: true,
                division: true,
              },
            },
          },
        })
      )
    )

    return NextResponse.json(
      {
        message: `Successfully registered ${eventTeams.length} team${eventTeams.length !== 1 ? 's' : ''}`,
        eventTeams,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error registering teams:', error)
    return NextResponse.json(
      { error: 'Failed to register teams' },
      { status: 500 }
    )
  }
}
