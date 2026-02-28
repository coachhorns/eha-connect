import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'
import { sendEmail, buildInviteEmail } from '@/lib/email'
import { GuardianRole } from '@prisma/client'

// GET - Get pending invites sent by user
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invites = await prisma.guardianInvite.findMany({
      where: {
        invitedBy: user.id,
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
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playerId, email, type } = body

    if (!playerId || !email) {
      return NextResponse.json(
        { error: 'Player ID and email are required' },
        { status: 400 }
      )
    }

    const inviteType: 'PARENT' | 'PLAYER' = type === 'PLAYER' ? 'PLAYER' : 'PARENT'

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
          userId: user.id,
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

    // Get player info for the invite (must be active)
    const player = await prisma.player.findFirst({
      where: { id: playerId, isActive: true },
      select: {
        firstName: true,
        lastName: true,
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Check for existing pending invite
    const existingInvite = await prisma.guardianInvite.findFirst({
      where: {
        email,
        playerId,
        acceptedAt: null,
      },
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    // Use string literal to avoid potential stale Enum object issues
    const role = inviteType === 'PLAYER' ? 'PLAYER' as GuardianRole : 'SECONDARY' as GuardianRole

    let invite

    if (existingInvite) {
      // Update existing invite
      invite = await prisma.guardianInvite.update({
        where: { id: existingInvite.id },
        data: {
          expiresAt,
          role, // Allow role update if needed
          invitedBy: user.id, // Update inviter to current user
        },
      })
      console.log(`[Invite] Updated existing invite ${invite.id} for ${email}`)
    } else {
      // Create new invite
      invite = await prisma.guardianInvite.create({
        data: {
          email,
          playerId,
          invitedBy: user.id,
          role,
          expiresAt,
        },
      })
      console.log(`[Invite] Created new invite ${invite.id} for ${email}`)
    }

    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${invite.token}`
    const playerFullName = `${player.firstName} ${player.lastName}`

    // Build and send the email
    const { subject, html } = buildInviteEmail({
      type: inviteType,
      playerName: playerFullName,
      inviteUrl,
    })

    const emailResult = await sendEmail({ to: email, subject, html })

    if (!emailResult.success) {
      console.warn(`[Invite] Email delivery failed for ${email}: ${emailResult.error}`)
      console.log(`[DEV] Manual Invite Link: ${inviteUrl}`)
    } else {
      console.log(`[Invite] Email sent to ${email}. Link: ${inviteUrl}`)
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        expiresAt: invite.expiresAt,
        type: inviteType,
        emailSent: emailResult.success,
      },
      message: emailResult.success
        ? `Invite sent to ${email}`
        : `Invite created but email failed: ${emailResult.error}`,
    })
  } catch (error) {
    console.error('Error sending invite:', error)
    return NextResponse.json(
      { error: `Failed to send invite: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}

// DELETE - Cancel an invite
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
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

    if (invite.invitedBy !== user.id) {
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
