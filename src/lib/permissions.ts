import prisma from '@/lib/prisma'

interface CanViewStatsResult {
  canView: boolean
  reason: 'subscribed' | 'admin' | 'none'
}

/**
 * Determines if a player's stats are visible.
 * Stats visibility is tied to the PLAYER's profile, not the viewer:
 * - Admin viewers always have access
 * - If any guardian of the player has an ACTIVE subscription → stats visible to everyone
 * - Otherwise → stats hidden for everyone
 */
export async function canViewStats(
  userId: string | undefined,
  playerId: string
): Promise<CanViewStatsResult> {
  // Check admin status and player subscription in parallel
  const [user, subscribedGuardian] = await Promise.all([
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        })
      : null,
    prisma.guardian.findFirst({
      where: {
        playerId,
        user: {
          subscription: {
            status: 'ACTIVE',
          },
        },
      },
    }),
  ])

  // Admin viewers always have access
  if (user?.role === 'ADMIN') {
    return { canView: true, reason: 'admin' }
  }

  // If any guardian on this player's profile has an active subscription, stats are public
  if (subscribedGuardian) {
    return { canView: true, reason: 'subscribed' }
  }

  return { canView: false, reason: 'none' }
}

/**
 * Check if a player's profile has an active subscription (any guardian has paid).
 * Used by API routes to add isSubscribed flag to responses.
 */
export async function isPlayerSubscribed(playerId: string): Promise<boolean> {
  const subscribedGuardian = await prisma.guardian.findFirst({
    where: {
      playerId,
      user: {
        subscription: {
          status: 'ACTIVE',
        },
      },
    },
    select: { id: true },
  })
  return !!subscribedGuardian
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
