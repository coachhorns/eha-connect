import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncEvents } from '@/lib/sync/exposure'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        // Only Admins can sync events
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const result = await syncEvents()

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error syncing events:', error)
        return NextResponse.json(
            { error: 'Failed to sync events' },
            { status: 500 }
        )
    }
}
