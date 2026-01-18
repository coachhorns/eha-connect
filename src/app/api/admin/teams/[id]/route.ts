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

    const { id } = await params

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
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
        eventTeams: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
          orderBy: { registeredAt: 'desc' },
          take: 5,
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

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { name, organization, coachName, coachEmail, coachPhone, ageGroup, division, city, state } = body

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(organization !== undefined && { organization }),
        ...(coachName !== undefined && { coachName }),
        ...(coachEmail !== undefined && { coachEmail }),
        ...(coachPhone !== undefined && { coachPhone }),
        ...(ageGroup !== undefined && { ageGroup }),
        ...(division !== undefined && { division }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if team has games
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
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

    const totalGames = team._count.homeGames + team._count.awayGames

    if (totalGames > 0) {
      // Soft delete - just mark as inactive
      await prisma.team.update({
        where: { id },
        data: { isActive: false },
      })
    } else {
      // Hard delete if no games
      await prisma.team.delete({
        where: { id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    )
  }
}
