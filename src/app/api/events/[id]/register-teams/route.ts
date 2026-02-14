import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface TimeConstraint {
  type: 'NOT_BEFORE' | 'NOT_AFTER' | 'NOT_BETWEEN'
  day: 'Friday' | 'Saturday' | 'Sunday'
  time: string
  endTime?: string
}

interface ScheduleRequestData {
  coachConflict: boolean
  maxGamesPerDay: number | null
  constraints: TimeConstraint[]
  matchupRestrictions?: string[]
}

function validateScheduleRequests(
  scheduleRequests: Record<string, unknown>,
  validTeamIds: string[]
): { valid: boolean; error?: string } {
  const validSet = new Set(validTeamIds)
  const validTypes = ['NOT_BEFORE', 'NOT_AFTER', 'NOT_BETWEEN']
  const validDays = ['Friday', 'Saturday', 'Sunday']
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

  for (const [teamId, data] of Object.entries(scheduleRequests)) {
    if (!validSet.has(teamId)) {
      return { valid: false, error: `Schedule request references unknown team: ${teamId}` }
    }

    const sr = data as Record<string, unknown>
    if (typeof sr !== 'object' || sr === null) {
      return { valid: false, error: `Invalid schedule request for team ${teamId}` }
    }

    if (typeof sr.coachConflict !== 'boolean') {
      return { valid: false, error: 'coachConflict must be a boolean' }
    }

    if (sr.maxGamesPerDay !== null && sr.maxGamesPerDay !== undefined) {
      const max = Number(sr.maxGamesPerDay)
      if (!Number.isInteger(max) || max < 1 || max > 10) {
        return { valid: false, error: 'maxGamesPerDay must be 1-10 or null' }
      }
    }

    if (!Array.isArray(sr.constraints)) {
      return { valid: false, error: 'constraints must be an array' }
    }

    for (const c of sr.constraints as TimeConstraint[]) {
      if (!validTypes.includes(c.type)) {
        return { valid: false, error: `Invalid constraint type: ${c.type}` }
      }
      if (!validDays.includes(c.day)) {
        return { valid: false, error: `Invalid day: ${c.day}` }
      }
      if (!timeRegex.test(c.time)) {
        return { valid: false, error: `Invalid time format: ${c.time}` }
      }
      if (c.type === 'NOT_BETWEEN' && (!c.endTime || !timeRegex.test(c.endTime))) {
        return { valid: false, error: 'NOT_BETWEEN requires a valid endTime' }
      }
    }

    // Validate matchup restrictions
    if (sr.matchupRestrictions !== undefined) {
      if (!Array.isArray(sr.matchupRestrictions)) {
        return { valid: false, error: 'matchupRestrictions must be an array' }
      }
      for (const restrictedId of sr.matchupRestrictions as string[]) {
        if (typeof restrictedId !== 'string') {
          return { valid: false, error: 'matchupRestrictions must contain team IDs' }
        }
        if (restrictedId === teamId) {
          return { valid: false, error: 'A team cannot have a matchup restriction against itself' }
        }
        if (!validSet.has(restrictedId)) {
          return { valid: false, error: `Matchup restriction references unknown team: ${restrictedId}` }
        }
      }
    }
  }

  return { valid: true }
}

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
    const { teamIds, scheduleRequests } = body as {
      teamIds: string[]
      scheduleRequests?: Record<string, ScheduleRequestData>
    }

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
        registrationDeadline: true,
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

    // Check if registration is still open (use end of deadline day)
    const cutoffDate = event.registrationDeadline || event.startDate
    const cutoff = new Date(cutoffDate)
    if (cutoff.getUTCHours() === 0 && cutoff.getUTCMinutes() === 0) {
      cutoff.setUTCHours(23, 59, 59, 999)
    }
    if (new Date() > cutoff) {
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

    // Validate division compatibility
    const incompatibleTeams: string[] = []

    for (const team of program.teams) {
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

    // Validate schedule requests if provided
    if (scheduleRequests && typeof scheduleRequests === 'object') {
      const validation = validateScheduleRequests(scheduleRequests, teamIds)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }
    }

    // Create EventTeam records in a transaction
    const eventTeams = await prisma.$transaction(
      teamIds.map(teamId =>
        prisma.eventTeam.create({
          data: {
            eventId,
            teamId,
            ...(scheduleRequests?.[teamId]
              ? { scheduleRequests: JSON.parse(JSON.stringify(scheduleRequests[teamId])) }
              : {}),
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
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
