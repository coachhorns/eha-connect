import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createMobileToken } from '@/lib/mobile-auth'

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json(
        { error: 'Google ID token is required' },
        { status: 400 }
      )
    }

    // Verify the Google ID token
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    )

    if (!googleRes.ok) {
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      )
    }

    const googleUser = await googleRes.json()
    const { email, name, picture } = googleUser

    if (!email) {
      return NextResponse.json(
        { error: 'No email in Google token' },
        { status: 400 }
      )
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          image: picture || null,
          role: 'PLAYER',
        },
      })
    }

    const token = await createMobileToken(user.id, user.role)

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      },
      token,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
