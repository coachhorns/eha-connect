import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const playerInclude = {
  teamRosters: {
    where: { leftAt: null },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          ageGroup: true,
          program: { select: { name: true } },
        },
      },
    },
  },
  guardians: {
    select: { id: true },
    take: 1,
  },
}

function mapPlayer(player: any, teamId?: string) {
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    profilePhoto: player.profilePhoto || null,
    school: player.school || null,
    graduationYear: player.graduationYear || null,
    primaryPosition: player.primaryPosition || null,
    heightFeet: player.heightFeet || null,
    heightInches: player.heightInches || null,
    currentTeams: player.teamRosters.map((r: any) => ({
      teamName: r.team.name,
      programName: r.team.program?.name || null,
      ageGroup: r.team.ageGroup || null,
    })),
    isOnTargetRoster: teamId
      ? player.teamRosters.some((r: any) => r.team.id === teamId)
      : false,
    hasGuardian: player.guardians.length > 0,
  }
}

// GET: Typeahead search for manual add
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const teamId = searchParams.get('teamId') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

    if (!q || q.length < 2) {
      return NextResponse.json({ players: [] })
    }

    const tokens = q.split(/\s+/)

    let where: any = { isActive: true }

    if (tokens.length === 1) {
      where.OR = [
        { firstName: { contains: tokens[0], mode: 'insensitive' } },
        { lastName: { contains: tokens[0], mode: 'insensitive' } },
      ]
    } else {
      const lastNameToken = tokens[tokens.length - 1]
      const firstNameTokens = tokens.slice(0, -1).join(' ')
      where.AND = [
        { firstName: { contains: firstNameTokens, mode: 'insensitive' } },
        { lastName: { contains: lastNameToken, mode: 'insensitive' } },
      ]
    }

    const players = await prisma.player.findMany({
      where,
      include: playerInclude,
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return NextResponse.json({
      players: players.map((p) => mapPlayer(p, teamId)),
    })
  } catch (error) {
    console.error('Error searching players:', error)
    return NextResponse.json(
      { error: 'Failed to search players' },
      { status: 500 }
    )
  }
}

// POST: Batch search for smart upload dedup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { players, teamId } = body as {
      players: Array<{ firstName: string; lastName: string }>
      teamId: string
    }

    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    // Build OR conditions for all name pairs (exact match)
    const nameConditions = players
      .filter((p) => p.firstName && p.lastName)
      .map((p) => ({
        AND: [
          { firstName: { equals: p.firstName.trim(), mode: 'insensitive' as const } },
          { lastName: { equals: p.lastName.trim(), mode: 'insensitive' as const } },
        ],
      }))

    if (nameConditions.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    const matchedPlayers = await prisma.player.findMany({
      where: {
        isActive: true,
        OR: nameConditions,
      },
      include: playerInclude,
    })

    // Group results by which input index they match
    const matches: Array<{ index: number; players: any[] }> = []

    players.forEach((input, index) => {
      if (!input.firstName || !input.lastName) return

      const inputFirst = input.firstName.trim().toLowerCase()
      const inputLast = input.lastName.trim().toLowerCase()

      const matched = matchedPlayers.filter(
        (p) =>
          p.firstName.toLowerCase() === inputFirst &&
          p.lastName.toLowerCase() === inputLast
      )

      if (matched.length > 0) {
        matches.push({
          index,
          players: matched.map((p) => mapPlayer(p, teamId)),
        })
      }
    })

    return NextResponse.json({ matches })
  } catch (error) {
    console.error('Error batch searching players:', error)
    return NextResponse.json(
      { error: 'Failed to search players' },
      { status: 500 }
    )
  }
}
