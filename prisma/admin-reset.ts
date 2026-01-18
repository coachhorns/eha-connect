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
  const email = 'admin@ehaconnect.com'
  const password = 'password123'

  console.log(`Resetting admin user: ${email}\n`)

  // Generate new password hash
  const hashedPassword = await bcrypt.hash(password, 12)
  console.log('✓ Generated new password hash')

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    // Update existing user
    const updated = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    })
    console.log(`✓ Updated existing user: ${updated.email}`)
    console.log(`  - Role set to: ADMIN`)
    console.log(`  - Password reset to: ${password}`)
  } else {
    // Create new user
    const created = await prisma.user.create({
      data: {
        email,
        name: 'System Admin',
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    })
    console.log(`✓ Created new admin user: ${created.email}`)
    console.log(`  - Role: ADMIN`)
    console.log(`  - Password: ${password}`)
  }

  console.log('\n========================================')
  console.log('Admin credentials:')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log('========================================')
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
