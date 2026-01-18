import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper to get stat decrements based on stat type
function getStatDecrements(statType: string): Record<string, { decrement: number }> {
  const updates: Record<string, { decrement: number }> = {}

  switch (statType) {
    case 'PTS_2':
      updates.points = { decrement: 2 }
      updates.fgMade = { decrement: 1 }
      updates.fgAttempted = { decrement: 1 }
      break
    case 'PTS_3':
      updates.points = { decrement: 3 }
      updates.fgMade = { decrement: 1 }
      updates.fgAttempted = { decrement: 1 }
      updates.fg3Made = { decrement: 1 }
      updates.fg3Attempted = { decrement: 1 }
      break
    case 'PTS_FT':
      updates.points = { decrement: 1 }
      updates.ftMade = { decrement: 1 }
      updates.ftAttempted = { decrement: 1 }
      break
    case 'FG_MISS':
      updates.fgAttempted = { decrement: 1 }
      break
    case 'FG3_MISS':
      updates.fgAttempted = { decrement: 1 }
      updates.fg3Attempted = { decrement: 1 }
      break
    case 'FT_MISS':
      updates.ftAttempted = { decrement: 1 }
      break
    case 'OREB':
      updates.offRebounds = { decrement: 1 }
      updates.rebounds = { decrement: 1 }
      break
    case 'DREB':
      updates.defRebounds = { decrement: 1 }
      updates.rebounds = { decrement: 1 }
      break
    case 'AST':
      updates.assists = { decrement: 1 }
      break
    case 'STL':
      updates.steals = { decrement: 1 }
      break
    case 'BLK':
      updates.blocks = { decrement: 1 }
      break
    case 'TO':
      updates.turnovers = { decrement: 1 }
      break
    case 'FOUL':
      updates.fouls = { decrement: 1 }
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

    const { statLogId, gameId } = await request.json()

    if (!statLogId || !gameId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Execute all operations in a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Get and validate the stat log entry
      const statLog = await tx.statLog.findUnique({
        where: { id: statLogId },
      })

      if (!statLog || statLog.isUndone) {
        throw new Error('Stat not found or already undone')
      }

      // 2. Mark as undone
      await tx.statLog.update({
        where: { id: statLogId },
        data: { isUndone: true },
      })

      // 3. Get stat decrements
      const statDecrements = getStatDecrements(statLog.statType)

      // 4. Update game stats for the player
      const existingStats = await tx.gameStats.findUnique({
        where: {
          gameId_playerId: { gameId, playerId: statLog.playerId },
        },
      })

      if (existingStats) {
        await tx.gameStats.update({
          where: { id: existingStats.id },
          data: statDecrements,
        })
      }

      // 5. Reverse game score if points were undone
      if (statLog.statType.startsWith('PTS')) {
        const game = await tx.game.findUnique({
          where: { id: gameId },
          select: { homeTeamId: true },
        })

        if (game) {
          const isHomeTeam = game.homeTeamId === statLog.teamId
          const pointValue = getPointValue(statLog.statType)

          await tx.game.update({
            where: { id: gameId },
            data: isHomeTeam
              ? { homeScore: { decrement: pointValue } }
              : { awayScore: { decrement: pointValue } },
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error undoing stat:', error)
    const message = error instanceof Error ? error.message : 'Failed to undo stat'
    const status = message === 'Stat not found or already undone' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
