
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()

function log(msg) {
    try {
        fs.appendFileSync('verify_log.txt', msg + '\n')
    } catch (e) { }
}

async function main() {
    log('--- START ---')
    try {
        const count = await prisma.game.count()
        log(`Game Count: ${count}`)

        const games = await prisma.game.findMany({
            take: 5,
            select: {
                id: true,
                homeTeam: { select: { name: true } },
                awayTeam: { select: { name: true } }
            }
        })

        log('Games: ' + JSON.stringify(games, null, 2))

        if (games.length > 0) {
            // Try to fetch the first game with full include
            const id = games[0].id
            log(`Trying findUnique for ${id}`)

            try {
                const game = await prisma.game.findUnique({
                    where: { id },
                    include: {
                        homeTeam: true,
                        awayTeam: true,
                        // Minimal include to test
                        event: true
                    }
                })
                log('Simple findUnique success: ' + (!!game))
            } catch (err) {
                log('Simple findUnique failed: ' + err.message)
            }
        }

    } catch (e) {
        log('ERROR: ' + e.message)
        if (e.stack) log(e.stack)
    }
    log('--- END ---')
}

main()
    .finally(async () => await prisma.$disconnect())
