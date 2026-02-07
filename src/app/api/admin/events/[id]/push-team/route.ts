
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pushTeamToExposure } from '@/lib/sync/exposure'

export async function POST(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { teamId, divisionId } = await req.json()

        if (!teamId || !divisionId) {
            return NextResponse.json({ error: 'teamId and divisionId are required' }, { status: 400 })
        }

        const exposureDivisionId = Number(divisionId)
        if (isNaN(exposureDivisionId)) {
            return NextResponse.json({ error: 'divisionId must be a number' }, { status: 400 })
        }

        // Verify team exists
        const team = await prisma.team.findUnique({
            where: { id: teamId },
        })

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        }

        // Verify team is registered for this event
        const eventTeam = await prisma.eventTeam.findUnique({
            where: {
                eventId_teamId: {
                    eventId: params.id,
                    teamId: teamId,
                },
            },
        })

        // Note: For Admins, we might want to allow pushing even if not "registered" locally?
        // But the pushTeamToExposure function relies on eventTeam for schedule requests.
        // So we strictly enforce registration for now.
        if (!eventTeam) {
            return NextResponse.json(
                { error: 'Team is not registered for this event. Please register them in EHA Connect first.' },
                { status: 400 }
            )
        }

        const result = await pushTeamToExposure(teamId, params.id, exposureDivisionId)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error pushing team to Exposure:', error)
        return NextResponse.json(
            { error: 'Failed to push team to Exposure' },
            { status: 500 }
        )
    }
}
