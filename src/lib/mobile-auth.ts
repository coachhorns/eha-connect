import { SignJWT, jwtVerify } from 'jose'
import prisma from './prisma'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function createMobileToken(userId: string, role: string) {
  return new SignJWT({ id: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyMobileToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { id: string; role: string }
  } catch {
    return null
  }
}

export async function getMobileUser(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const payload = await verifyMobileToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, image: true, role: true },
  })

  return user
}
