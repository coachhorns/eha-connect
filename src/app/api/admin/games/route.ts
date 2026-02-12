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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const eventId = searchParams.get('eventId') || ''

    const skip = (page - 1) * limit

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (eventId) {
      where.eventId = eventId
    }

    if (search) {
      where.OR = [
        { homeTeam: { name: { contains: search, mode: 'insensitive' } } },
        { awayTeam: { name: { contains: search, mode: 'insensitive' } } },
        { event: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        include: {
          homeTeam: {
            select: { id: true, name: true },
          },
          awayTeam: {
            select: { id: true, name: true },
          },
          event: {
            select: { id: true, name: true },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.game.count({ where }),
    ])

    return NextResponse.json({
      games,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      eventId,
      homeTeamId,
      awayTeamId,
      scheduledAt,
      court,
      gameType,
      division,
    } = body

    if (!homeTeamId || !awayTeamId || !scheduledAt) {
      return NextResponse.json(
        { error: 'Home team, away team, and scheduled time are required' },
        { status: 400 }
      )
    }

    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: 'Home team and away team must be different' },
        { status: 400 }
      )
    }

    const game = await prisma.game.create({
      data: {
        eventId: eventId || null,
        homeTeamId,
        awayTeamId,
        scheduledAt: new Date(scheduledAt),
        court: court || null,
        gameType: gameType || 'POOL',
        division: division || null,
        status: 'SCHEDULED',
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        event: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ game }, { status: 201 })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
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

    await prisma.game.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting game:', error)
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    )
  }
}
