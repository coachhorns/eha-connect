
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const verifiedCount = await prisma.player.count({
            where: { isVerified: true }
        })
        console.log('Verified Players Count:', verifiedCount)

        const allCount = await prisma.player.count()
        console.log('Total Players Count:', allCount)

        if (verifiedCount === 0 && allCount > 0) {
            console.log('No players are verified. Verifying the first player for testing...')
            const firstPlayer = await prisma.player.findFirst()
            if (firstPlayer) {
                await prisma.player.update({
                    where: { id: firstPlayer.id },
                    data: { isVerified: true }
                })
                console.log(`Verified player: ${firstPlayer.firstName} ${firstPlayer.lastName}`)
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
