import { prisma } from '@/lib/prisma'
import { exposureClient, ExposureTeamRequest } from '@/lib/exposure'

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

function formatTimeTo12Hour(time: string): string {
    const [hourStr, minuteStr] = time.split(':')
    let hour = parseInt(hourStr, 10)
    const minute = minuteStr || '00'
    const ampm = hour >= 12 ? 'PM' : 'AM'
    if (hour === 0) hour = 12
    else if (hour > 12) hour -= 12
    return `${hour}:${minute} ${ampm}`
}

/**
 * Extracts the events array from the Exposure API response,
 * which may come in different shapes depending on the endpoint/version.
 */
export function extractEventsArray(response: any): any[] {
    if (Array.isArray(response)) {
        return response
    } else if (Array.isArray(response?.Events?.Results)) {
        return response.Events.Results
    } else if (Array.isArray(response?.Events)) {
        return response.Events
    } else if (Array.isArray(response?.Results)) {
        return response.Results
    } else {
        console.error('Invalid Exposure API response structure:', JSON.stringify(response, null, 2).slice(0, 500))
        throw new Error('Invalid Exposure API response: could not find events array')
    }
}

/**
 * Fetches upcoming events from Exposure and returns the raw array (no DB writes).
 */
export async function fetchUpcomingExposureEvents(): Promise<any[]> {
    const response = await exposureClient.getEvents()
    const all = extractEventsArray(response)
    const now = new Date()
    return all.filter((e: any) => new Date(e.EndDate) >= now)
}

/**
 * SYNC EVENTS (Read-Only)
 * Fetches events from Exposure and upserts them to the local DB.
 * New events are created as unpublished (isPublished: false).
 * Existing events: slug, isPublished, isActive are NOT overwritten.
 * If exposureIds is provided, only those specific events are imported.
 */
export async function syncEvents(exposureIds?: number[]) {
    console.log('Starting Exposure Event Sync...')

    let events: any[]
    try {
        events = await fetchUpcomingExposureEvents()
    } catch (err) {
        console.error('Exposure API call failed:', err)
        throw err
    }

    // If specific IDs were requested, filter to just those
    if (exposureIds && exposureIds.length > 0) {
        const idSet = new Set(exposureIds)
        events = events.filter(e => idSet.has(e.Id))
    }

    console.log(`Found ${events.length} events to sync.`)

    let created = 0
    let updated = 0
    let venuesCreated = 0

    for (const expEvent of events) {
        const existing = await prisma.event.findUnique({
            where: { exposureId: expEvent.Id }
        })

        const venueName = expEvent.Address?.Location || expEvent.Venue || expEvent.Location || null
        const venueCity = expEvent.Address?.City || expEvent.City || null
        const venueState = expEvent.Address?.StateRegion || expEvent.State || null
        const venueAddress = expEvent.Address?.Address || expEvent.Address?.Street || null

        const data = {
            name: expEvent.Name,
            startDate: new Date(expEvent.StartDate),
            endDate: new Date(expEvent.EndDate),
            city: venueCity,
            state: venueState,
            venue: venueName,
            bannerImage: expEvent.Image || null,
        }

        // Auto-create venue if we have a venue name
        let venueConnect: { connect: { id: string } } | undefined
        if (venueName) {
            // Find existing venue by name (case-insensitive)
            let venueRecord = await prisma.venue.findFirst({
                where: { name: { equals: venueName, mode: 'insensitive' } },
            })

            if (!venueRecord) {
                venueRecord = await prisma.venue.create({
                    data: {
                        name: venueName,
                        address: venueAddress,
                        city: venueCity,
                        state: venueState,
                    },
                })
                venuesCreated++
                console.log(`Created venue: ${venueName}`)
            }

            venueConnect = { connect: { id: venueRecord.id } }
        }

        if (existing) {
            // Update: don't overwrite slug, isPublished, isActive
            await prisma.event.update({
                where: { id: existing.id },
                data: {
                    ...data,
                    ...(venueConnect && { venues: venueConnect }),
                },
            })
            updated++
        } else {
            // Generate slug with collision handling
            let slug = generateSlug(expEvent.Name)
            let slugExists = await prisma.event.findUnique({ where: { slug } })
            let counter = 1
            while (slugExists) {
                slug = `${generateSlug(expEvent.Name)}-${counter}`
                slugExists = await prisma.event.findUnique({ where: { slug } })
                counter++
            }

            await prisma.event.create({
                data: {
                    ...data,
                    slug,
                    exposureId: expEvent.Id,
                    type: 'TOURNAMENT',
                    isPublished: false,
                    isActive: true,
                    ...(venueConnect && { venues: venueConnect }),
                }
            })
            created++
        }
    }

    return { created, updated, venuesCreated, total: events.length }
}

/**
 * PUSH TEAM (Write)
 * Pushes a local team to Exposure for a specific event/division.
 * Formats schedule requests into human-readable Notes.
 */
export async function pushTeamToExposure(
    teamId: string,
    eventId: string,
    exposureDivisionId: number
) {
    // Fetch event to get its Exposure ID
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { exposureId: true, name: true }
    })

    if (!event?.exposureId) {
        throw new Error('Event does not have an Exposure ID. Please sync events from Exposure first.')
    }

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            roster: {
                where: { leftAt: null },
                include: { player: true }
            },
            eventTeams: {
                where: { eventId }
            }
        }
    })

    if (!team) throw new Error('Team not found')

    // Format schedule requests as human-readable Notes
    const eventTeam = team.eventTeams[0]
    const noteLines: string[] = []

    if (eventTeam?.scheduleRequests) {
        const reqs = eventTeam.scheduleRequests as any

        if (reqs.coachConflict) {
            noteLines.push('CONSTRAINT: Coach has another team in this event (avoid scheduling conflicts)')
        }

        if (reqs.maxGamesPerDay) {
            noteLines.push(`CONSTRAINT: Max ${reqs.maxGamesPerDay} games per day`)
        }

        if (Array.isArray(reqs.constraints)) {
            for (const c of reqs.constraints) {
                if (c.type === 'NOT_BEFORE') {
                    noteLines.push(`CONSTRAINT: No games before ${formatTimeTo12Hour(c.time)} on ${c.day}`)
                } else if (c.type === 'NOT_AFTER') {
                    noteLines.push(`CONSTRAINT: No games after ${formatTimeTo12Hour(c.time)} on ${c.day}`)
                } else if (c.type === 'NOT_BETWEEN') {
                    noteLines.push(`CONSTRAINT: No games between ${formatTimeTo12Hour(c.time)} and ${formatTimeTo12Hour(c.endTime)} on ${c.day}`)
                }
            }
        }
    }

    const payload: ExposureTeamRequest = {
        EventId: event.exposureId,
        DivisionId: exposureDivisionId,
        Name: team.name,
        Notes: noteLines.join('\n'),
        Players: team.roster.map(r => ({
            FirstName: r.player.firstName,
            LastName: r.player.lastName,
            Number: r.jerseyNumber || r.player.jerseyNumber || '0'
        })),
    }

    console.log(`Pushing Team ${team.name} to Exposure Division ${exposureDivisionId}...`)
    const result = await exposureClient.createTeam(payload)

    if (result.Id) {
        await prisma.team.update({
            where: { id: teamId },
            data: { exposureId: result.Id }
        })
    }

    return { success: true, exposureId: result.Id }
}
