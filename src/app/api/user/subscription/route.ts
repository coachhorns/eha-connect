import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}
