import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        homeTeam: {
          select: {
            id: true,
            slug: true,
            name: true,
            logo: true,
            program: {
              select: { logo: true },
            },
          },
        },
        awayTeam: {
          select: {
            id: true,
            slug: true,
            name: true,
            logo: true,
            program: {
              select: { logo: true },
            },
          },
        },
        event: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        stats: {
          include: {
            player: {
              select: {
                id: true,
                slug: true,
                firstName: true,
                lastName: true,
                jerseyNumber: true,
                profilePhoto: true,
              },
            },
          },
          orderBy: { points: 'desc' },
        },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Group stats by team
    const homeStats = game.stats.filter(s => s.teamId === game.homeTeamId)
    const awayStats = game.stats.filter(s => s.teamId === game.awayTeamId)

    // Calculate team totals
    const calculateTeamTotals = (stats: typeof game.stats) => ({
      points: stats.reduce((sum, s) => sum + s.points, 0),
      rebounds: stats.reduce((sum, s) => sum + s.rebounds, 0),
      assists: stats.reduce((sum, s) => sum + s.assists, 0),
      steals: stats.reduce((sum, s) => sum + s.steals, 0),
      blocks: stats.reduce((sum, s) => sum + s.blocks, 0),
      turnovers: stats.reduce((sum, s) => sum + s.turnovers, 0),
      fouls: stats.reduce((sum, s) => sum + s.fouls, 0),
      fgMade: stats.reduce((sum, s) => sum + s.fgMade, 0),
      fgAttempted: stats.reduce((sum, s) => sum + s.fgAttempted, 0),
      fg3Made: stats.reduce((sum, s) => sum + s.fg3Made, 0),
      fg3Attempted: stats.reduce((sum, s) => sum + s.fg3Attempted, 0),
      ftMade: stats.reduce((sum, s) => sum + s.ftMade, 0),
      ftAttempted: stats.reduce((sum, s) => sum + s.ftAttempted, 0),
    })

    return NextResponse.json({
      game: {
        ...game,
        homeStats,
        awayStats,
        homeTotals: calculateTeamTotals(homeStats),
        awayTotals: calculateTeamTotals(awayStats),
      },
    })
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}
