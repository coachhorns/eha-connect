import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const ageGroup = searchParams.get('ageGroup')
    const date = searchParams.get('date')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause: Prisma.GameWhereInput = {
      status: { in: ['FINAL', 'IN_PROGRESS', 'HALFTIME'] },
    }

    if (eventId) {
      whereClause.eventId = eventId
    }

    if (ageGroup) {
      whereClause.ageGroup = ageGroup
    }

    if (date) {
      // Filter by specific date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      whereClause.scheduledAt = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: whereClause,
        include: {
          homeTeam: {
            select: {
              id: true,
              slug: true,
              name: true,
              logo: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              slug: true,
              name: true,
              logo: true,
            },
          },
          event: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.game.count({ where: whereClause }),
    ])

    // Get available filters
    const [events, ageGroups, gameDates] = await Promise.all([
      prisma.event.findMany({
        where: { isPublished: true },
        select: { id: true, name: true, slug: true },
        orderBy: { startDate: 'desc' },
        take: 20,
      }),
      prisma.game.findMany({
        where: { status: { in: ['FINAL', 'IN_PROGRESS', 'HALFTIME'] }, ageGroup: { not: null } },
        select: { ageGroup: true },
        distinct: ['ageGroup'],
      }),
      prisma.game.findMany({
        where: { status: { in: ['FINAL', 'IN_PROGRESS', 'HALFTIME'] } },
        select: { scheduledAt: true },
        orderBy: { scheduledAt: 'desc' },
        distinct: ['scheduledAt'],
        take: 30,
      }),
    ])

    // Get unique dates for filter
    const uniqueDates = [...new Set(
      gameDates.map(g => {
        const d = new Date(g.scheduledAt)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })
    )]

    return NextResponse.json({
      games,
      total,
      filters: {
        events,
        ageGroups: ageGroups.map(a => a.ageGroup).filter(Boolean),
        dates: uniqueDates,
      },
    })
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}
