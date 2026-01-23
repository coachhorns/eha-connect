import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Public endpoint for Scorekeeper Hub (PIN protected on client side)
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const status = searchParams.get('status')

    // Get date range
    let startDate: Date
    let endDate: Date

    if (dateParam) {
      startDate = new Date(dateParam)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
    } else {
      startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
    }

    const where: any = {
      scheduledAt: {
        gte: startDate,
        lt: endDate,
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
