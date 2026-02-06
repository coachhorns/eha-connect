import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// GET all events (admin view - includes unpublished)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || '' // upcoming, past, all
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (type) {
      where.type = type
    }

    if (status === 'upcoming') {
      where.startDate = { gte: new Date() }
    } else if (status === 'past') {
      where.endDate = { lt: new Date() }
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: { teams: true, games: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ])

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

// POST create new event
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      type,
      description,
      venue,
      address,
      city,
      state,
      startDate,
      endDate,
      registrationDeadline,
      ageGroups,
      divisions,
      entryFee,
      bannerImage,
      flyerImage,
      isPublished,
    } = body

    // Validate required fields
    if (!name || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, type, start date, and end date are required' },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = generateSlug(name)
    let slugExists = await prisma.event.findUnique({ where: { slug } })
    let counter = 1
    while (slugExists) {
      slug = `${generateSlug(name)}-${counter}`
      slugExists = await prisma.event.findUnique({ where: { slug } })
      counter++
    }

    const event = await prisma.event.create({
      data: {
        name,
        slug,
        type,
        description: description || null,
        venue: venue || null,
        address: address || null,
        city: city || null,
        state: state || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        ageGroups: ageGroups || [],
        divisions: divisions || [],
        entryFee: entryFee ? parseFloat(entryFee) : null,
        bannerImage: bannerImage || null,
        flyerImage: flyerImage || null,
        isPublished: isPublished ?? false,
        isActive: true,
      },
      include: {
        _count: {
          select: { teams: true, games: true },
        },
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
