import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'
import { generateSlug } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const players = await prisma.player.findMany({
      where: {
        OR: [
          { userId: user.id },
          { guardians: { some: { userId: user.id } } },
        ],
        isActive: true,
      },
      include: {
        _count: {
          select: {
            gameStats: true,
            achievements: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          }
        },
        guardians: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ players })
  } catch (error) {
    console.error('Error fetching user players:', error)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const postUser = await getSessionUser(request)

    if (!postUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, dateOfBirth, graduationYear } = body

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Generate a unique slug
    let baseSlug = generateSlug(firstName, lastName)
    let slug = baseSlug
    let counter = 1

    // Check for existing slugs and make unique if necessary
    while (await prisma.player.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const player = await prisma.player.create({
      data: {
        userId: postUser.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        slug,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
        isActive: true,
      },
    })

    return NextResponse.json({ player }, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
  }
}
