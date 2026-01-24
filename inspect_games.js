
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const games = await prisma.game.findMany({
            where: {
                courtId: { not: null }
            },
            select: {
                id: true,
                scheduledAt: true,
                homeTeam: { select: { name: true } }
            },
            take: 5
        })
        console.log('Scheduled Games:', JSON.stringify(games, null, 2))
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
