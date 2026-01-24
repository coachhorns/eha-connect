
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Attempting to connect to database...')
    try {
        const program = await prisma.program.create({
            data: {
                name: 'Debug Program ' + Date.now(),
                slug: 'debug-program-' + Date.now(),
                logo: 'https://example.com/logo.png',
                directorName: 'Debug Director',
            },
        })
        console.log('SUCCESS: Created program:', program)
    } catch (error) {
        console.error('FAILURE: Error creating program:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
