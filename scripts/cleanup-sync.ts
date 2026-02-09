import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
    const eventId = 'cmlepe2ik0000z8lsx9jpc3gz'

    const deleted = await prisma.game.deleteMany({
        where: { eventId, exposureId: { not: null } }
    })
    console.log(`Deleted ${deleted.count} synced games`)

    const etDeleted = await prisma.eventTeam.deleteMany({
        where: { eventId }
    })
    console.log(`Deleted ${etDeleted.count} event-team records`)

    await prisma.$disconnect()
}

main().catch(console.error)
