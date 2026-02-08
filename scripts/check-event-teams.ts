import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { prisma } from '../src/lib/prisma'

async function checkEventTeams() {
    const eventTeams = await prisma.eventTeam.findMany({
        take: 5,
        include: {
            team: true,
            event: true
        }
    })

    console.log(`Found ${eventTeams.length} EventTeam records.`)
    if (eventTeams.length > 0) {
        console.log('Sample:', eventTeams[0])
        console.log(`Team: ${eventTeams[0].team.name}`)
        console.log(`Event: ${eventTeams[0].event.name}`)
    } else {
        console.log('No teams are registered for events yet.')
    }
}

checkEventTeams()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
