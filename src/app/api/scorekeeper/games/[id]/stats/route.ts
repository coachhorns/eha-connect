import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== 'SCOREKEEPER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: gameId } = await params

    // Get all game stats for this game
    const gameStats = await prisma.gameStats.findMany({
      where: { gameId },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Get recent stat logs for undo functionality
    const statLogs = await prisma.statLog.findMany({
      where: {
        gameId,
        isUndone: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    interface PlayerStats {
      points: number
      rebounds: number
      assists: number
      steals: number
      blocks: number
      turnovers: number
      fouls: number
      fgMade: number
      fgAttempted: number
      fg3Made: number
      fg3Attempted: number
      ftMade: number
      ftAttempted: number
      offRebounds: number
      defRebounds: number
    }

    // Transform game stats to a map by playerId
    const statsMap: Record<string, PlayerStats> = {}
    for (const stat of gameStats) {
      statsMap[stat.playerId] = {
        points: stat.points,
        rebounds: stat.rebounds,
        assists: stat.assists,
        steals: stat.steals,
        blocks: stat.blocks,
        turnovers: stat.turnovers,
        fouls: stat.fouls,
        fgMade: stat.fgMade,
        fgAttempted: stat.fgAttempted,
        fg3Made: stat.fg3Made,
        fg3Attempted: stat.fg3Attempted,
        ftMade: stat.ftMade,
        ftAttempted: stat.ftAttempted,
        offRebounds: stat.offRebounds,
        defRebounds: stat.defRebounds,
      }
    }

    return NextResponse.json({
      stats: statsMap,
      statLogs: statLogs.map(log => ({
        id: log.id,
        playerId: log.playerId,
        teamId: log.teamId,
        statType: log.statType,
        value: log.value,
        period: log.period,
        createdAt: log.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching game stats:', error)
    return NextResponse.json({ error: 'Failed to fetch game stats' }, { status: 500 })
  }
}
