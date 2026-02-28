import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cascadeSoftDeleteProgramTeams } from '@/lib/cascade-delete'

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

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        teams: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            division: true,
            coachName: true,
            wins: true,
            losses: true,
            _count: {
              select: {
                roster: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            teams: true,
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    return NextResponse.json({ program })
  } catch (error) {
    console.error('Error fetching program:', error)
    return NextResponse.json(
      { error: 'Failed to fetch program' },
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

    const { name, directorName, directorEmail, directorPhone, logo, city, state } = body

    const program = await prisma.program.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(directorName !== undefined && { directorName }),
        ...(directorEmail !== undefined && { directorEmail }),
        ...(directorPhone !== undefined && { directorPhone }),
        ...(logo !== undefined && { logo }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
      },
    })

    return NextResponse.json({ program })
  } catch (error) {
    console.error('Error updating program:', error)
    return NextResponse.json(
      { error: 'Failed to update program' },
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

    // Check if program has teams
    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teams: true,
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Cascade: soft-delete teams and their unclaimed players
    const cascade = await cascadeSoftDeleteProgramTeams(id)

    if (program._count.teams > 0) {
      // Soft delete the program
      await prisma.program.update({
        where: { id },
        data: { isActive: false },
      })
    } else {
      // Hard delete if no teams
      await prisma.program.delete({
        where: { id },
      })
    }

    return NextResponse.json({
      success: true,
      cascade: {
        teamsDeactivated: cascade.teamsDeactivated,
        playersDeactivated: cascade.totalPlayersDeactivated,
      },
    })
  } catch (error) {
    console.error('Error deleting program:', error)
    return NextResponse.json(
      { error: 'Failed to delete program' },
      { status: 500 }
    )
  }
}
