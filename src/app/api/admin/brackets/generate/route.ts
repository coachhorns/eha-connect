import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type GenerationType = 'POOL' | 'BRACKET'

interface GenerateRequest {
  eventId: string
  type: GenerationType
  name: string
  teams: string[] // Array of team IDs
  settings?: {
    poolCode?: string // e.g., "A", "B" for pool identification
    ageGroup?: string
    division?: string
    seeds?: string[] // For brackets: ordered team IDs by seed
  }
}

// Generate round-robin matchups for pool play
function generateRoundRobinMatchups(teamIds: string[]): { homeTeamId: string; awayTeamId: string }[] {
  const matchups: { homeTeamId: string; awayTeamId: string }[] = []

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      // Alternate home/away to balance
      if ((i + j) % 2 === 0) {
        matchups.push({ homeTeamId: teamIds[i], awayTeamId: teamIds[j] })
      } else {
        matchups.push({ homeTeamId: teamIds[j], awayTeamId: teamIds[i] })
      }
    }
  }

  return matchups
}

// Calculate bracket structure for single elimination
function calculateBracketStructure(numTeams: number): { rounds: number; slots: { round: number; position: number }[] } {
  // Find the next power of 2 >= numTeams
  const totalSlots = Math.pow(2, Math.ceil(Math.log2(numTeams)))
  const rounds = Math.ceil(Math.log2(totalSlots))

  const slots: { round: number; position: number }[] = []

  // Generate slots for each round
  for (let round = 1; round <= rounds; round++) {
    const gamesInRound = totalSlots / Math.pow(2, round)
    for (let position = 1; position <= gamesInRound; position++) {
      slots.push({ round, position })
    }
  }

  return { rounds, slots }
}

// Get round name based on round number and total rounds
function getRoundName(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round + 1

  switch (roundsFromEnd) {
    case 1:
      return 'Championship'
    case 2:
      return 'Semifinal'
    case 3:
      return 'Quarterfinal'
    default:
      return `Round ${round}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateRequest = await request.json()
    const { eventId, type, name, teams, settings } = body

    // Validation
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: 'Bracket/Pool name is required' }, { status: 400 })
    }

    if (!teams || teams.length < 2) {
      return NextResponse.json({ error: 'At least 2 teams are required' }, { status: 400 })
    }

    if (type !== 'POOL' && type !== 'BRACKET') {
      return NextResponse.json({ error: 'Invalid type. Must be POOL or BRACKET' }, { status: 400 })
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, startDate: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify all teams exist
    const teamsExist = await prisma.team.findMany({
      where: { id: { in: teams } },
      select: { id: true, name: true },
    })

    if (teamsExist.length !== teams.length) {
      return NextResponse.json({ error: 'One or more teams not found' }, { status: 404 })
    }

    // Use a placeholder date for unscheduled games (will be set when scheduled)
    const placeholderDate = event.startDate

    if (type === 'POOL') {
      // POOL PLAY (Round Robin)
      const bracketType = teams.length <= 4 ? 'ROUND_ROBIN' : 'POOL_PLAY'

      // Create the bracket record for tracking
      const bracket = await prisma.bracket.create({
        data: {
          eventId,
          name,
          type: bracketType,
          settings: {
            poolCode: settings?.poolCode || null,
            teamCount: teams.length,
            gamesPerTeam: teams.length - 1,
          },
        },
      })

      // Generate round-robin matchups
      const matchups = generateRoundRobinMatchups(teams)

      // Create game records
      const games = await Promise.all(
        matchups.map((matchup, index) =>
          prisma.game.create({
            data: {
              eventId,
              bracketId: bracket.id,
              homeTeamId: matchup.homeTeamId,
              awayTeamId: matchup.awayTeamId,
              scheduledAt: placeholderDate,
              status: 'SCHEDULED',
              gameType: 'POOL',
              poolCode: settings?.poolCode || null,
              ageGroup: settings?.ageGroup || null,
              division: settings?.division || null,
              courtId: null, // Will be assigned in scheduling grid
            },
            include: {
              homeTeam: { select: { id: true, name: true } },
              awayTeam: { select: { id: true, name: true } },
            },
          })
        )
      )

      return NextResponse.json({
        bracket,
        games,
        message: `Created ${games.length} pool play games`,
      }, { status: 201 })
    } else {
      // BRACKET (Single Elimination)
      const teamOrder = settings?.seeds || teams
      const { rounds, slots } = calculateBracketStructure(teamOrder.length)

      // Create the bracket record
      const bracket = await prisma.bracket.create({
        data: {
          eventId,
          name,
          type: 'SINGLE_ELIM',
          settings: {
            teamCount: teamOrder.length,
            rounds,
            seeds: teamOrder,
          },
        },
      })

      // Create bracket slots and first-round games
      const firstRoundSlots = slots.filter(s => s.round === 1)
      const laterRoundSlots = slots.filter(s => s.round > 1)

      // For first round, create games with actual teams based on seeding
      const firstRoundGames: any[] = []
      for (let i = 0; i < firstRoundSlots.length; i++) {
        const slot = firstRoundSlots[i]
        const homeIndex = i * 2
        const awayIndex = i * 2 + 1

        // Standard bracket seeding: 1v8, 4v5, 2v7, 3v6 for 8 teams
        // For simplicity, we'll use sequential pairing here
        // Can be enhanced with proper bracket seeding logic

        if (homeIndex < teamOrder.length && awayIndex < teamOrder.length) {
          const game = await prisma.game.create({
            data: {
              eventId,
              bracketId: bracket.id,
              homeTeamId: teamOrder[homeIndex],
              awayTeamId: teamOrder[awayIndex],
              scheduledAt: placeholderDate,
              status: 'SCHEDULED',
              gameType: 'BRACKET',
              bracketRound: getRoundName(slot.round, rounds),
              bracketPosition: slot.position,
              ageGroup: settings?.ageGroup || null,
              division: settings?.division || null,
              courtId: null,
            },
            include: {
              homeTeam: { select: { id: true, name: true } },
              awayTeam: { select: { id: true, name: true } },
            },
          })

          // Create bracket slot linked to game
          await prisma.bracketSlot.create({
            data: {
              bracketId: bracket.id,
              round: slot.round,
              position: slot.position,
              gameId: game.id,
            },
          })

          firstRoundGames.push(game)
        } else if (homeIndex < teamOrder.length) {
          // Bye - team advances automatically, create slot without game
          await prisma.bracketSlot.create({
            data: {
              bracketId: bracket.id,
              round: slot.round,
              position: slot.position,
              gameId: null, // No game needed - bye
            },
          })
        }
      }

      // Create placeholder slots for later rounds (games TBD based on winners)
      const laterRoundSlotRecords = await Promise.all(
        laterRoundSlots.map(slot =>
          prisma.bracketSlot.create({
            data: {
              bracketId: bracket.id,
              round: slot.round,
              position: slot.position,
              gameId: null, // Will be filled when previous round completes
            },
          })
        )
      )

      // Fetch complete bracket with all relations
      const completeBracket = await prisma.bracket.findUnique({
        where: { id: bracket.id },
        include: {
          games: {
            include: {
              homeTeam: { select: { id: true, name: true } },
              awayTeam: { select: { id: true, name: true } },
            },
          },
          slots: {
            orderBy: [{ round: 'asc' }, { position: 'asc' }],
          },
        },
      })

      return NextResponse.json({
        bracket: completeBracket,
        games: firstRoundGames,
        message: `Created bracket with ${firstRoundGames.length} first-round games and ${laterRoundSlotRecords.length} slots for later rounds`,
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Error generating bracket:', error)
    return NextResponse.json(
      { error: 'Failed to generate bracket' },
      { status: 500 }
    )
  }
}
