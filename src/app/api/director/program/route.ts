import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const program = await prisma.program.findFirst({
      where: {
        ownerId: session.user.id,
      },
      include: {
        teams: {
          select: {
            id: true,
            slug: true,
            name: true,
            division: true,
            coachName: true,
            wins: true,
            losses: true,
            roster: {
              where: { leftAt: null },
              select: {
                jerseyNumber: true,
                player: {
                  select: {
                    firstName: true,
                    lastName: true,
                    jerseyNumber: true,
                  },
                },
              },
              orderBy: { player: { lastName: 'asc' } },
            },
            _count: {
              select: {
                roster: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ program: null }, { status: 200 })
    }

    // Calculate combined record
    const totalWins = program.teams.reduce((sum, team) => sum + team.wins, 0)
    const totalLosses = program.teams.reduce((sum, team) => sum + team.losses, 0)

    // Flatten team data
    const teams = program.teams.map(team => ({
      ...team,
      rosterCount: team._count.roster,
      roster: team.roster.map(r => ({
        jerseyNumber: r.jerseyNumber || r.player.jerseyNumber || null,
        firstName: r.player.firstName,
        lastName: r.player.lastName,
      })),
      _count: undefined,
    }))

    return NextResponse.json({
      program: {
        ...program,
        teams,
        totalWins,
        totalLosses,
      },
    })
  } catch (error) {
    console.error('Error fetching director program:', error)
    return NextResponse.json(
      { error: 'Failed to fetch program' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the director's program
    const existingProgram = await prisma.program.findFirst({
      where: {
        ownerId: session.user.id,
      },
    })

    if (!existingProgram) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, logo, city, state } = body

    // Update the program
    const program = await prisma.program.update({
      where: { id: existingProgram.id },
      data: {
        ...(name && { name }),
        ...(logo !== undefined && { logo }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
      },
    })

    return NextResponse.json({ program })
  } catch (error) {
    console.error('Error updating director program:', error)
    return NextResponse.json(
      { error: 'Failed to update program' },
      { status: 500 }
    )
  }
}
