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

        if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { eventId, exposureDivisionId } = await req.json()

        if (!eventId || !exposureDivisionId) {
            return NextResponse.json({ error: 'eventId and exposureDivisionId are required' }, { status: 400 })
        }

        const divisionId = Number(exposureDivisionId)
        if (isNaN(divisionId)) {
            return NextResponse.json({ error: 'exposureDivisionId must be a number' }, { status: 400 })
        }

        // Verify ownership
        const team = await prisma.team.findUnique({
            where: { id: params.id },
            include: {
                program: {
                    select: { ownerId: true },
                },
            },
        })

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        }

        if (!team.program || team.program.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Verify team is registered for this event
        const eventTeam = await prisma.eventTeam.findUnique({
            where: {
                eventId_teamId: {
                    eventId,
                    teamId: params.id,
                },
            },
        })

        if (!eventTeam) {
            return NextResponse.json(
                { error: 'Team is not registered for this event' },
                { status: 400 }
            )
        }

        const result = await pushTeamToExposure(params.id, eventId, divisionId)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error pushing team to Exposure:', error)
        return NextResponse.json(
            { error: 'Failed to push team to Exposure' },
            { status: 500 }
        )
    }
}
