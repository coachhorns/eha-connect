import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email } = body

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
      }

      const existing = await prisma.user.findFirst({
        where: { email: email.trim(), NOT: { id: user.id } },
      })

      if (existing) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 409 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim() }),
      },
      select: { id: true, name: true, email: true, image: true, role: true },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
