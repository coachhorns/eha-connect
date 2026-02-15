import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    const registrations = await prisma.eventCollegeRegistration.findMany({
      where: {
        eventId,
        paymentStatus: 'COMPLETED',
      },
      select: {
        school: true,
        division: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { school: 'asc' },
    })

    return NextResponse.json({ attendees: registrations })
  } catch (error) {
    console.error('Error fetching attendees:', error)
    return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 })
  }
}
