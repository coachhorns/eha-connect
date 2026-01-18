import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const position = searchParams.get('position') || ''
    const state = searchParams.get('state') || ''
    const gradYear = searchParams.get('gradYear') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { school: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (position) {
      where.primaryPosition = position
    }

    if (state) {
      where.state = state
    }

    if (gradYear) {
      where.graduationYear = parseInt(gradYear)
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        include: {
          achievements: {
            take: 3,
            orderBy: { earnedAt: 'desc' },
          },
          teamRosters: {
            where: { leftAt: null },
            include: {
              team: {
                select: { name: true, slug: true },
              },
            },
          },
          _count: {
            select: { gameStats: true },
          },
        },
      }),
      prisma.player.count({ where }),
    ])

    // Calculate career stats for each player
    const playersWithStats = await Promise.all(
      players.map(async (player: any) => {
        const stats = await prisma.gameStats.aggregate({
          where: { playerId: player.id },
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

        const gamesPlayed = stats._count || 0
        const careerStats = gamesPlayed > 0 ? {
          gamesPlayed,
          ppg: (stats._sum.points || 0) / gamesPlayed,
          rpg: (stats._sum.rebounds || 0) / gamesPlayed,
          apg: (stats._sum.assists || 0) / gamesPlayed,
          spg: (stats._sum.steals || 0) / gamesPlayed,
          bpg: (stats._sum.blocks || 0) / gamesPlayed,
          threePM: stats._sum.fg3Made || 0,
        } : null

        return {
          ...player,
          careerStats,
        }
      })
    )

    return NextResponse.json({
      players: playersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
