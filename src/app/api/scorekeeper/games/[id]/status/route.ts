import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== 'SCOREKEEPER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { status, homeScore, awayScore, currentPeriod } = await request.json()

    const updateData: any = {}

    if (status) {
      updateData.status = status
    }

    if (currentPeriod !== undefined) {
      updateData.currentPeriod = currentPeriod
    }

    if (status === 'IN_PROGRESS') {
      updateData.startedAt = new Date()
      updateData.currentPeriod = 1
    }

    if (status === 'FINAL') {
      updateData.endedAt = new Date()
      updateData.isOfficial = true
      if (homeScore !== undefined) updateData.homeScore = homeScore
      if (awayScore !== undefined) updateData.awayScore = awayScore

      // Update team records
      const game = await prisma.game.findUnique({
        where: { id },
        select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
      })

      if (game) {
        const finalHomeScore = homeScore ?? game.homeScore
        const finalAwayScore = awayScore ?? game.awayScore

        if (finalHomeScore > finalAwayScore) {
          await prisma.team.update({
            where: { id: game.homeTeamId },
            data: { wins: { increment: 1 } },
          })
          await prisma.team.update({
            where: { id: game.awayTeamId },
            data: { losses: { increment: 1 } },
          })
        } else if (finalAwayScore > finalHomeScore) {
          await prisma.team.update({
            where: { id: game.awayTeamId },
            data: { wins: { increment: 1 } },
          })
          await prisma.team.update({
            where: { id: game.homeTeamId },
            data: { losses: { increment: 1 } },
          })
        }
      }
    }

    const game = await prisma.game.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ game })
  } catch (error) {
    console.error('Error updating game status:', error)
    return NextResponse.json({ error: 'Failed to update game status' }, { status: 500 })
  }
}
