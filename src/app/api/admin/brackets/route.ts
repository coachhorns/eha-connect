import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')

    const where: any = {}
    if (eventId) {
      where.eventId = eventId
    }

    const brackets = await prisma.bracket.findMany({
      where,
      include: {
        event: {
          select: { id: true, name: true },
        },
        games: {
          select: {
            id: true,
            status: true,
            homeScore: true,
            awayScore: true,
          },
        },
        _count: {
          select: {
            games: true,
            slots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Enhance with computed stats
    const bracketsWithStats = brackets.map(bracket => {
      const completedGames = bracket.games.filter(g => g.status === 'FINAL').length
      const totalGames = bracket.games.length
      const settings = bracket.settings as any

      return {
        ...bracket,
        teamCount: settings?.teamCount || 0,
        completedGames,
        totalGames,
        progress: totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0,
      }
    })

    // Also fetch events for the filter dropdown
    const events = await prisma.event.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json({ brackets: bracketsWithStats, events })
  } catch (error) {
    console.error('Error fetching brackets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brackets' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Bracket ID is required' }, { status: 400 })
    }

    // Delete bracket (cascade will handle slots and unlink games)
    // First, delete associated games
    await prisma.game.deleteMany({
      where: { bracketId: id },
    })

    // Then delete the bracket (which cascades to slots)
    await prisma.bracket.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bracket:', error)
    return NextResponse.json(
      { error: 'Failed to delete bracket' },
      { status: 500 }
    )
  }
}
