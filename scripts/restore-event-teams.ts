import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
    const eventId = 'cmlepe2ik0000z8lsx9jpc3gz'

    // Find all teams that have an exposureId and were part of this event's games
    const teams = await prisma.team.findMany({
        where: {
            exposureId: { not: null },
            OR: [
                { homeGames: { some: { eventId } } },
                { awayGames: { some: { eventId } } },
            ],
        },
        select: { id: true, name: true, exposureId: true },
    })

    // Also find teams with exposureIds that match the Exposure event teams
    // (in case games were already deleted too)
    const allExposureTeams = await prisma.team.findMany({
        where: { exposureId: { in: [4964763, 4964764, 4964759, 4964760, 4964765, 4964766, 4964761, 4964762] } },
        select: { id: true, name: true, exposureId: true },
    })

    const allTeams = new Map<string, { id: string; name: string }>()
    for (const t of [...teams, ...allExposureTeams]) {
        allTeams.set(t.id, t)
    }

    console.log(`Found ${allTeams.size} teams to restore:`)

    let restored = 0
    for (const [teamId, team] of allTeams) {
        const existing = await prisma.eventTeam.findUnique({
            where: { eventId_teamId: { eventId, teamId } },
        })

        if (!existing) {
            await prisma.eventTeam.create({
                data: { eventId, teamId },
            })
            console.log(`  Restored: ${team.name}`)
            restored++
        } else {
            console.log(`  Already exists: ${team.name}`)
        }
    }

    console.log(`\nRestored ${restored} event-team records.`)
    await prisma.$disconnect()
}

main().catch(console.error)
