import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting seed...')

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@ehaconnect.com' },
  })

  if (existingAdmin) {
    console.log('Admin user already exists, skipping creation.')
  } else {
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 12)

    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@ehaconnect.com',
        name: 'System Admin',
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    })

    console.log(`Created admin user: ${admin.email}`)
  }

  console.log('Seed completed.')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
