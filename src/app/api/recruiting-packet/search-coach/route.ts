import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const firstName = searchParams.get('firstName')?.trim() || ''
    const lastName = searchParams.get('lastName')?.trim() || ''
    const school = searchParams.get('school')?.trim() || ''

    if (firstName.length < 2 && lastName.length < 2 && school.length < 2) {
      return NextResponse.json({ coaches: [] })
    }

    const where: any = { AND: [] }

    if (firstName.length >= 2) {
      where.AND.push({ firstName: { contains: firstName, mode: 'insensitive' } })
    }
    if (lastName.length >= 2) {
      where.AND.push({ lastName: { contains: lastName, mode: 'insensitive' } })
    }
    if (school.length >= 2) {
      where.AND.push({
        college: { name: { contains: school, mode: 'insensitive' } },
      })
    }

    if (where.AND.length === 0) {
      return NextResponse.json({ coaches: [] })
    }

    const coaches = await prisma.collegeCoach.findMany({
      where,
      include: {
        college: {
          select: {
            id: true,
            name: true,
            division: true,
            conference: true,
            state: true,
          },
        },
      },
      take: 5,
      orderBy: { lastName: 'asc' },
    })

    return NextResponse.json({
      coaches: coaches.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        email: c.email,
        college: c.college,
      })),
    })
  } catch (error) {
    console.error('Error searching coaches:', error)
    return NextResponse.json({ error: 'Failed to search coaches' }, { status: 500 })
  }
}
