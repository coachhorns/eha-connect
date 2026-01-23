
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- DEBUG GAME COUNTS ---')

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

    // Check sample unscheduled game
    if (unscheduled > 0) {
        const sample = await prisma.game.findFirst({
            where: { status: 'SCHEDULED', courtId: null },
            select: { id: true, eventId: true, division: true, homeTeam: { select: { name: true } } }
        })
        console.log('Sample Unscheduled Game:', JSON.stringify(sample, null, 2))
    } else {
        console.log('No unscheduled games found matching criteria.')
        // Let's see what a sample game looks like
        const anyGame = await prisma.game.findFirst()
        console.log('Sample Random Game:', JSON.stringify(anyGame, null, 2))
    }

    // Check event counts
    const events = await prisma.event.findMany({ select: { id: true, name: true } })
    console.log(`Total Events: ${events.length}`)
    for (const event of events) {
        const gameCount = await prisma.game.count({ where: { eventId: event.id } })
        console.log(`- Event: ${event.name} (${event.id}) has ${gameCount} games`)
    }
}

main()
    .catch((e) => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
