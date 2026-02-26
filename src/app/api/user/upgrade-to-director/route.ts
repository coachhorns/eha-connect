import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only upgrade PARENT or PLAYER roles — don't change ADMIN or SCOREKEEPER
  if (user.role !== 'PARENT' && user.role !== 'PLAYER') {
    return NextResponse.json({ role: user.role, message: 'Role unchanged' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'PROGRAM_DIRECTOR' },
  })

  return NextResponse.json({ role: 'PROGRAM_DIRECTOR', message: 'Upgraded to director' })
}
