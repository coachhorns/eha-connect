import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const role = session.user.role

    let playerIds: string[] = []

    if (role === 'PROGRAM_DIRECTOR') {
      // Director: get all players across all teams in their program
      const program = await prisma.program.findFirst({
        where: { ownerId: userId },
        select: {
          teams: {
            select: {
              roster: {
                select: { playerId: true },
              },
            },
          },
        },
      })

      if (program) {
        playerIds = program.teams.flatMap((t) =>
          t.roster.map((r) => r.playerId)
        )
      }
    } else {
      // Player/Parent: get players linked via userId or guardians
      const [ownedPlayers, guardedPlayers] = await Promise.all([
        prisma.player.findMany({
          where: { userId },
          select: { id: true },
        }),
        prisma.guardian.findMany({
          where: { userId },
          select: { playerId: true },
        }),
      ])

      playerIds = [
        ...ownedPlayers.map((p) => p.id),
        ...guardedPlayers.map((g) => g.playerId),
      ]
    }

    // Dedupe
    playerIds = [...new Set(playerIds)]

    if (playerIds.length === 0) {
      return NextResponse.json({ logs: [] })
    }

    // Find recruiting emails that include any of these players
    const logs = await prisma.recruitingEmail.findMany({
      where: {
        players: {
          some: {
            playerId: { in: playerIds },
          },
        },
      },
      select: {
        id: true,
        coachName: true,
        coachEmail: true,
        collegeName: true,
        sentAt: true,
        players: {
          select: {
            player: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    })

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      coachName: log.coachName,
      coachEmail: log.coachEmail,
      collegeName: log.collegeName,
      sentAt: log.sentAt.toISOString(),
      players: log.players.map((p) => ({
        firstName: p.player.firstName,
        lastName: p.player.lastName,
      })),
    }))

    return NextResponse.json({ logs: formattedLogs })
  } catch (error) {
    console.error('Error fetching recruiting log:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recruiting log' },
      { status: 500 }
    )
  }
}
