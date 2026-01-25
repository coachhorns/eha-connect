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

    const guardians = await prisma.guardian.findMany({
      where: { userId: session.user.id },
      include: {
        player: {
          include: {
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
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const players = guardians.map((g) => ({
      id: g.player.id,
      firstName: g.player.firstName,
      lastName: g.player.lastName,
      slug: g.player.slug,
      profilePhoto: g.player.profilePhoto,
      graduationYear: g.player.graduationYear,
      primaryPosition: g.player.primaryPosition,
      guardianRole: g.role,
      isPayer: g.isPayer,
      teamRosters: g.player.teamRosters,
    }))

    return NextResponse.json({ players })
  } catch (error) {
    console.error('Error fetching guarded players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
