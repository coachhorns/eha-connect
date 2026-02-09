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

        // Parse optional exposureIds filter from request body
        let exposureIds: number[] | undefined
        try {
            const body = await req.json()
            if (Array.isArray(body.exposureIds) && body.exposureIds.length > 0) {
                exposureIds = body.exposureIds
            }
        } catch {
            // No body or invalid JSON — import all (backward compatible)
        }

        const result = await syncEvents(exposureIds)

        return NextResponse.json(result)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Error syncing events:', message, error)
        return NextResponse.json(
            { error: message || 'Failed to sync events' },
            { status: 500 }
        )
    }
}
