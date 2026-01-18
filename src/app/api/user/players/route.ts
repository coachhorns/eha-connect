import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const players = await prisma.player.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            gameStats: true,
            achievements: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ players })
  } catch (error) {
    console.error('Error fetching user players:', error)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}
