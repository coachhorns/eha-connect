import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncSchedule } from '@/lib/sync/exposure'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { eventId } = body

        if (!eventId || typeof eventId !== 'string') {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
        }

        const result = await syncSchedule(eventId)

        return NextResponse.json(result)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Error syncing schedule:', message, error)
        return NextResponse.json(
            { error: message || 'Failed to sync schedule from Exposure' },
            { status: 500 }
        )
    }
}
