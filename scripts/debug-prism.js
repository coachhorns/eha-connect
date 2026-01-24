
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- START DEBUG ---')
    console.log('Connecting to DB...')
    try {
        const count = await prisma.program.count()
        console.log('Current program count:', count)

        console.log('Attempting create...')
        const program = await prisma.program.create({
            data: {
                name: 'Debug Test ' + Date.now(),
                slug: 'debug-' + Date.now(),
                logo: 'https://example.com/logo.png',
                directorName: 'Debug Director',
            },
        })
        console.log('SUCCESS:', program)
    } catch (error) {
        console.error('FAILURE:')
        console.error(error)
        if (error.code) console.error('Error Code:', error.code)
        if (error.meta) console.error('Error Meta:', error.meta)
    } finally {
        await prisma.$disconnect()
        console.log('--- END DEBUG ---')
    }
}

main()
