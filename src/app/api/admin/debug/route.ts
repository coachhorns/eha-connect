
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const { count } = await prisma.game.updateMany({
            where: {
                courtId: null,
                status: { not: 'SCHEDULED' }
            },
            data: {
                status: 'SCHEDULED'
            }
        })

        return NextResponse.json({
            success: true,
            updated: count
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
