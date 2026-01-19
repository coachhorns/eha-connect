
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Fetching all games...')
    const games = await prisma.game.findMany({
        select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } }
    })

    console.log(`Found ${games.length} games.`)

    if (games.length === 0) {
        console.log('No games found in DB.')
        return
    }

    const gameId = games[0].id
    console.log(`Attempting to fetch Game ID: ${gameId} with complex include...`)

    try {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                homeTeam: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        coachName: true,
                        ageGroup: true,
                        division: true,
                    },
                },
                awayTeam: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        coachName: true,
                        ageGroup: true,
                        division: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        venue: true,
                        city: true,
                        state: true,
                    },
                },
                stats: {
                    include: {
                        player: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                jerseyNumber: true,
                            },
                        },
                    },
                    orderBy: { points: 'desc' },
                },
                statLog: {
                    where: { isUndone: false },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        })

        if (game) {
            console.log('SUCCESS: Game fetched successfully.')
            console.log('Home Team:', game.homeTeam.name)
        } else {
            console.error('FAILURE: findUnique returned null for existing ID.')
        }
    } catch (error) {
        console.error('CRITICAL ERROR during findUnique:', error)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
