import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getStartOfDayPacific, getEndOfDayPacific } from '@/lib/timezone'

export async function GET(request: Request) {
  try {
    // Public endpoint for Scorekeeper Hub (PIN protected on client side)
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const status = searchParams.get('status')

    // Get date range in Pacific timezone
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const dateStr = dateParam || todayStr

    const where: any = {
      scheduledAt: {
        gte: getStartOfDayPacific(dateStr),
        lte: getEndOfDayPacific(dateStr),
      },
    }

    if (status) {
      where.status = status
    }

    const games = await prisma.game.findMany({
      where,
      include: {
        homeTeam: {
          select: { id: true, name: true, logo: true },
        },
        awayTeam: {
          select: { id: true, name: true, logo: true },
        },
        event: {
          select: { name: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}
