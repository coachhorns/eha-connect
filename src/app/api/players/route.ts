import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const position = searchParams.get('position') || ''
    const state = searchParams.get('state') || ''
    const gradYear = searchParams.get('gradYear') || ''
    const division = searchParams.get('division') || ''
    const program = searchParams.get('program') || ''
    const sort = searchParams.get('sort') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Allow admins to view inactive players
    const includeInactive = searchParams.get('status') === 'inactive'
    const session = includeInactive ? await getServerSession(authOptions) : null
    const showInactive = includeInactive && session?.user?.role === 'ADMIN'

    const where: any = {
      isActive: showInactive ? false : true,
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { school: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (position) {
      where.primaryPosition = position
    }

    if (state) {
      where.state = state
    }

    if (gradYear) {
      where.graduationYear = parseInt(gradYear)
    }

    const [allPlayersRaw, totalRaw] = await Promise.all([
      prisma.player.findMany({
        where,
        include: {
          achievements: {
            take: 3,
            orderBy: { earnedAt: 'desc' },
          },
          guardians: {
            select: { id: true },
          },
          teamRosters: {
            where: { leftAt: null },
            include: {
              team: {
                select: {
                  name: true,
                  slug: true,
                  division: true,
                  program: {
                    select: { name: true },
                  },
                },
              },
            },
          },
          _count: {
            select: { gameStats: true },
          },
        },
      }),
      prisma.player.count({ where }),
    ])

    // Filter by division if specified
    let allPlayers = allPlayersRaw
    if (division) {
      allPlayers = allPlayers.filter((player: any) =>
        player.teamRosters?.some((roster: any) => roster.team?.division === division)
      )
    }

    // Filter by program name if specified
    if (program) {
      const programLower = program.toLowerCase()
      allPlayers = allPlayers.filter((player: any) =>
        player.teamRosters?.some((roster: any) =>
          roster.team?.program?.name?.toLowerCase().includes(programLower)
        )
      )
    }

    // Update total count after filtering
    const total = allPlayers.length

    // Helper to check if player is on an EPL team
    const isOnEPLTeam = (player: any): boolean => {
      return player.teamRosters?.some((roster: any) =>
        roster.team?.division === 'EPL' || roster.team?.division === 'EHA Premier League'
      ) || false
    }

    // Helper to get the best age from division (EPL team first, then highest age)
    const getPlayerAgeGroup = (player: any): number => {
      if (!player.teamRosters || player.teamRosters.length === 0) return 0

      // First, try to get age from EPL team
      const eplRoster = player.teamRosters.find((roster: any) => {
        const div = roster.team?.division?.toLowerCase() || ''
        return div.startsWith('epl') || div.startsWith('eha premier')
      })
      if (eplRoster?.team?.division) {
        const match = eplRoster.team.division.match(/(\d+)/)
        if (match) return parseInt(match[1], 10)
      }

      // Otherwise, get highest age from any team's division
      let maxAge = 0
      for (const roster of player.teamRosters) {
        if (roster.team?.division) {
          const match = roster.team.division.match(/(\d+)/)
          if (match) {
            const age = parseInt(match[1], 10)
            if (age > maxAge) maxAge = age
          }
        }
      }
      return maxAge
    }

    // Helper to check if player is verified/connected
    const isVerified = (player: any): boolean => {
      return player.isVerified || (player.guardians && player.guardians.length > 0) || !!player.userId
    }

    // Sort players based on sort parameter
    const sortedPlayers = allPlayers.sort((a: any, b: any) => {
      switch (sort) {
        case 'name':
          // Sort by last name alphabetically
          return (a.lastName || '').localeCompare(b.lastName || '')

        case 'gradYear':
        case 'class':
          // Sort by graduation year (ascending - earlier years first)
          const gradA = a.graduationYear || 9999
          const gradB = b.graduationYear || 9999
          if (gradA !== gradB) return gradA - gradB
          return (a.lastName || '').localeCompare(b.lastName || '')

        case 'recent':
          // Sort by most recently created
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()

        default:
          // Default priority: Verified first, then EPL, then by age (17U first), then by last name
          const aIsVerified = isVerified(a)
          const bIsVerified = isVerified(b)
          if (aIsVerified && !bIsVerified) return -1
          if (!aIsVerified && bIsVerified) return 1

          const aIsEPL = isOnEPLTeam(a)
          const bIsEPL = isOnEPLTeam(b)
          if (aIsEPL && !bIsEPL) return -1
          if (!aIsEPL && bIsEPL) return 1

          const ageA = getPlayerAgeGroup(a)
          const ageB = getPlayerAgeGroup(b)
          if (ageA !== ageB) return ageB - ageA

          return (a.lastName || '').localeCompare(b.lastName || '')
      }
    })

    // Apply pagination to sorted results
    const players = sortedPlayers.slice(skip, skip + limit)

    // Calculate career stats for each player
    const playersWithStats = await Promise.all(
      players.map(async (player: any) => {
        const stats = await prisma.gameStats.aggregate({
          where: { playerId: player.id },
          _sum: {
            points: true,
            rebounds: true,
            assists: true,
            steals: true,
            blocks: true,
            fg3Made: true,
          },
          _count: true,
        })

        const gamesPlayed = stats._count || 0
        const careerStats = gamesPlayed > 0 ? {
          gamesPlayed,
          ppg: (stats._sum.points || 0) / gamesPlayed,
          rpg: (stats._sum.rebounds || 0) / gamesPlayed,
          apg: (stats._sum.assists || 0) / gamesPlayed,
          spg: (stats._sum.steals || 0) / gamesPlayed,
          bpg: (stats._sum.blocks || 0) / gamesPlayed,
          threePM: stats._sum.fg3Made || 0,
        } : null

        return {
          ...player,
          careerStats,
        }
      })
    )

    return NextResponse.json({
      players: playersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}

// Helper to generate slug
function generateSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const random = Math.random().toString(36).substring(2, 6)
  return `${base}-${random}`
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SCOREKEEPER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { firstName, lastName, teamId, jerseyNumber, primaryPosition } = await request.json()

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    // Create player with optional roster entry in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the player
      const player = await tx.player.create({
        data: {
          firstName,
          lastName,
          slug: generateSlug(firstName, lastName),
          jerseyNumber: jerseyNumber || null,
          primaryPosition: primaryPosition || null,
          isActive: true,
          isVerified: false,
        },
      })

      // If teamId is provided, add to team roster
      if (teamId) {
        await tx.teamRoster.create({
          data: {
            teamId,
            playerId: player.id,
            jerseyNumber: jerseyNumber || null,
          },
        })
      }

      return player
    })

    return NextResponse.json({ player: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    )
  }
}
