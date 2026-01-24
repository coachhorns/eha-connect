import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, directorName, directorEmail, directorPhone, logo, city, state } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Program name is required' }, { status: 400 })
    }

    // Generate a unique slug
    let baseSlug = generateSlug(name.trim())
    let slug = baseSlug
    let counter = 1

    while (await prisma.program.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const program = await prisma.program.create({
      data: {
        name: name.trim(),
        slug,
        directorName: directorName?.trim() || null,
        directorEmail: directorEmail?.trim() || null,
        directorPhone: directorPhone?.trim() || null,
        logo: logo?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
      },
    })

    return NextResponse.json({ program }, { status: 201 })
  } catch (error) {
    console.error('Error creating program:', error)
    return NextResponse.json(
      { error: 'Failed to create program' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [programsRaw, total] = await Promise.all([
      prisma.program.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          directorName: true,
          directorEmail: true,
          city: true,
          state: true,
          logo: true,
          _count: {
            select: {
              teams: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.program.count({ where }),
    ])

    // Flatten the _count for easier frontend use
    const programs = programsRaw.map(program => ({
      ...program,
      teamsCount: program._count.teams,
      _count: undefined,
    }))

    return NextResponse.json({
      programs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching programs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch programs' },
      { status: 500 }
    )
  }
}
