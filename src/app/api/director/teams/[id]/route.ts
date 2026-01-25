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

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            logo: true,
          },
        },
        roster: {
          where: { leftAt: null },
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true,
                jerseyNumber: true,
                primaryPosition: true,
                heightFeet: true,
                heightInches: true,
                school: true,
                graduationYear: true,
                profilePhoto: true,
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
        _count: {
          select: {
            homeGames: true,
            awayGames: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Ownership check - verify the team belongs to a program owned by this director
    if (!team.program || team.program.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // First verify ownership
    const existingTeam = await prisma.team.findUnique({
      where: { id },
      include: {
        program: {
          select: { ownerId: true },
        },
      },
    })

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!existingTeam.program || existingTeam.program.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, coachName, coachEmail, coachPhone, ageGroup, division } = body

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(coachName !== undefined && { coachName }),
        ...(coachEmail !== undefined && { coachEmail }),
        ...(coachPhone !== undefined && { coachPhone }),
        ...(ageGroup !== undefined && { ageGroup }),
        ...(division !== undefined && { division }),
      },
    })

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    )
  }
}
