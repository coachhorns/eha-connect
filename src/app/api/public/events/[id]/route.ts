import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Try to find by ID or slug
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
        isPublished: true,
      },
      include: {
        teams: {
          include: {
            team: {
              select: {
                id: true,
                slug: true,
                name: true,
                city: true,
                state: true,
                logo: true,
                program: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { pool: 'asc' },
            { seed: 'asc' },
          ],
        },
        games: {
          include: {
            homeTeam: {
              select: { id: true, name: true, slug: true, logo: true },
            },
            awayTeam: {
              select: { id: true, name: true, slug: true, logo: true },
            },
          },
          orderBy: { scheduledAt: 'asc' },
        },
        _count: {
          select: { teams: true, games: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}
