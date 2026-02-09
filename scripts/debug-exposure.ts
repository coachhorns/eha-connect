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

async function request(endpoint: string, label: string) {
    const timestamp = new Date().toISOString()
    const pathOnly = endpoint.split('?')[0]
    const uri = pathOnly.startsWith('/') ? `/api${pathOnly}` : `/api/${pathOnly}`
    const signature = generateSignature('GET', uri, timestamp)
    const url = `${baseUrl}${endpoint}`

    console.log(`\n[${label}] GET ${endpoint}`)

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authentication': `${apiKey}.${signature}`,
            'Timestamp': timestamp,
        },
    })

    console.log(`  Status: ${res.status}`)

    if (!res.ok) {
        const text = await res.text()
        if (text.startsWith('{')) console.log(`  Error: ${text.slice(0, 300)}`)
        else console.log(`  Error: HTML 404`)
        return null
    }

    const data = await res.json()
    const json = JSON.stringify(data, null, 2)
    console.log(`  Response (${json.length} chars): ${json.slice(0, 1500)}`)
    return data
}

async function main() {
    // Valentine Day Classic divisions: EPL 17 = 1365375, EPL 16 = 1365376

    // Try games by division ID
    await request('/v1/games?divisionId=1365375', 'Games by EPL 17 division')
    await request('/v1/games?divisionId=1365376', 'Games by EPL 16 division')

    // Try pools endpoint
    await request('/v1/pools?divisionId=1365375', 'Pools for EPL 17')
    await request('/v1/pools?divisionId=1365376', 'Pools for EPL 16')

    // Try standings (might have game data embedded)
    await request('/v1/standings?divisionId=1365375', 'Standings EPL 17')
    await request('/v1/standings?eventId=264187', 'Standings by event')

    // Check if the event maybe needs a "status" param
    await request('/v1/games?eventId=264187&status=all', 'Games status=all')
    await request('/v1/games?eventId=264187&includeUnscheduled=true', 'Games includeUnscheduled')

    // Try the ACES event by division to compare format
    await request('/v1/games?divisionId=1312613', 'ACES 12U division games')
}

main().catch(console.error)
