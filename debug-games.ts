
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DEBUG GAME COUNTS ---')

    try {
        const total = await prisma.game.count()
        console.log(`Total Games: ${total}`)

        const scheduledStatus = await prisma.game.count({ where: { status: 'SCHEDULED' } })
        console.log(`Status 'SCHEDULED': ${scheduledStatus}`)

        const nullCourtId = await prisma.game.count({ where: { courtId: null } })
        console.log(`courtId NULL: ${nullCourtId}`)

        const unscheduled = await prisma.game.count({
            where: {
                status: 'SCHEDULED',
                courtId: null
            }
        })
        console.log(`Status 'SCHEDULED' AND courtId NULL: ${unscheduled}`)

        // Check sample unscheduled game if any
        if (unscheduled > 0) {
            const sample = await prisma.game.findFirst({
                where: { status: 'SCHEDULED', courtId: null },
                select: { id: true, eventId: true, division: true, homeTeam: { select: { name: true } } }
            })
            console.log('Sample Unscheduled Game:', JSON.stringify(sample, null, 2))
        } else {
            console.log('No unscheduled games found.')
            // Check a random game to see what it looks like
            const anyGame = await prisma.game.findFirst()
            if (anyGame) {
                console.log('Sample Random Game:', JSON.stringify(anyGame, null, 2))
            } else {
                console.log('Database appears completely empty of games.')
            }
        }

        // Check event counts
        const events = await prisma.event.findMany({ select: { id: true, name: true } })
        console.log(`Total Events: ${events.length}`)

        for (const event of events) {
            // Count total games for this event
            const totalEventGames = await prisma.game.count({ where: { eventId: event.id } })

            // Count UNSCHEDULED games for this event
            const unscheduledEventGames = await prisma.game.count({
                where: {
                    eventId: event.id,
                    status: 'SCHEDULED', // ensure status matches
                    courtId: null
                }
            })

            console.log(`- Event: "${event.name}" (${event.id})`)
            console.log(`    Total Games: ${totalEventGames}`)
            console.log(`    Unscheduled Matches: ${unscheduledEventGames}`)
        }

    } catch (error) {
        console.error('Error running debug script:', error)
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect()
    })
