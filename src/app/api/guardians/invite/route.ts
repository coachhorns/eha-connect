import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Get pending invites sent by user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invites = await prisma.guardianInvite.findMany({
      where: {
        invitedBy: session.user.id,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}

// POST - Send a co-parent invite
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playerId, email } = body

    if (!playerId || !email) {
      return NextResponse.json(
        { error: 'Player ID and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if user is PRIMARY guardian of this player
    const guardian = await prisma.guardian.findUnique({
      where: {
        userId_playerId: {
          userId: session.user.id,
          playerId,
        },
      },
    })

    if (!guardian || guardian.role !== 'PRIMARY') {
      return NextResponse.json(
        { error: 'Only primary guardians can send invites' },
        { status: 403 }
      )
    }

    // Check if invitee is already a guardian
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        guardians: {
          where: { playerId },
        },
      },
    })

    if (existingUser && existingUser.guardians.length > 0) {
      return NextResponse.json(
        { error: 'This user is already a guardian of this player' },
        { status: 400 }
      )
    }

    // Check for existing pending invite
    const existingInvite = await prisma.guardianInvite.findFirst({
      where: {
        email,
        playerId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 400 }
      )
    }

    // Get player info for the invite
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        firstName: true,
        lastName: true,
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Create the invite (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.guardianInvite.create({
      data: {
        email,
        playerId,
        invitedBy: session.user.id,
        role: 'SECONDARY',
        expiresAt,
      },
    })

    // TODO: Send email with invite link
    // For now, return the invite token for testing
    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${invite.token}`

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        expiresAt: invite.expiresAt,
        inviteUrl, // In production, this would be in the email only
      },
      message: `Invite sent to ${email}`,
    })
  } catch (error) {
    console.error('Error sending invite:', error)
    return NextResponse.json(
      { error: 'Failed to send invite' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel an invite
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      )
    }

    // Verify the invite belongs to the user
    const invite = await prisma.guardianInvite.findUnique({
      where: { id: inviteId },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.invitedBy !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own invites' },
        { status: 403 }
      )
    }

    await prisma.guardianInvite.delete({
      where: { id: inviteId },
    })

    return NextResponse.json({ success: true, message: 'Invite cancelled' })
  } catch (error) {
    console.error('Error cancelling invite:', error)
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    )
  }
}
