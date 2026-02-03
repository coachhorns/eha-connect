import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { coachEmail, coachName, playerSlug, subject, message } = await request.json()

    if (!coachEmail || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const profileUrl = `${process.env.NEXTAUTH_URL || 'https://ehaconnect.com'}/players/${playerSlug}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1628; color: #e5e7eb; padding: 32px; border-radius: 8px;">
        <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <img src="${process.env.NEXTAUTH_URL || 'https://ehaconnect.com'}/eha-logo.png" alt="EHA Connect" style="height: 32px;" />
        </div>
        <div style="white-space: pre-line; line-height: 1.6; margin-bottom: 24px;">
          ${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
          <a href="${profileUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            View Player Profile
          </a>
        </div>
        <p style="margin-top: 24px; font-size: 11px; color: #6b7280;">
          This email was sent via <a href="${process.env.NEXTAUTH_URL || 'https://ehaconnect.com'}" style="color: #6b7280;">EHA Connect</a>.
          Reply directly to respond to the sender.
        </p>
      </div>
    `

    const result = await sendEmail({
      to: coachEmail,
      subject,
      html,
      replyTo: session.user.email,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (error: any) {
    console.error('Error sending recruiting email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
