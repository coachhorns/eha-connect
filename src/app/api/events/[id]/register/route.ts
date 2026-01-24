import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// POST - Public team registration for an event
// Creates a new team if needed, or registers an existing team
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      // Team details (for new team or verification)
      teamName,
      ageGroup,
      division,
      city,
      state,
      // Coach contact info
      coachName,
      coachEmail,
      coachPhone,
      // Optional: existing team ID
      existingTeamId,
    } = body

    // Verify event exists and is published
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isPublished: true,
        isActive: true,
        startDate: true,
        ageGroups: true,
        divisions: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.isPublished || !event.isActive) {
      return NextResponse.json({ error: 'Event is not open for registration' }, { status: 400 })
    }

    // Check if registration is still open (event hasn't started)
    if (new Date() > new Date(event.startDate)) {
      return NextResponse.json({ error: 'Registration has closed for this event' }, { status: 400 })
    }

    let teamId: string

    if (existingTeamId) {
      // Register existing team
      const team = await prisma.team.findUnique({ where: { id: existingTeamId } })
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }

      // Check if team age group matches event
      if (event.ageGroups.length > 0 && team.ageGroup && !event.ageGroups.includes(team.ageGroup)) {
        return NextResponse.json(
          { error: `This event is only for ${event.ageGroups.join(', ')} age groups` },
          { status: 400 }
        )
      }

      teamId = existingTeamId

      // Update coach contact info if provided
      if (coachName || coachEmail || coachPhone) {
        await prisma.team.update({
          where: { id: teamId },
          data: {
            ...(coachName && { coachName }),
            ...(coachEmail && { coachEmail }),
            ...(coachPhone && { coachPhone }),
          },
        })
      }
    } else {
      // Create new team
      if (!teamName) {
        return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
      }

      if (!coachName || !coachEmail) {
        return NextResponse.json({ error: 'Coach name and email are required' }, { status: 400 })
      }

      // Check age group requirement
      if (event.ageGroups.length > 0 && ageGroup && !event.ageGroups.includes(ageGroup)) {
        return NextResponse.json(
          { error: `This event is only for ${event.ageGroups.join(', ')} age groups` },
          { status: 400 }
        )
      }

      // Generate unique slug
      let slug = generateSlug(teamName)
      let slugExists = await prisma.team.findUnique({ where: { slug } })
      let counter = 1
      while (slugExists) {
        slug = `${generateSlug(teamName)}-${counter}`
        slugExists = await prisma.team.findUnique({ where: { slug } })
        counter++
      }

      const newTeam = await prisma.team.create({
        data: {
          name: teamName,
          slug,
          ageGroup: ageGroup || null,
          division: division || null,
          city: city || null,
          state: state || null,
          coachName,
          coachEmail,
          coachPhone: coachPhone || null,
        },
      })

      teamId = newTeam.id
    }

    // Check if already registered
    const existing = await prisma.eventTeam.findUnique({
      where: { eventId_teamId: { eventId: id, teamId } },
    })

    if (existing) {
      return NextResponse.json({ error: 'Team is already registered for this event' }, { status: 400 })
    }

    // Register team for event
    const eventTeam = await prisma.eventTeam.create({
      data: {
        eventId: id,
        teamId,
      },
      include: {
        team: true,
        event: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    })

    return NextResponse.json({
      message: 'Team registered successfully',
      eventTeam,
    }, { status: 201 })
  } catch (error) {
    console.error('Error registering team:', error)
    return NextResponse.json({ error: 'Failed to register team' }, { status: 500 })
  }
}
