import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import crypto from 'crypto'

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

    if (!res.ok) {
        console.error(`HTTP ${res.status}: ${await res.text()}`)
        return null
    }
    return res.json()
}

async function main() {
    const eventId = '264187'
    const response = await request(`/v1/games?eventId=${eventId}&status=all`)
    if (!response?.Games?.Results) return

    const games = response.Games.Results
    // Only show bracket games with all game-level fields
    for (const g of games) {
        if ((g.Type ?? 1) === 1) continue
        console.log(`--- Bracket Game ${g.Id} ---`)
        console.log(`  BracketName: "${g.BracketName}"`)
        console.log(`  Number: ${g.Number}`)
        console.log(`  BracketId: ${g.BracketId}`)
        console.log(`  Round: ${g.Round}, RoundType: ${g.RoundType}`)
        console.log(`  Division: ${g.Division?.Name}`)
        console.log(`  Home: "${g.HomeTeam?.Name}" | Away: "${g.AwayTeam?.Name}"`)
        console.log()
    }
}

main().catch(console.error)
