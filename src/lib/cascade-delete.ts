import prisma from '@/lib/prisma'

/**
 * Cascade soft-delete players when a team is deactivated.
 *
 * For each active roster member of the given team:
 *   - If the player is claimed (has guardians): keep active, just mark roster as left
 *   - If the player is unclaimed AND has no other active rosters: soft-delete (isActive = false)
 *   - If the player is unclaimed BUT has other active rosters: just mark roster as left
 */
export async function cascadeSoftDeleteTeamPlayers(teamId: string) {
  // Get all active roster entries for this team
  const rosterEntries = await prisma.teamRoster.findMany({
    where: {
      teamId,
      leftAt: null,
    },
    select: {
      id: true,
      playerId: true,
    },
  })

  if (rosterEntries.length === 0) return

  const now = new Date()
  const playerIds = rosterEntries.map((r) => r.playerId)

  // For each player, check if they're claimed (have guardians) and if they have other active rosters
  const players = await prisma.player.findMany({
    where: {
      id: { in: playerIds },
      isActive: true,
    },
    select: {
      id: true,
      guardians: { select: { id: true }, take: 1 },
      teamRosters: {
        where: {
          teamId: { not: teamId },
          leftAt: null,
          team: { isActive: true },
        },
        select: { id: true },
        take: 1,
      },
    },
  })

  // Determine which players to soft-delete
  const playerIdsToDeactivate = players
    .filter((p) => p.guardians.length === 0 && p.teamRosters.length === 0)
    .map((p) => p.id)

  // Execute everything in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Mark all roster entries as left
    await tx.teamRoster.updateMany({
      where: {
        teamId,
        leftAt: null,
      },
      data: { leftAt: now },
    })

    // 2. Soft-delete unclaimed players with no other active rosters
    if (playerIdsToDeactivate.length > 0) {
      await tx.player.updateMany({
        where: { id: { in: playerIdsToDeactivate } },
        data: { isActive: false },
      })
    }
  })

  return {
    rosterEntriesMarked: rosterEntries.length,
    playersDeactivated: playerIdsToDeactivate.length,
  }
}

/**
 * Cascade soft-delete for all teams in a program.
 * Soft-deletes each team and cascades to their players.
 */
export async function cascadeSoftDeleteProgramTeams(programId: string) {
  const teams = await prisma.team.findMany({
    where: {
      programId,
      isActive: true,
    },
    select: { id: true },
  })

  let totalPlayersDeactivated = 0
  let totalRosterEntriesMarked = 0

  for (const team of teams) {
    const result = await cascadeSoftDeleteTeamPlayers(team.id)
    if (result) {
      totalPlayersDeactivated += result.playersDeactivated
      totalRosterEntriesMarked += result.rosterEntriesMarked
    }
  }

  // Soft-delete all the teams
  if (teams.length > 0) {
    await prisma.team.updateMany({
      where: { id: { in: teams.map((t) => t.id) } },
      data: { isActive: false },
    })
  }

  return {
    teamsDeactivated: teams.length,
    totalRosterEntriesMarked,
    totalPlayersDeactivated,
  }
}
