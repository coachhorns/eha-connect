import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { getMobileUser } from './mobile-auth'

/**
 * Gets the current user from either NextAuth session (web) or Bearer token (mobile).
 * Returns a normalized user object with id and role, or null if not authenticated.
 */
export async function getSessionUser(request?: Request) {
  // Try Bearer token first (mobile app)
  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const user = await getMobileUser(request)
      if (user) {
        return { id: user.id, role: user.role as string, name: user.name, email: user.email, image: user.image }
      }
    }
  }

  // Fall back to NextAuth session (web)
  const session = await getServerSession(authOptions)
  if (session?.user) {
    return {
      id: session.user.id,
      role: session.user.role as string,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    }
  }

  return null
}
