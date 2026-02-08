
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function registerTeam() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB.');

        // 1. Find an Event with exposureId
        const eventRes = await client.query('SELECT id, name FROM events WHERE "exposureId" IS NOT NULL LIMIT 1');
        if (eventRes.rows.length === 0) {
            console.log('No Exposure Events found. Please sync events first.');
            return;
        }
        const event = eventRes.rows[0];
        console.log(`Found Event: ${event.name} (${event.id})`);

        // 2. Find a Team
        const teamRes = await client.query('SELECT id, name FROM teams LIMIT 1');
        if (teamRes.rows.length === 0) {
            console.log('No Teams found.');
            return;
        }
        const team = teamRes.rows[0];
        console.log(`Found Team: ${team.name} (${team.id})`);

        // 3. Check if already registered
        const checkRes = await client.query(
            'SELECT id FROM event_teams WHERE "eventId" = $1 AND "teamId" = $2',
            [event.id, team.id]
        );

        if (checkRes.rows.length > 0) {
            console.log('Team is already registered for this event.');
        } else {
            // 4. Register
            const id = crypto.randomUUID();
            await client.query(
                `INSERT INTO event_teams 
                (id, "eventId", "teamId", "registeredAt", "eventWins", "eventLosses", "pointsFor", "pointsAgainst") 
                VALUES ($1, $2, $3, NOW(), 0, 0, 0, 0)`,
                [id, event.id, team.id]
            );
            console.log(`Successfully registered ${team.name} for ${event.name}!`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

registerTeam();
