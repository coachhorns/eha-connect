import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { playerIds, targetTeamId } = await request.json()

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'playerIds must be a non-empty array' }, { status: 400 })
    }

    if (!targetTeamId) {
      return NextResponse.json({ error: 'targetTeamId is required' }, { status: 400 })
    }

    // Verify target team belongs to the director's program
    const targetTeam = await prisma.team.findUnique({
      where: { id: targetTeamId },
      include: {
        program: {
          select: { id: true, ownerId: true },
        },
      },
    })

    if (!targetTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!targetTeam.program || targetTeam.program.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const programId = targetTeam.program.id

    // Verify all players are on active rosters within this program
    const activeRosters = await prisma.teamRoster.findMany({
      where: {
        playerId: { in: playerIds },
        leftAt: null,
        team: { programId },
      },
      select: { playerId: true, teamId: true },
    })

    const activePlayerIds = new Set(activeRosters.map((r) => r.playerId))
    const invalidPlayerIds = playerIds.filter((id: string) => !activePlayerIds.has(id))

    if (invalidPlayerIds.length > 0) {
      return NextResponse.json(
        { error: `Some players are not on active rosters in this program` },
        { status: 400 }
      )
    }

    // Perform the bulk move in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Soft-remove all selected players from their current rosters
      //    (except if they are already on the target team)
      await tx.teamRoster.updateMany({
        where: {
          playerId: { in: playerIds },
          teamId: { not: targetTeamId },
          leftAt: null,
          team: { programId },
        },
        data: { leftAt: new Date() },
      })

      // 2. Find which players already have entries on the target team
      const existingEntries = await tx.teamRoster.findMany({
        where: {
          playerId: { in: playerIds },
          teamId: targetTeamId,
        },
      })

      const existingPlayerIds = new Set(existingEntries.map((e) => e.playerId))

      // 3. Re-activate any departed entries on the target team
      const toReactivate = existingEntries.filter((e) => e.leftAt !== null)
      if (toReactivate.length > 0) {
        await tx.teamRoster.updateMany({
          where: {
            id: { in: toReactivate.map((e) => e.id) },
          },
          data: { leftAt: null },
        })
      }

      // 4. Count players already active on target (these are skipped)
      const alreadyActive = existingEntries.filter((e) => e.leftAt === null)
      const alreadyActiveIds = new Set(alreadyActive.map((e) => e.playerId))

      // 5. Create new entries for players with no history on target team
      const toCreate = playerIds.filter(
        (id: string) => !existingPlayerIds.has(id)
      )

      if (toCreate.length > 0) {
        await tx.teamRoster.createMany({
          data: toCreate.map((playerId: string) => ({
            teamId: targetTeamId,
            playerId,
          })),
        })
      }

      return {
        moved: toReactivate.length + toCreate.length,
        skipped: alreadyActiveIds.size,
      }
    })

    return NextResponse.json({
      success: true,
      moved: result.moved,
      skipped: result.skipped,
    })
  } catch (error) {
    console.error('[Roster Manager] Move error:', error)
    return NextResponse.json(
      { error: 'Failed to move players' },
      { status: 500 }
    )
  }
}
