import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import crypto from 'crypto'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const apiKey = process.env.EXPOSURE_API_KEY || ''
const secretKey = process.env.EXPOSURE_SECRET_KEY || ''
const baseUrl = 'https://exposureevents.com/api'

function generateSignature(verb: string, uri: string, timestamp: string): string {
    const payload = `${apiKey}&${verb}&${timestamp}&${uri}`.toUpperCase()
    const hmac = crypto.createHmac('sha256', secretKey)
    hmac.update(payload)
    return hmac.digest('base64')
}

async function request(endpoint: string) {
    const timestamp = new Date().toISOString()
    const pathOnly = endpoint.split('?')[0]
    const uri = pathOnly.startsWith('/') ? `/api${pathOnly}` : `/api/${pathOnly}`
    const signature = generateSignature('GET', uri, timestamp)
    const url = `${baseUrl}${endpoint}`

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authentication': `${apiKey}.${signature}`,
            'Timestamp': timestamp,
        },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
}

async function main() {
    const eventId = 'cmlepe2ik0000z8lsx9jpc3gz'

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { exposureId: true, name: true },
    })

    if (!event?.exposureId) {
        console.error('Event not found or no Exposure ID')
        return
    }

    console.log(`Re-syncing schedule for "${event.name}" (Exposure ID: ${event.exposureId})...`)

    const response = await request(`/v1/games?eventId=${event.exposureId}&status=all`)
    const expGames = response?.Games?.Results || []
    console.log(`Found ${expGames.length} games from Exposure.\n`)

    // Build team lookup
    const teamsWithExposureId = await prisma.team.findMany({
        where: { exposureId: { not: null } },
        select: { id: true, exposureId: true },
    })
    const teamByExposureId = new Map(
        teamsWithExposureId.map(t => [t.exposureId!, t.id])
    )

    let tbdTeam = await prisma.team.findFirst({ where: { slug: 'tbd' } })

    let updated = 0
    for (const expGame of expGames) {
        const gameExposureId = String(expGame.Id)
        const isBracket = (expGame.Type ?? 1) !== 1

        const existingGame = await prisma.game.findUnique({
            where: { exposureId: gameExposureId },
        })

        if (!existingGame) {
            console.log(`Game ${gameExposureId} not in DB, skipping`)
            continue
        }

        // Build update data
        const homeTeamLabel = isBracket ? (expGame.HomeTeam?.Name || null) : null
        const awayTeamLabel = isBracket ? (expGame.AwayTeam?.Name || null) : null

        const bracketName = expGame.BracketName || null
        const roundNum = expGame.Round
        let bracketRound: string | null = null
        if (isBracket) {
            if (bracketName && roundNum) {
                bracketRound = `${bracketName} Round ${roundNum}`
            } else if (bracketName) {
                bracketRound = bracketName
            } else if (roundNum) {
                bracketRound = `Round ${roundNum}`
            }
        }

        // Determine gameType
        let gameType: string = existingGame.gameType
        if (isBracket) {
            gameType = 'BRACKET'
            const roundLabel = (expGame.RoundName || '').toLowerCase()
            if (roundLabel.includes('championship') || roundLabel.includes('final')) {
                gameType = 'CHAMPIONSHIP'
            } else if (roundLabel.includes('consolation')) {
                gameType = 'CONSOLATION'
            }
        }

        const data: any = {
            homeTeamLabel,
            awayTeamLabel,
            bracketRound,
            gameType,
        }

        await prisma.game.update({
            where: { id: existingGame.id },
            data,
        })

        if (isBracket) {
            console.log(`Updated bracket game ${gameExposureId}: "${homeTeamLabel}" vs "${awayTeamLabel}" [${bracketRound}]`)
        }
        updated++
    }

    console.log(`\nUpdated ${updated} games.`)
    await prisma.$disconnect()
}

main().catch(console.error)
