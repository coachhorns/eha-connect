import prisma from '@/lib/prisma'

interface CanViewStatsResult {
  canView: boolean
  reason: 'guardian' | 'subscriber' | 'admin' | 'none'
}

/**
 * Determines if a user can view detailed stats for a player
 * - Returns true if user is a Guardian of the player
 * - Returns true if user has an ACTIVE Subscription (any tier)
 * - Returns true if user is ADMIN
 * - Returns false otherwise
 */
export async function canViewStats(
  userId: string | undefined,
  playerId: string
): Promise<CanViewStatsResult> {
  // Not logged in - no access
  if (!userId) {
    return { canView: false, reason: 'none' }
  }

  // Check user role, guardian record, and subscription in parallel
  const [user, guardian, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    }),
    prisma.guardian.findUnique({
      where: {
        userId_playerId: { userId, playerId }
      }
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true }
    })
  ])

  // Admin users have full access
  if (user?.role === 'ADMIN') {
    return { canView: true, reason: 'admin' }
  }

  // Guardian of this player has access
  if (guardian) {
    return { canView: true, reason: 'guardian' }
  }

  // Active subscriber has access
  if (subscription?.status === 'ACTIVE') {
    return { canView: true, reason: 'subscriber' }
  }

  return { canView: false, reason: 'none' }
}

/**
 * Check if user is primary guardian of a player
 */
export async function isPrimaryGuardian(
  userId: string,
  playerId: string
): Promise<boolean> {
  const guardian = await prisma.guardian.findUnique({
    where: {
      userId_playerId: { userId, playerId }
    }
  })
  return guardian?.role === 'PRIMARY'
}

/**
 * Check if user can manage a player (is any guardian)
 */
export async function canManagePlayer(
  userId: string,
  playerId: string
): Promise<boolean> {
  const guardian = await prisma.guardian.findUnique({
    where: {
      userId_playerId: { userId, playerId }
    }
  })
  return !!guardian
}

/**
 * Get all players a user is guardian of
 */
export async function getGuardedPlayers(userId: string) {
  const guardians = await prisma.guardian.findMany({
    where: { userId },
    include: {
      player: {
        include: {
          teamRosters: {
            where: { leftAt: null },
            include: { team: true },
            take: 1
          }
        }
      }
    }
  })

  return guardians.map(g => ({
    ...g.player,
    guardianRole: g.role,
    isPayer: g.isPayer
  }))
}

/**
 * Get all guardians of a player
 */
export async function getPlayerGuardians(playerId: string) {
  const guardians = await prisma.guardian.findMany({
    where: { playerId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  })

  return guardians.map(g => ({
    ...g.user,
    role: g.role,
    isPayer: g.isPayer
  }))
}
