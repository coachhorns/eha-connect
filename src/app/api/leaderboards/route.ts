import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stat = searchParams.get('stat') || 'points'
    const eventId = searchParams.get('eventId')
    const division = searchParams.get('division')
    const limit = parseInt(searchParams.get('limit') || '25')

    // Build the where clause for games
    const gameWhere: any = {
      isOfficial: true,
    }

    if (eventId) {
      gameWhere.eventId = eventId
    }

    if (division) {
      gameWhere.division = division
    }

    // Get all game IDs that match the filter
    const games = await prisma.game.findMany({
      where: gameWhere,
      select: { id: true },
    })

    const gameIds = games.map((g: { id: string }) => g.id)

    // Aggregate stats by player
    const aggregateField = stat === 'fg3Made' ? 'fg3Made' : stat

    // Get player stats grouped by player
    const playerStats = await prisma.gameStats.groupBy({
      by: ['playerId'],
      where: {
        gameId: { in: gameIds.length > 0 ? gameIds : undefined },
      },
      _sum: {
        points: true,
        rebounds: true,
        assists: true,
        steals: true,
        blocks: true,
        fg3Made: true,
      },
      _count: true,
    })

    // Get player details and calculate averages
    const leaderboard = await Promise.all(
      playerStats.map(async (ps: any) => {
        const player = await prisma.player.findFirst({
          where: { id: ps.playerId, isActive: true },
          select: {
            id: true,
            slug: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            primaryPosition: true,
            school: true,
            graduationYear: true,
            teamRosters: {
              where: { leftAt: null },
              include: {
                team: { select: { name: true, logo: true, slug: true, program: { select: { logo: true } } } },
              },
              take: 1,
            },
          },
        })

        if (!player) return null

        const gamesPlayed = ps._count
        const totals = ps._sum

        return {
          player: {
            ...player,
            currentTeam: player.teamRosters[0]?.team || null,
          },
          gamesPlayed,
          totals: {
            points: totals.points || 0,
            rebounds: totals.rebounds || 0,
            assists: totals.assists || 0,
            steals: totals.steals || 0,
            blocks: totals.blocks || 0,
            fg3Made: totals.fg3Made || 0,
          },
          averages: {
            ppg: gamesPlayed > 0 ? (totals.points || 0) / gamesPlayed : 0,
            rpg: gamesPlayed > 0 ? (totals.rebounds || 0) / gamesPlayed : 0,
            apg: gamesPlayed > 0 ? (totals.assists || 0) / gamesPlayed : 0,
            spg: gamesPlayed > 0 ? (totals.steals || 0) / gamesPlayed : 0,
            bpg: gamesPlayed > 0 ? (totals.blocks || 0) / gamesPlayed : 0,
            fg3pg: gamesPlayed > 0 ? (totals.fg3Made || 0) / gamesPlayed : 0,
          },
        }
      })
    )

    // Filter out nulls and sort by the selected stat
    const sortedLeaderboard = leaderboard
      .filter((item: any): item is NonNullable<typeof item> => item !== null)
      .sort((a: any, b: any) => {
        const statMap: Record<string, string> = {
          points: 'ppg',
          rebounds: 'rpg',
          assists: 'apg',
          steals: 'spg',
          blocks: 'bpg',
          fg3Made: 'fg3pg',
        }
        const avgKey = statMap[stat] || 'ppg'
        return (b.averages as any)[avgKey] - (a.averages as any)[avgKey]
      })
      .slice(0, limit)

    return NextResponse.json({ leaderboard: sortedLeaderboard })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
