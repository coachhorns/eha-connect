import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchUpcomingExposureEvents } from '@/lib/sync/exposure'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const events = await fetchUpcomingExposureEvents()

        // Single query to get all already-imported exposure IDs
        const importedEvents = await prisma.event.findMany({
            where: { exposureId: { not: null } },
            select: { exposureId: true },
        })
        const importedIds = new Set(importedEvents.map(e => e.exposureId))

        const preview = events.map((e: any) => ({
            exposureId: e.Id,
            name: e.Name,
            startDate: e.StartDate,
            endDate: e.EndDate,
            location: e.Address?.Location || e.Venue || e.Location || null,
            city: e.Address?.City || e.City || null,
            state: e.Address?.StateRegion || e.State || null,
            image: e.Image || null,
            alreadyImported: importedIds.has(e.Id),
        }))

        return NextResponse.json({ events: preview })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Error fetching Exposure preview:', message, error)
        return NextResponse.json(
            { error: message || 'Failed to fetch events from Exposure' },
            { status: 500 }
        )
    }
}
