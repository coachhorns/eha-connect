import { prisma } from '@/lib/prisma'
import { exposureClient, ExposureTeamRequest } from '@/lib/exposure'

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

/**
 * Parses a date string from Exposure as a local-timezone date at noon,
 * avoiding the off-by-one day shift caused by UTC midnight interpretation.
 */
function parseExposureDate(dateStr: string): Date {
    const d = new Date(dateStr)
    // If the string is date-only (e.g. "2025-02-14"), JS parses it as UTC midnight.
    // Shift to noon UTC so it lands on the correct calendar day in any US timezone.
    if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes(' ')) {
        d.setUTCHours(12)
    }
    return d
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
            startDate: parseExposureDate(expEvent.StartDate),
            endDate: parseExposureDate(expEvent.EndDate),
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

/**
 * Extracts the games array from an Exposure schedule response.
 */
function extractGamesArray(response: any): any[] {
    if (Array.isArray(response)) return response
    if (Array.isArray(response?.Games?.Results)) return response.Games.Results
    if (Array.isArray(response?.Games)) return response.Games
    if (Array.isArray(response?.Results)) return response.Results
    // Exposure returns { Games: null } when no games are scheduled yet
    if (response?.Games === null || response?.Games?.Results === null) return []
    console.error('Unexpected schedule response shape:', JSON.stringify(response, null, 2).slice(0, 500))
    throw new Error('Invalid Exposure schedule response: could not find games array')
}

/**
 * Maps an Exposure game to our GameStatus enum.
 * Exposure doesn't provide an explicit status field — we infer from scores.
 */
function mapGameStatus(expGame: any): 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' {
    // Check explicit status field first (some responses may include it)
    const status = (expGame.Status || '').toLowerCase()
    if (status === 'final' || status === 'completed' || expGame.IsFinal) return 'FINAL'
    if (status === 'in progress' || status === 'inprogress' || status === 'live') return 'IN_PROGRESS'

    // Infer: if both teams have scores > 0, treat as FINAL
    const homeScore = expGame.HomeTeam?.Score ?? 0
    const awayScore = expGame.AwayTeam?.Score ?? 0
    if (homeScore > 0 || awayScore > 0) return 'FINAL'

    return 'SCHEDULED'
}

/**
 * Parses Exposure's separate Date ("11/29/2025") and Time ("8:00 AM") into a Date.
 */
function parseExposureDateTime(date: string, time: string): Date {
    // Try combining "MM/DD/YYYY" + "H:MM AM/PM"
    const combined = `${date} ${time}`
    const parsed = new Date(combined)
    if (!isNaN(parsed.getTime())) return parsed

    // Fallback: parse date alone
    return new Date(date)
}

/**
 * SYNC SCHEDULE (Read-Only)
 * Pulls the game schedule from Exposure for a given EHA event
 * and upserts Game records in the local DB.
 */
export async function syncSchedule(eventId: string) {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { venues: { include: { courts: true } } },
    })

    if (!event) throw new Error('Event not found')
    if (!event.exposureId) {
        throw new Error('Event does not have an Exposure ID. Sync the event from Exposure first.')
    }

    console.log(`Syncing schedule for "${event.name}" (Exposure ID: ${event.exposureId})...`)

    const response = await exposureClient.getSchedule(String(event.exposureId))
    console.log('DEBUG: Exposure Schedule Response Keys:', Object.keys(response))
    if (response.Games) console.log('DEBUG: response.Games Keys:', Object.keys(response.Games))
    
    const expGames = extractGamesArray(response)

    console.log(`Found ${expGames.length} games from Exposure.`)

    // Build a lookup of Exposure team ID -> EHA team ID for quick matching.
    // Search ALL teams with an exposureId (not just those already linked to this event),
    // since EventTeam records may not exist yet on the first sync.
    const teamsWithExposureId = await prisma.team.findMany({
        where: { exposureId: { not: null } },
        select: { id: true, exposureId: true },
    })
    const teamByExposureId = new Map(
        teamsWithExposureId.map(t => [t.exposureId!, t.id])
    )

    // Build a court lookup from the event's venues: lowercase name -> court record
    const courtByName = new Map<string, { id: string }>()
    const primaryVenue = event.venues[0] // fallback venue for creating new courts
    for (const venue of event.venues) {
        for (const court of venue.courts) {
            courtByName.set(court.name.toLowerCase(), court)
        }
    }

    // Find or create a "TBD" placeholder team for bracket games with unassigned teams
    let tbdTeam = await prisma.team.findFirst({ where: { slug: 'tbd' } })
    if (!tbdTeam) {
        tbdTeam = await prisma.team.create({
            data: { name: 'TBD', slug: 'tbd', isActive: true },
        })
        console.log('Created TBD placeholder team')
    }

    let created = 0
    let updated = 0
    let skipped = 0
    let courtsCreated = 0

    for (const expGame of expGames) {
        const gameExposureId = String(expGame.Id)

        // Resolve home/away teams — Exposure uses TeamId inside HomeTeam/AwayTeam
        const homeExpId = expGame.HomeTeam?.TeamId ?? expGame.HomeTeamId
        const awayExpId = expGame.AwayTeam?.TeamId ?? expGame.AwayTeamId

        let homeTeamId = homeExpId != null ? teamByExposureId.get(homeExpId) : undefined
        let awayTeamId = awayExpId != null ? teamByExposureId.get(awayExpId) : undefined

        // For bracket games with TBD teams, use the placeholder
        const isBracketType = (expGame.Type ?? 1) !== 1
        if (!homeTeamId || !awayTeamId) {
            if (isBracketType) {
                homeTeamId = homeTeamId || tbdTeam.id
                awayTeamId = awayTeamId || tbdTeam.id
            } else {
                console.log(`Skipping Exposure game ${gameExposureId}: missing team mapping (home=${homeExpId}, away=${awayExpId})`)
                skipped++
                continue
            }
        }

        // Parse scheduled time — Exposure sends separate Date and Time strings
        const scheduledAt = parseExposureDateTime(expGame.Date || '', expGame.Time || '')
        if (isNaN(scheduledAt.getTime())) {
            console.log(`Skipping Exposure game ${gameExposureId}: invalid date (${expGame.Date} ${expGame.Time})`)
            skipped++
            continue
        }

        // Resolve court — Exposure nests under VenueCourt.Court.Name
        const courtName: string | null = expGame.VenueCourt?.Court?.Name || null
        let courtId: string | null = null
        if (courtName) {
            const existing = courtByName.get(courtName.toLowerCase())
            if (existing) {
                courtId = existing.id
            } else if (primaryVenue) {
                const newCourt = await prisma.court.create({
                    data: { name: courtName, venueId: primaryVenue.id },
                })
                courtByName.set(courtName.toLowerCase(), newCourt)
                courtId = newCourt.id
                courtsCreated++
                console.log(`Created court: ${courtName}`)
            }
        }

        // Map game type — Exposure Type: 1=Pool, 2=Bracket, etc.
        // Also check Round for bracket-stage games
        const expType = expGame.Type
        const roundNum = expGame.Round
        let gameType: 'POOL' | 'BRACKET' | 'CHAMPIONSHIP' | 'CONSOLATION' = 'POOL'
        if (expType === 2 || expType === 3) {
            gameType = 'BRACKET'
        }
        // Refine bracket games by round name if present
        const roundLabel = (expGame.RoundName || '').toLowerCase()
        if (roundLabel.includes('championship') || roundLabel.includes('final')) {
            gameType = 'CHAMPIONSHIP'
        } else if (roundLabel.includes('consolation')) {
            gameType = 'CONSOLATION'
        }

        const status = mapGameStatus(expGame)
        const homeScore = expGame.HomeTeam?.Score ?? 0
        const awayScore = expGame.AwayTeam?.Score ?? 0
        const poolName = expGame.HomeTeam?.PoolName || expGame.AwayTeam?.PoolName || null

        // Only set bracketRound for actual bracket games, not pool play
        const isBracketGame = gameType !== 'POOL'

        // For bracket games, capture descriptive team labels from Exposure
        // (e.g. "3rd in A", "W1 (Championship)", "1st in A")
        const homeTeamLabel = isBracketGame ? (expGame.HomeTeam?.Name || null) : null
        const awayTeamLabel = isBracketGame ? (expGame.AwayTeam?.Name || null) : null

        // Use BracketName from Exposure (e.g. "Championship", "Consolation") if available
        const bracketName = expGame.BracketName || null
        let bracketRound: string | null = null
        if (isBracketGame) {
            if (bracketName && roundNum) {
                bracketRound = `${bracketName} Round ${roundNum}`
            } else if (bracketName) {
                bracketRound = bracketName
            } else if (roundNum) {
                bracketRound = `Round ${roundNum}`
            }
        }

        const data = {
            eventId,
            homeTeamId,
            awayTeamId,
            scheduledAt,
            status,
            homeScore: status === 'FINAL' || status === 'IN_PROGRESS' ? homeScore : 0,
            awayScore: status === 'FINAL' || status === 'IN_PROGRESS' ? awayScore : 0,
            courtId,
            court: courtName,
            gameType,
            poolCode: poolName,
            bracketRound,
            division: expGame.Division?.Name || null,
            homeTeamLabel,
            awayTeamLabel,
        }

        const existingGame = await prisma.game.findUnique({
            where: { exposureId: gameExposureId },
        })

        if (existingGame) {
            await prisma.game.update({
                where: { id: existingGame.id },
                data,
            })
            updated++
        } else {
            await prisma.game.create({
                data: { ...data, exposureId: gameExposureId },
            })
            created++
        }
    }

    // Ensure EventTeam records exist for every team that appeared in games.
    // This links teams to the event with pool info so the frontend can display standings.
    const teamPoolMap = new Map<string, string | null>() // EHA teamId -> pool label
    for (const expGame of expGames) {
        const homeExpId = expGame.HomeTeam?.TeamId ?? expGame.HomeTeamId
        const awayExpId = expGame.AwayTeam?.TeamId ?? expGame.AwayTeamId
        const homeTeamId = homeExpId != null ? teamByExposureId.get(homeExpId) : undefined
        const awayTeamId = awayExpId != null ? teamByExposureId.get(awayExpId) : undefined
        const poolName = expGame.HomeTeam?.PoolName || expGame.AwayTeam?.PoolName || null
        const divisionName = expGame.Division?.Name || null

        // Include division in pool label to distinguish e.g. "EPL 17 — Pool A" from "EPL 16 — Pool A"
        let pool: string | null = null
        if (poolName && divisionName) {
            pool = `${divisionName} — Pool ${poolName}`
        } else if (poolName) {
            pool = `Pool ${poolName}`
        }

        if (homeTeamId && !teamPoolMap.has(homeTeamId)) teamPoolMap.set(homeTeamId, pool)
        if (awayTeamId && !teamPoolMap.has(awayTeamId)) teamPoolMap.set(awayTeamId, pool)
    }

    let eventTeamsCreated = 0
    for (const [teamId, pool] of teamPoolMap) {
        const existing = await prisma.eventTeam.findUnique({
            where: { eventId_teamId: { eventId, teamId } },
        })
        if (!existing) {
            await prisma.eventTeam.create({
                data: { eventId, teamId, pool },
            })
            eventTeamsCreated++
        } else if (pool && existing.pool !== pool) {
            // Update pool assignment if it changed or was previously unset
            await prisma.eventTeam.update({
                where: { id: existing.id },
                data: { pool },
            })
        }
    }

    console.log(`Schedule sync complete: ${created} created, ${updated} updated, ${skipped} skipped, ${courtsCreated} courts created, ${eventTeamsCreated} event-team links added.`)
    return { created, updated, skipped, courtsCreated, eventTeamsCreated, total: expGames.length }
}
