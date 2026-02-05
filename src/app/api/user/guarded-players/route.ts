import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const playerInclude = {
      teamRosters: {
        where: { leftAt: null },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        take: 1,
      },
    } as const

    // Fetch guardian-linked players and self-linked players in parallel
    const [guardians, selfLinkedPlayers] = await Promise.all([
      prisma.guardian.findMany({
        where: { userId: session.user.id },
        include: { player: { include: playerInclude } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.player.findMany({
        where: { userId: session.user.id },
        include: playerInclude,
      }),
    ])

    // Build a set of player IDs already linked via guardian table
    const guardianPlayerIds = new Set(guardians.map((g) => g.player.id))

    const players = [
      // Guardian records: map PLAYER role to SELF, keep PRIMARY/SECONDARY
      ...guardians.map((g) => ({
        id: g.player.id,
        firstName: g.player.firstName,
        lastName: g.player.lastName,
        slug: g.player.slug,
        profilePhoto: g.player.profilePhoto,
        graduationYear: g.player.graduationYear,
        primaryPosition: g.player.primaryPosition,
        guardianRole: g.role === 'PLAYER' ? 'SELF' : g.role,
        isPayer: g.isPayer,
        teamRosters: g.player.teamRosters,
      })),
      // Legacy self-linked players not already in guardian results
      ...selfLinkedPlayers
        .filter((p) => !guardianPlayerIds.has(p.id))
        .map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          slug: p.slug,
          profilePhoto: p.profilePhoto,
          graduationYear: p.graduationYear,
          primaryPosition: p.primaryPosition,
          guardianRole: 'SELF' as const,
          isPayer: false,
          teamRosters: p.teamRosters,
        })),
    ]

    return NextResponse.json({ players })
  } catch (error) {
    console.error('Error fetching guarded players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
