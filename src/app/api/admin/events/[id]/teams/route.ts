import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params

    // Get teams registered for this event
    const eventTeams = await prisma.eventTeam.findMany({
      where: { eventId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            ageGroup: true,
            division: true,
            program: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { team: { name: 'asc' } },
    })

    const teams = eventTeams.map(et => ({
      ...et.team,
      seed: et.seed,
      pool: et.pool,
    }))

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Error fetching event teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}
