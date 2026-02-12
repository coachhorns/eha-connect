import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('=== Division + AgeGroup Data Migration ===\n')

  // --- TEAMS ---
  console.log('Migrating teams...')
  const teams = await prisma.$queryRaw<any[]>`
    SELECT id, division, "ageGroup" FROM teams WHERE "ageGroup" IS NOT NULL OR division IS NOT NULL
  `
  console.log(`Found ${teams.length} teams to check`)

  for (const team of teams) {
    const oldDiv = team.division?.trim() || null
    const oldAge = team.ageGroup?.trim() || null
    let newDiv: string | null = null

    if (oldDiv && oldAge) {
      const ageNum = parseInt(oldAge.replace('U', ''), 10)

      if (oldDiv === 'EPL' && ageNum >= 15) {
        // EPL + 17U -> "EPL 17"
        newDiv = `EPL ${ageNum}`
      } else if (['Gold', 'Silver', 'Bronze'].includes(oldDiv) && ageNum >= 15) {
        // Gold/Silver 15-17U -> just the age group (lower tier has no label)
        newDiv = oldAge
      } else if (['Gold', 'Silver', 'Bronze'].includes(oldDiv) && ageNum <= 14) {
        // Gold + 14U -> "14U Gold"
        newDiv = `${oldAge} ${oldDiv}`
      } else {
        // Other combos: just concat
        newDiv = `${oldAge} ${oldDiv}`
      }
    } else if (oldAge && !oldDiv) {
      // Only age group, no division -> use age as division
      newDiv = oldAge
    } else if (oldDiv && !oldAge) {
      // Only division, no age group -> keep as-is
      newDiv = oldDiv
    }

    if (newDiv && newDiv !== oldDiv) {
      await prisma.$executeRaw`UPDATE teams SET division = ${newDiv} WHERE id = ${team.id}`
      console.log(`  Team ${team.id}: "${oldDiv}" + "${oldAge}" -> "${newDiv}"`)
    }
  }

  // --- GAMES ---
  console.log('\nMigrating games...')
  const games = await prisma.$queryRaw<any[]>`
    SELECT id, division, "ageGroup" FROM games WHERE "ageGroup" IS NOT NULL
  `
  console.log(`Found ${games.length} games with ageGroup`)

  for (const game of games) {
    const oldDiv = game.division?.trim() || null
    const oldAge = game.ageGroup?.trim() || null

    // Games synced from Exposure already have correct division names
    // Only update if division is null/old-format and ageGroup exists
    if (oldAge && !oldDiv) {
      await prisma.$executeRaw`UPDATE games SET division = ${oldAge} WHERE id = ${game.id}`
      console.log(`  Game ${game.id}: NULL + "${oldAge}" -> "${oldAge}"`)
    } else if (oldAge && oldDiv) {
      // If division already looks like an Exposure combined name (e.g. "EPL 17"), skip
      if (/^\d+U/.test(oldDiv) || /^EPL \d+/.test(oldDiv)) {
        console.log(`  Game ${game.id}: "${oldDiv}" already combined format, skipping`)
        continue
      }
      // Otherwise combine same as teams
      const ageNum = parseInt(oldAge.replace('U', ''), 10)
      let newDiv: string
      if (oldDiv === 'EPL' && ageNum >= 15) {
        newDiv = `EPL ${ageNum}`
      } else if (['Gold', 'Silver', 'Bronze'].includes(oldDiv) && ageNum >= 15) {
        newDiv = oldAge
      } else if (['Gold', 'Silver', 'Bronze'].includes(oldDiv) && ageNum <= 14) {
        newDiv = `${oldAge} ${oldDiv}`
      } else {
        newDiv = `${oldAge} ${oldDiv}`
      }
      await prisma.$executeRaw`UPDATE games SET division = ${newDiv} WHERE id = ${game.id}`
      console.log(`  Game ${game.id}: "${oldDiv}" + "${oldAge}" -> "${newDiv}"`)
    }
  }

  // --- EVENTS ---
  console.log('\nMigrating events...')
  // Clear ageGroups and divisions arrays - admins will reconfigure
  const eventCount = await prisma.$executeRaw`UPDATE events SET divisions = '{}'`
  console.log(`Cleared divisions on ${eventCount} events (admins will reconfigure)`)

  console.log('\n=== Migration complete! ===')
  console.log('Now run: npx prisma db push')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Migration failed:', e)
    prisma.$disconnect()
    process.exit(1)
  })
