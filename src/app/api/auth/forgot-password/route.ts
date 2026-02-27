import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail, buildPasswordResetEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: 'If an account with that email exists, we sent a password reset link.',
    })

    // Look up user — only proceed if they have a password (not Google-only)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, password: true },
    })

    if (!user || !user.password) {
      return successResponse
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    })

    // Create new token with 1-hour expiry
    const resetToken = await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    // Build reset URL and send email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://ehaconnect.com'
    const resetUrl = `${baseUrl}/auth/reset-password/${resetToken.token}`

    const { subject, html } = buildPasswordResetEmail({ resetUrl })
    await sendEmail({ to: user.email, subject, html })

    return successResponse
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
