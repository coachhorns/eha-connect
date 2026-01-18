import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper to get stat updates based on stat type
function getStatUpdates(statType: string): Record<string, { increment: number }> {
  const updates: Record<string, { increment: number }> = {}

  switch (statType) {
    case 'PTS_2':
      updates.points = { increment: 2 }
      updates.fgMade = { increment: 1 }
      updates.fgAttempted = { increment: 1 }
      break
    case 'PTS_3':
      updates.points = { increment: 3 }
      updates.fgMade = { increment: 1 }
      updates.fgAttempted = { increment: 1 }
      updates.fg3Made = { increment: 1 }
      updates.fg3Attempted = { increment: 1 }
      break
    case 'PTS_FT':
      updates.points = { increment: 1 }
      updates.ftMade = { increment: 1 }
      updates.ftAttempted = { increment: 1 }
      break
    case 'FG_MISS':
      updates.fgAttempted = { increment: 1 }
      break
    case 'FG3_MISS':
      updates.fgAttempted = { increment: 1 }
      updates.fg3Attempted = { increment: 1 }
      break
    case 'FT_MISS':
      updates.ftAttempted = { increment: 1 }
      break
    case 'OREB':
      updates.offRebounds = { increment: 1 }
      updates.rebounds = { increment: 1 }
      break
    case 'DREB':
      updates.defRebounds = { increment: 1 }
      updates.rebounds = { increment: 1 }
      break
    case 'AST':
      updates.assists = { increment: 1 }
      break
    case 'STL':
      updates.steals = { increment: 1 }
      break
    case 'BLK':
      updates.blocks = { increment: 1 }
      break
    case 'TO':
      updates.turnovers = { increment: 1 }
      break
    case 'FOUL':
      updates.fouls = { increment: 1 }
      break
  }

  return updates
}

// Helper to get point value from stat type
function getPointValue(statType: string): number {
  switch (statType) {
    case 'PTS_2': return 2
    case 'PTS_3': return 3
    case 'PTS_FT': return 1
    default: return 0
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== 'SCOREKEEPER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId, playerId, teamId, statType, value, period, gameTime } = await request.json()

    // playerId is now optional - required fields are gameId, teamId, statType
    if (!gameId || !teamId || !statType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const statUpdates = getStatUpdates(statType)
    const pointValue = value || getPointValue(statType)

    // Execute all operations in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create stat log entry (playerId can be null for team-only stats)
      const statLog = await tx.statLog.create({
        data: {
          gameId,
          playerId: playerId || null,
          teamId,
          statType,
          value: pointValue || 1,
          period: period || 1,
          gameTime,
          createdBy: session.user.id,
        },
      })

      // 2. Only update player stats if playerId is provided
      if (playerId) {
        // Check for existing game stats
        const existingStats = await tx.gameStats.findUnique({
          where: {
            gameId_playerId: { gameId, playerId },
          },
        })

        // Update or create game stats
        if (existingStats) {
          await tx.gameStats.update({
            where: { id: existingStats.id },
            data: statUpdates,
          })
        } else {
          // Create new game stats entry with initial values
          const initialStats: Record<string, number | string> = {
            gameId,
            playerId,
            teamId,
            points: 0,
            rebounds: 0,
            assists: 0,
            steals: 0,
            blocks: 0,
            turnovers: 0,
            fouls: 0,
            fgMade: 0,
            fgAttempted: 0,
            fg3Made: 0,
            fg3Attempted: 0,
            ftMade: 0,
            ftAttempted: 0,
            offRebounds: 0,
            defRebounds: 0,
          }

          // Apply the stat update to initial values
          for (const [key, val] of Object.entries(statUpdates)) {
            if (val && typeof val === 'object' && 'increment' in val) {
              initialStats[key] = val.increment
            }
          }

          await tx.gameStats.create({
            data: initialStats as Parameters<typeof tx.gameStats.create>[0]['data'],
          })
        }
      }

      // 3. Update game score if points were scored
      if (statType.startsWith('PTS') && pointValue > 0) {
        const game = await tx.game.findUnique({
          where: { id: gameId },
          select: { homeTeamId: true },
        })

        if (game) {
          const isHomeTeam = game.homeTeamId === teamId
          await tx.game.update({
            where: { id: gameId },
            data: isHomeTeam
              ? { homeScore: { increment: pointValue } }
              : { awayScore: { increment: pointValue } },
          })
        }
      }

      return statLog
    })

    return NextResponse.json({ success: true, statLog: result })
  } catch (error) {
    console.error('Error recording stat:', error)
    return NextResponse.json({ error: 'Failed to record stat' }, { status: 500 })
  }
}
