import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Search for players to claim
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const firstName = searchParams.get('firstName')
    const lastName = searchParams.get('lastName')
    const dateOfBirth = searchParams.get('dateOfBirth')
    const teamId = searchParams.get('teamId')

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

    // Add date of birth filter if provided
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth)
      // Match within the same day
      const startOfDay = new Date(dob.setHours(0, 0, 0, 0))
      const endOfDay = new Date(dob.setHours(23, 59, 59, 999))
      where.dateOfBirth = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    // Add team filter if provided
    if (teamId) {
      where.teamRosters = {
        some: {
          teamId,
          leftAt: null, // Currently on the team
        },
      }
    }

    // Find matching players
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
              },
            },
          },
        },
        guardians: {
          where: { role: 'PRIMARY' },
          select: { id: true },
        },
      },
      take: 10,
    })

    // Map players with claim status
    const results = players.map((player) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      slug: player.slug,
      profilePhoto: player.profilePhoto,
      graduationYear: player.graduationYear,
      primaryPosition: player.primaryPosition,
      currentTeam: player.teamRosters[0]?.team || null,
      hasPrimaryGuardian: player.guardians.length > 0,
    }))

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
