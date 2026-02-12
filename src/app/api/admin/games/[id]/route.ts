import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            slug: true,
            coachName: true,
            division: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            slug: true,
            coachName: true,
            division: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            venue: true,
            city: true,
            state: true,
          },
        },
        stats: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                jerseyNumber: true,
              },
            },
          },
          orderBy: { points: 'desc' },
        },
        statLog: {
          where: { isUndone: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    return NextResponse.json({ game })
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { scheduledAt, court, status, homeScore, awayScore, currentPeriod } = body

    const game = await prisma.game.update({
      where: { id },
      data: {
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(court !== undefined && { court }),
        ...(status && { status }),
        ...(homeScore !== undefined && { homeScore }),
        ...(awayScore !== undefined && { awayScore }),
        ...(currentPeriod !== undefined && { currentPeriod }),
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ game })
  } catch (error) {
    console.error('Error updating game:', error)
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Delete the game (cascades to stats and logs)
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
