import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
      totalPlayers,
      totalTeams,
      totalEvents,
      totalGames,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.player.count({ where: { isActive: true } }),
      prisma.team.count({ where: { isActive: true } }),
      prisma.event.count({ where: { isActive: true } }),
      prisma.game.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ])

    // Get recent games
    const recentGames = await prisma.game.findMany({
      take: 5,
      orderBy: { scheduledAt: 'desc' },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        event: { select: { name: true } },
      },
    })

    return NextResponse.json({
      totalPlayers,
      totalTeams,
      totalEvents,
      totalGames,
      activeSubscriptions,
      recentGames,
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
