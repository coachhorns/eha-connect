import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Search for players to claim or fetch single player by ID
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const playerId = searchParams.get('playerId')
    const firstName = searchParams.get('firstName')
    const lastName = searchParams.get('lastName')

    // If playerId is provided, fetch that specific player
    if (playerId) {
      const player = await prisma.player.findUnique({
        where: { id: playerId, isActive: true },
        include: {
          teamRosters: {
            where: { leftAt: null },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
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
          },
          guardians: {
            where: { role: 'PRIMARY' },
            select: { id: true },
          },
        },
      })

      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 })
      }

      const activeRoster = player.teamRosters[0]
      const result = {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        slug: player.slug,
        profilePhoto: player.profilePhoto,
        graduationYear: player.graduationYear,
        primaryPosition: player.primaryPosition,
        currentTeam: activeRoster?.team
          ? {
              id: activeRoster.team.id,
              name: activeRoster.team.name,
              slug: activeRoster.team.slug,
              ageGroup: activeRoster.team.ageGroup,
              division: activeRoster.team.division,
              program: activeRoster.team.program,
            }
          : null,
        hasPrimaryGuardian: player.guardians.length > 0,
      }

      return NextResponse.json({ player: result })
    }

    // Otherwise, search by name
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = {
      firstName: { equals: firstName, mode: 'insensitive' },
      lastName: { equals: lastName, mode: 'insensitive' },
      isActive: true,
    }

    // Find matching players with team and program info
    const players = await prisma.player.findMany({
      where,
      include: {
        teamRosters: {
          where: { leftAt: null },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
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
        },
        guardians: {
          where: { role: 'PRIMARY' },
          select: { id: true },
        },
      },
      take: 20,
    })

    // Map players with claim status and all team info
    const results = players.map((player) => {
      const activeRoster = player.teamRosters[0]
      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        slug: player.slug,
        profilePhoto: player.profilePhoto,
        graduationYear: player.graduationYear,
        primaryPosition: player.primaryPosition,
        currentTeam: activeRoster?.team
          ? {
              id: activeRoster.team.id,
              name: activeRoster.team.name,
              slug: activeRoster.team.slug,
              ageGroup: activeRoster.team.ageGroup,
              division: activeRoster.team.division,
              program: activeRoster.team.program,
            }
          : null,
        hasPrimaryGuardian: player.guardians.length > 0,
      }
    })

    return NextResponse.json({ players: results })
  } catch (error) {
    console.error('Error searching players:', error)
    return NextResponse.json(
      { error: 'Failed to search players' },
      { status: 500 }
    )
  }
}

// POST - Claim a player
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playerId } = body

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Check if user already has a guardian relationship with this player
    const existingGuardian = await prisma.guardian.findUnique({
      where: {
        userId_playerId: {
          userId: session.user.id,
          playerId,
        },
      },
    })

    if (existingGuardian) {
      return NextResponse.json(
        { error: 'You are already a guardian of this player' },
        { status: 400 }
      )
    }

    // Check if player exists and has a primary guardian
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        guardians: {
          where: { role: 'PRIMARY' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // If player has a primary guardian, return that it needs approval
    if (player.guardians.length > 0) {
      return NextResponse.json({
        needsApproval: true,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        message: 'This player already has a primary guardian. You can request access as a co-parent.',
      })
    }

    // No primary guardian - create as PRIMARY
    const guardian = await prisma.guardian.create({
      data: {
        userId: session.user.id,
        playerId,
        role: 'PRIMARY',
        isPayer: true, // First guardian is the payer by default
      },
    })

    return NextResponse.json({
      success: true,
      guardian,
      message: `You are now the primary guardian of ${player.firstName} ${player.lastName}`,
    })
  } catch (error) {
    console.error('Error claiming player:', error)
    return NextResponse.json(
      { error: 'Failed to claim player' },
      { status: 500 }
    )
  }
}
