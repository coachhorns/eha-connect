// Test script to directly call Exposure API for team creation
// Run with: node scripts/test-exposure-push.js <divisionId> <teamName>

require('dotenv').config();
const crypto = require('crypto');

const config = {
    apiKey: process.env.EXPOSURE_API_KEY || '',
    secretKey: process.env.EXPOSURE_SECRET_KEY || '',
    baseUrl: 'https://exposureevents.com/api'
};

function generateSignature(verb, uri, timestamp) {
    const payload = `${config.apiKey}&${verb}&${timestamp}&${uri}`.toUpperCase();
    const hmac = crypto.createHmac('sha256', config.secretKey);
    hmac.update(payload);
    return hmac.digest('base64');
}

async function testCreateTeam(eventId, divisionId, teamName) {
    const timestamp = new Date().toISOString();
    const endpoint = '/v1/teams';
    const uri = `/api${endpoint}`;
    const signature = generateSignature('POST', uri, timestamp);

    const body = {
        EventId: Number(eventId),
        DivisionId: Number(divisionId),
        Name: teamName,
        Notes: 'Test from EHA Connect',
        Players: [
            { FirstName: 'Test', LastName: 'Player', Number: '1' }
        ]
    };

    console.log('--- Request Details ---');
    console.log('URL:', config.baseUrl + endpoint);
    console.log('Method: POST');
    console.log('Timestamp:', timestamp);
    console.log('Payload for Signature:', `${config.apiKey}&POST&${timestamp}&${uri}`.toUpperCase());
    console.log('Auth Header:', `${config.apiKey}.${signature}`);
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('-----------------------\n');

    try {
        const res = await fetch(config.baseUrl + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authentication': `${config.apiKey}.${signature}`,
                'Timestamp': timestamp
            },
            body: JSON.stringify(body)
        });

        console.log('Status:', res.status, res.statusText);

        const text = await res.text();
        console.log('Response Body:', text);

        if (res.ok) {
            console.log('\n✅ Success! Team created.');
        } else {
            console.log('\n❌ Failed. See response above.');
        }
    } catch (error) {
        console.error('Network Error:', error);
    }
}

// Usage: node scripts/test-exposure-push.js <eventId> <divisionId> <teamName>
const eventId = process.argv[2];
const divisionId = process.argv[3];
const teamName = process.argv[4] || 'Test Team from EHA';

if (!config.apiKey || !config.secretKey) {
    console.error('ERROR: EXPOSURE_API_KEY and EXPOSURE_SECRET_KEY must be set in environment');
    process.exit(1);
}

if (!eventId || !divisionId) {
    console.error('Usage: node scripts/test-exposure-push.js <eventId> <divisionId> [teamName]');
    console.error('Example: node scripts/test-exposure-push.js 12345 1364274 "My Team"');
    process.exit(1);
}

console.log(`Testing Exposure API: Creating team "${teamName}" in Event ${eventId}, Division ${divisionId}\n`);
testCreateTeam(eventId, divisionId, teamName);
