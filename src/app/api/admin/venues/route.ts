import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const search = searchParams.get('search') || ''
        const withCourts = searchParams.get('withCourts') === 'true'

        const where: any = {}

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
            ]
        }

        const venues = await prisma.venue.findMany({
            where,
            include: {
                _count: {
                    select: { courts: true },
                },
                courts: withCourts,
            },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({ venues })
    } catch (error) {
        console.error('Error fetching venues:', error)
        return NextResponse.json(
            { error: 'Failed to fetch venues' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, address, city, state, zip, timezone, courts } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Venue name is required' },
                { status: 400 }
            )
        }

        // Create venue and optional courts in one transaction
        const venue = await prisma.venue.create({
            data: {
                name,
                address,
                city,
                state,
                zip,
                timezone: timezone || 'America/Chicago',
                courts: {
                    create: Array.isArray(courts) ? courts.map((c: any) => ({
                        name: c.name
                    })) : undefined
                }
            },
            include: {
                courts: true
            }
        })

        return NextResponse.json({ venue }, { status: 201 })
    } catch (error) {
        console.error('Error creating venue:', error)
        return NextResponse.json(
            { error: 'Failed to create venue' },
            { status: 500 }
        )
    }
}
