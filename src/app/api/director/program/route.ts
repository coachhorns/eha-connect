import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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
            ageGroup: true,
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
