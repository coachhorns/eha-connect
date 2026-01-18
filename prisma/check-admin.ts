import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Checking for admin user...\n')

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@ehaconnect.com' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
      emailVerified: true,
      createdAt: true,
    },
  })

  if (!admin) {
    console.log('❌ Admin user NOT FOUND in database')
  } else {
    console.log('✓ Admin user found:')
    console.log(`  - ID: ${admin.id}`)
    console.log(`  - Email: ${admin.email}`)
    console.log(`  - Name: ${admin.name}`)
    console.log(`  - Role: ${admin.role}`)
    console.log(`  - Password hash set: ${admin.password ? 'YES' : 'NO'}`)
    console.log(`  - Email verified: ${admin.emailVerified ? 'YES' : 'NO'}`)
    console.log(`  - Created at: ${admin.createdAt}`)
  }

  // Also check total user count
  const userCount = await prisma.user.count()
  console.log(`\nTotal users in database: ${userCount}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
