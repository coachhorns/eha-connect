import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'

const ALLOWED_ROLES = ['PARENT', 'PLAYER', 'PROGRAM_DIRECTOR']

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { role } = await request.json()

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be PARENT, PLAYER, or PROGRAM_DIRECTOR.' },
      { status: 400 }
    )
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role,
      roleSelected: true,
    },
    select: { id: true, role: true, roleSelected: true },
  })

  return NextResponse.json({
    role: updated.role,
    roleSelected: updated.roleSelected,
  })
}
