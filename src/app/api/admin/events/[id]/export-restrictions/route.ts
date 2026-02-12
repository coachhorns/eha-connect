import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function formatTimeTo12Hour(time: string): string {
    const [hourStr, minuteStr] = time.split(':')
    let hour = parseInt(hourStr, 10)
    const minute = minuteStr || '00'
    const ampm = hour >= 12 ? 'PM' : 'AM'
    if (hour === 0) hour = 12
    else if (hour > 12) hour -= 12
    return `${hour}:${minute} ${ampm}`
}

const DAY_ABBR: Record<string, string> = {
    'Friday': 'fri',
    'Saturday': 'sat',
    'Sunday': 'sun',
    'Monday': 'mon',
    'Tuesday': 'tue',
    'Wednesday': 'wed',
    'Thursday': 'thu',
}

/** Returns lowercase day abbreviations for each day of the event (e.g. ["fri", "sat", "sun"]) */
function getEventDayAbbrs(startDate: Date, endDate: Date): string[] {
    const days: string[] = []
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const current = new Date(startDate)
    current.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    while (current <= end) {
        days.push(dayNames[current.getDay()])
        current.setDate(current.getDate() + 1)
    }
    return days
}

function escapeCSV(value: string): string {
    // Exposure requires all values to be quoted
    return `"${value.replace(/"/g, '""')}"`
}

// Only include columns we actually populate — optional columns can be removed per Exposure docs
const TEMPLATE_COLUMNS = [
    'DIVISION',
    'TEAMNAME',
    'AGE',
    'GENDER',
    'CITY',
    'STATEREGION',
    'TEAMRESTRICTIONS',
    'DATETIMERESTRICTIONS',
    'GAMERESTRICTIONS',
]

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: eventId } = await params

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { slug: true, startDate: true, endDate: true },
        })

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        const eventTeams = await prisma.eventTeam.findMany({
            where: { eventId },
            include: {
                team: {
                    select: {
                        name: true,
                        division: true,
                        ageGroup: true,
                        gender: true,
                        coachName: true,
                        city: true,
                        state: true,
                    },
                },
            },
        })

        // Build coach conflict lookup: coachName -> list of team names+divisions
        // Auto-detect when a coach has multiple teams in this event
        const coachTeams = new Map<string, { name: string; division: string }[]>()
        for (const et of eventTeams) {
            const coach = et.team.coachName?.trim().toLowerCase()
            if (!coach) continue
            const entry = { name: et.team.name, division: et.team.division || '' }
            if (!coachTeams.has(coach)) {
                coachTeams.set(coach, [entry])
            } else {
                coachTeams.get(coach)!.push(entry)
            }
        }

        const eventDays = getEventDayAbbrs(event.startDate, event.endDate)

        const rows: string[] = []

        for (const et of eventTeams) {
            const reqs = (et.scheduleRequests as any) || {}

            const division = et.team.division || ''
            const teamName = et.team.name

            const dateTimeRestrictions: string[] = []
            const gameRestrictions: string[] = []
            const teamRestrictions: string[] = []

            // Time constraints → DATETIMERESTRICTIONS
            if (Array.isArray(reqs.constraints)) {
                for (const c of reqs.constraints) {
                    const day = DAY_ABBR[c.day] || c.day?.toLowerCase()
                    if (c.type === 'NOT_BEFORE') {
                        dateTimeRestrictions.push(`after ${formatTimeTo12Hour(c.time)} on ${day}`)
                    } else if (c.type === 'NOT_AFTER') {
                        dateTimeRestrictions.push(`before ${formatTimeTo12Hour(c.time)} on ${day}`)
                    } else if (c.type === 'NOT_BETWEEN') {
                        dateTimeRestrictions.push(
                            `not between ${formatTimeTo12Hour(c.time)} and ${formatTimeTo12Hour(c.endTime)} on ${day}`
                        )
                    }
                }
            }

            // Max games per day → GAMERESTRICTIONS (one entry per event day)
            if (reqs.maxGamesPerDay) {
                for (const day of eventDays) {
                    gameRestrictions.push(`${reqs.maxGamesPerDay} or less on ${day}`)
                }
            }

            // Coach conflict → TEAMRESTRICTIONS
            // Auto-detect: if this coach has multiple teams in the event, add restrictions
            if (et.team.coachName) {
                const coachKey = et.team.coachName.trim().toLowerCase()
                const coachAllTeams = coachTeams.get(coachKey) || []
                if (coachAllTeams.length > 1) {
                    for (const other of coachAllTeams) {
                        if (other.name === teamName && other.division === division) continue
                        teamRestrictions.push(other.name)
                    }
                }
            }

            // Build row — array columns use comma-separated values inside quotes
            const rowData: Record<string, string> = {
                'DIVISION': division,
                'TEAMNAME': teamName,
                'AGE': et.team.ageGroup || '',
                'GENDER': et.team.gender || '',
                'CITY': et.team.city || '',
                'STATEREGION': et.team.state || '',
                'TEAMRESTRICTIONS': teamRestrictions.join(','),
                'DATETIMERESTRICTIONS': dateTimeRestrictions.join(','),
                'GAMERESTRICTIONS': gameRestrictions.join(','),
            }

            const cells = TEMPLATE_COLUMNS.map(col => escapeCSV(rowData[col] || ''))
            rows.push(cells.join(','))
        }

        const header = TEMPLATE_COLUMNS.join(',')
        const csv = [header, ...rows].join('\n')

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="restrictions-${event.slug}.csv"`,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Error exporting restrictions:', message, error)
        return NextResponse.json(
            { error: message || 'Failed to export restrictions' },
            { status: 500 }
        )
    }
}
