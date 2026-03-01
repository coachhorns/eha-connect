import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')

    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }

    const guardian = await prisma.guardian.findUnique({
      where: { userId_playerId: { userId: user.id, playerId } },
    })

    if (!guardian) {
      return NextResponse.json(
        { error: 'Guardian relationship not found' },
        { status: 404 }
      )
    }

    const guardianCount = await prisma.guardian.count({ where: { playerId } })
    const isLastGuardian = guardianCount === 1

    await prisma.guardian.delete({
      where: { userId_playerId: { userId: user.id, playerId } },
    })

    if (isLastGuardian) {
      await prisma.player.updateMany({
        where: { id: playerId, userId: user.id },
        data: { userId: null },
      })
    }

    return NextResponse.json({
      success: true,
      wasLastGuardian: isLastGuardian,
      message: isLastGuardian
        ? 'You have been unlinked. This player now has no guardians.'
        : 'You have been unlinked from this player.',
    })
  } catch (error) {
    console.error('Error unlinking guardian:', error)
    return NextResponse.json(
      { error: 'Failed to unlink' },
      { status: 500 }
    )
  }
}
