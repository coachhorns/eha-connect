import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const entries = await prisma.waitlist.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ entries, total: entries.length })
}
