import { NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'

export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
