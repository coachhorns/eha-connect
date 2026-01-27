import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to generate slug
function generateSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const random = Math.random().toString(36).substring(2, 6)
  return `${base}-${random}`
}

// Add a player to the team roster
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params

    // Verify team ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        program: {
          select: { ownerId: true },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!team.program || team.program.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, jerseyNumber, primaryPosition, playerId, heightFeet, heightInches, school, graduationYear } = body

    // If playerId is provided, add existing player to roster
    if (playerId) {
      // Check if player is already on this roster
      const existingRoster = await prisma.teamRoster.findFirst({
        where: {
          teamId,
          playerId,
          leftAt: null,
        },
      })

      if (existingRoster) {
        return NextResponse.json({ error: 'Player is already on this roster' }, { status: 400 })
      }

      const rosterEntry = await prisma.teamRoster.create({
        data: {
          teamId,
          playerId,
          jerseyNumber: jerseyNumber || null,
        },
        include: {
          player: true,
        },
      })

      return NextResponse.json({ roster: rosterEntry }, { status: 201 })
    }

    // Otherwise, create a new player and add to roster
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the player
      const player = await tx.player.create({
        data: {
          firstName,
          lastName,
          slug: generateSlug(firstName, lastName),
          jerseyNumber: jerseyNumber || null,
          primaryPosition: primaryPosition || null,
          heightFeet: heightFeet ? parseInt(heightFeet, 10) : null,
          heightInches: heightInches ? parseInt(heightInches, 10) : null,
          school: school || null,
          graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
          isActive: true,
          isVerified: false,
        },
      })

      // Add to roster
      const roster = await tx.teamRoster.create({
        data: {
          teamId,
          playerId: player.id,
          jerseyNumber: jerseyNumber || null,
        },
        include: {
          player: true,
        },
      })

      return roster
    })

    return NextResponse.json({ roster: result }, { status: 201 })
  } catch (error) {
    console.error('Error adding player to roster:', error)
    return NextResponse.json(
      { error: 'Failed to add player' },
      { status: 500 }
    )
  }
}

// Update a player on the team roster
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params

    // Verify team ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        program: {
          select: { ownerId: true },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!team.program || team.program.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { playerId, firstName, lastName, jerseyNumber, primaryPosition, heightFeet, heightInches, school, graduationYear } = body

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Verify the player is on this team's roster
    const rosterEntry = await prisma.teamRoster.findFirst({
      where: {
        teamId,
        playerId,
        leftAt: null,
      },
    })

    if (!rosterEntry) {
      return NextResponse.json({ error: 'Player is not on this roster' }, { status: 404 })
    }

    // Update the player
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        jerseyNumber: jerseyNumber !== undefined ? (jerseyNumber || null) : undefined,
        primaryPosition: primaryPosition !== undefined ? (primaryPosition || null) : undefined,
        heightFeet: heightFeet !== undefined ? (heightFeet ? parseInt(heightFeet, 10) : null) : undefined,
        heightInches: heightInches !== undefined ? (heightInches ? parseInt(heightInches, 10) : null) : undefined,
        school: school !== undefined ? (school || null) : undefined,
        graduationYear: graduationYear !== undefined ? (graduationYear ? parseInt(graduationYear, 10) : null) : undefined,
      },
    })

    // Also update jersey number on the roster entry if provided
    if (jerseyNumber !== undefined) {
      await prisma.teamRoster.update({
        where: { id: rosterEntry.id },
        data: { jerseyNumber: jerseyNumber || null },
      })
    }

    return NextResponse.json({ player: updatedPlayer })
  } catch (error) {
    console.error('Error updating player:', error)
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    )
  }
}

// Remove a player from the team roster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Verify team ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        program: {
          select: { ownerId: true },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!team.program || team.program.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Soft delete - set leftAt timestamp
    await prisma.teamRoster.updateMany({
      where: {
        teamId,
        playerId,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing player from roster:', error)
    return NextResponse.json(
      { error: 'Failed to remove player' },
      { status: 500 }
    )
  }
}
