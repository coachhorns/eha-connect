import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const player = await prisma.player.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          { guardians: { some: { userId: user.id } } },
        ],
      },
      include: {
        teamRosters: {
          where: { leftAt: null },
          select: { teamId: true },
        },
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    const teamIds = player.teamRosters.map(r => r.teamId)

    if (teamIds.length === 0) {
      return NextResponse.json({ games: [] })
    }

    const games = await prisma.game.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        status: 'SCHEDULED',
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
      },
      include: {
        homeTeam: { select: { id: true, name: true, slug: true } },
        awayTeam: { select: { id: true, name: true, slug: true } },
        event: { select: { id: true, name: true, slug: true } },
        assignedCourt: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    })

    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error fetching upcoming games:', error)
    return NextResponse.json({ error: 'Failed to fetch upcoming games' }, { status: 500 })
  }
}
