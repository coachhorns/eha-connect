import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface PlayerInput {
  firstName: string
  lastName: string
  jerseyNumber: string | null
  primaryPosition: string | null
  graduationYear: number | null
  heightFeet: number | null
  heightInches: number | null
  school: string | null
}

function generateSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const random = Math.random().toString(36).substring(2, 6)
  return `${base}-${random}`
}

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
        roster: {
          where: { leftAt: null },
          include: {
            player: {
              select: { firstName: true, lastName: true },
            },
          },
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
    const { players } = body as { players: PlayerInput[] }

    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'No players provided' }, { status: 400 })
    }

    // Get existing player names on roster to check for duplicates
    const existingPlayers = new Set(
      team.roster.map(r =>
        `${r.player.firstName.toLowerCase()}-${r.player.lastName.toLowerCase()}`
      )
    )

    const results = {
      added: 0,
      skipped: 0,
      errors: 0,
    }

    // Process each player in a transaction
    await prisma.$transaction(async (tx) => {
      for (const playerData of players) {
        const { firstName, lastName, jerseyNumber, primaryPosition, graduationYear, heightFeet, heightInches, school } = playerData

        if (!firstName || !lastName) {
          results.errors++
          continue
        }

        // Check for duplicate
        const playerKey = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
        if (existingPlayers.has(playerKey)) {
          results.skipped++
          continue
        }

        try {
          // Create the player
          const player = await tx.player.create({
            data: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              slug: generateSlug(firstName, lastName),
              jerseyNumber: jerseyNumber || null,
              primaryPosition: primaryPosition || null,
              graduationYear: graduationYear || null,
              heightFeet: heightFeet || null,
              heightInches: heightInches || null,
              school: school || null,
              isActive: true,
              isVerified: false,
            },
          })

          // Add to roster
          await tx.teamRoster.create({
            data: {
              teamId,
              playerId: player.id,
              jerseyNumber: jerseyNumber || null,
            },
          })

          // Track that this player is now on the roster
          existingPlayers.add(playerKey)
          results.added++
        } catch (error) {
          console.error('Error adding player:', firstName, lastName, error)
          results.errors++
        }
      }
    })

    return NextResponse.json({
      success: true,
      results,
      message: `Added ${results.added} players. Skipped ${results.skipped} duplicates. ${results.errors} errors.`,
    })
  } catch (error) {
    console.error('Error batch importing players:', error)
    return NextResponse.json(
      { error: 'Failed to import players' },
      { status: 500 }
    )
  }
}
