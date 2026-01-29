import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendEmail, buildInviteAcceptedEmail } from '@/lib/email'

// GET - Get invite details by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.guardianInvite.findUnique({
      where: { token },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
            profilePhoto: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired', expired: true },
        { status: 410 }
      )
    }

    // Check if already accepted
    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'This invite has already been used', accepted: true },
        { status: 400 }
      )
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        player: invite.player,
        inviter: invite.inviter,
      },
    })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invite details' },
      { status: 500 }
    )
  }
}

// POST - Accept the invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Please sign in to accept this invite', requiresAuth: true },
        { status: 401 }
      )
    }

    const { token } = await params

    const invite = await prisma.guardianInvite.findUnique({
      where: { token },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      )
    }

    // Check if already accepted
    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'This invite has already been used' },
        { status: 400 }
      )
    }

    // Check if user is already a guardian
    const existingGuardian = await prisma.guardian.findUnique({
      where: {
        userId_playerId: {
          userId: session.user.id,
          playerId: invite.playerId,
        },
      },
    })

    if (existingGuardian) {
      // Mark invite as accepted even if already guardian
      await prisma.guardianInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        alreadyGuardian: true,
        message: 'You are already a guardian of this player',
        player: invite.player,
      })
    }

    // Create guardian record and mark invite as accepted
    const [guardian] = await prisma.$transaction([
      prisma.guardian.create({
        data: {
          userId: session.user.id,
          playerId: invite.playerId,
          role: invite.role,
          isPayer: false,
        },
      }),
      prisma.guardianInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ])

    // Send notification email to inviter
    if (invite.inviter?.email) {
      try {
        const inviterName = invite.inviter.name || 'Parent'
        const accepterName = session.user.name || 'A user'
        const playerName = `${invite.player.firstName} ${invite.player.lastName}`

        const { subject, html } = buildInviteAcceptedEmail({
          inviterName,
          accepterName,
          playerName,
        })

        // Log for debugging
        console.log(`[Invite] Sending acceptance email to ${invite.inviter.email}`)

        await sendEmail({
          to: invite.inviter.email,
          subject,
          html,
        })
      } catch (emailError) {
        console.error('Error sending acceptance notification:', emailError)
        // Non-blocking error
      }
    }

    return NextResponse.json({
      success: true,
      guardian,
      player: invite.player,
      message: `You are now a ${invite.role.toLowerCase()} guardian of ${invite.player.firstName} ${invite.player.lastName}`,
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}
