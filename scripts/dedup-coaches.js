const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const coaches = await prisma.collegeCoach.findMany({ orderBy: { createdAt: 'asc' } });
  const seen = new Set();
  const dupeIds = [];

  for (const c of coaches) {
    const key = `${c.collegeId}|${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`;
    if (seen.has(key)) {
      dupeIds.push(c.id);
    } else {
      seen.add(key);
    }
  }

  console.log('Total coaches:', coaches.length);
  console.log('Duplicates to remove:', dupeIds.length);

  if (dupeIds.length > 0) {
    // Delete in batches of 1000 to avoid query size limits
    for (let i = 0; i < dupeIds.length; i += 1000) {
      const batch = dupeIds.slice(i, i + 1000);
      const result = await prisma.collegeCoach.deleteMany({
        where: { id: { in: batch } },
      });
      console.log(`Batch ${Math.floor(i / 1000) + 1}: deleted ${result.count}`);
    }
  }

  console.log('Remaining:', coaches.length - dupeIds.length);
  await prisma.$disconnect();
  await pool.end();
}

main();
