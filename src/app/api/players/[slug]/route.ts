import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const player = await prisma.player.findFirst({
      where: { slug, isActive: true },
      include: {
        guardians: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, role: true },
            },
          },
        },
        achievements: {
          orderBy: { earnedAt: 'desc' },
        },
        media: {
          where: { isPublic: true },
          orderBy: { uploadedAt: 'desc' },
        },
        teamRosters: {
          include: {
            team: true,
          },
          orderBy: { joinedAt: 'desc' },
        },
        gameStats: {
          include: {
            game: {
              include: {
                event: {
                  select: { name: true, slug: true },
                },
                homeTeam: {
                  select: { name: true, slug: true },
                },
                awayTeam: {
                  select: { name: true, slug: true },
                },
              },
            },
          },
          orderBy: {
            game: {
              scheduledAt: 'desc',
            },
          },
          take: 20,
        },
      },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Calculate career stats
    const careerStats = await prisma.gameStats.aggregate({
      where: { playerId: player.id },
      _sum: {
        points: true,
        rebounds: true,
        assists: true,
        steals: true,
        blocks: true,
        fg3Made: true,
        fg3Attempted: true,
        fgMade: true,
        fgAttempted: true,
        ftMade: true,
        ftAttempted: true,
        turnovers: true,
        fouls: true,
        offRebounds: true,
        defRebounds: true,
      },
      _count: true,
    })

    const gamesPlayed = careerStats._count || 0

    const stats = gamesPlayed > 0 ? {
      gamesPlayed,
      totals: {
        points: careerStats._sum.points || 0,
        rebounds: careerStats._sum.rebounds || 0,
        assists: careerStats._sum.assists || 0,
        steals: careerStats._sum.steals || 0,
        blocks: careerStats._sum.blocks || 0,
        fg3Made: careerStats._sum.fg3Made || 0,
        turnovers: careerStats._sum.turnovers || 0,
      },
      averages: {
        ppg: (careerStats._sum.points || 0) / gamesPlayed,
        rpg: (careerStats._sum.rebounds || 0) / gamesPlayed,
        apg: (careerStats._sum.assists || 0) / gamesPlayed,
        spg: (careerStats._sum.steals || 0) / gamesPlayed,
        bpg: (careerStats._sum.blocks || 0) / gamesPlayed,
        topg: (careerStats._sum.turnovers || 0) / gamesPlayed,
      },
      shooting: {
        fgPct: careerStats._sum.fgAttempted
          ? ((careerStats._sum.fgMade || 0) / careerStats._sum.fgAttempted) * 100
          : 0,
        fg3Pct: careerStats._sum.fg3Attempted
          ? ((careerStats._sum.fg3Made || 0) / careerStats._sum.fg3Attempted) * 100
          : 0,
        ftPct: careerStats._sum.ftAttempted
          ? ((careerStats._sum.ftMade || 0) / careerStats._sum.ftAttempted) * 100
          : 0,
      },
    } : null

    return NextResponse.json({
      player,
      careerStats: stats,
    })
  } catch (error) {
    console.error('Error fetching player:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    )
  }
}
