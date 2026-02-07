import { Resend } from 'resend'

let resend: Resend | null = null

function getResendClient() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string
  subject: string
  html: string
  replyTo?: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email send')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const client = getResendClient()
    // Ensure this matches the verified domain in Resend
    const from = process.env.EMAIL_FROM || 'EHA Connect <noreply@ehaconnect.com>'

    const { data, error } = await client.emails.send({
      from,
      to,
      subject,
      html,
      ...(replyTo && { replyTo }),
    })

    if (error) {
      console.error('[Email] Resend API error:', JSON.stringify(error))
      return { success: false, error: error.message }
    }

    console.log(`[Email] Sent to ${to}, id: ${data?.id}`)
    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Email] Unexpected error:', message)
    return { success: false, error: message }
  }
}

export function buildInviteEmail({
  type,
  playerName,
  inviteUrl,
}: {
  type: 'PARENT' | 'PLAYER'
  playerName: string
  inviteUrl: string
}) {
  if (type === 'PLAYER') {
    return {
      subject: 'Claim your Athlete Profile on EHA Connect',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1628; color: #e5e7eb; padding: 32px; border-radius: 8px;">
          <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 16px;">Claim Your Athlete Profile</h1>
          <p style="margin-bottom: 16px; line-height: 1.6;">
            Your parent has invited you to claim your profile for <strong style="color: #ffffff;">${playerName}</strong> on EHA Connect.
          </p>
          <p style="margin-bottom: 24px; line-height: 1.6;">
            Create an account to update your Bio, Socials, and Upload Highlights.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Accept Invite
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
            This invite expires in 7 days. If you didn't expect this email, you can ignore it.
          </p>
        </div>
      `,
    }
  }

  return {
    subject: `You've been invited to manage ${playerName} on EHA Connect`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1628; color: #e5e7eb; padding: 32px; border-radius: 8px;">
        <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 16px;">You're Invited!</h1>
        <p style="margin-bottom: 16px; line-height: 1.6;">
          You've been invited to view and manage the profile for <strong style="color: #ffffff;">${playerName}</strong> on EHA Connect.
        </p>
        <p style="margin-bottom: 24px; line-height: 1.6;">
          Gain access to view stats, schedule, and manage the profile.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Accept Invite
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
          This invite expires in 7 days. If you didn't expect this email, you can ignore it.
        </p>
      </div>
    `,
  }
}

export function buildInviteAcceptedEmail({
  inviterName,
  accepterName,
  playerName,
}: {
  inviterName: string
  accepterName: string
  playerName: string
}) {
  const subject = `${accepterName} accepted your invite to manage ${playerName}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1628; color: #e5e7eb; padding: 32px; border-radius: 8px;">
      <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 16px;">Invite Accepted</h1>
      <p style="margin-bottom: 16px; line-height: 1.6;">
        Hello <strong style="color: #ffffff;">${inviterName}</strong>,
      </p>
      <p style="margin-bottom: 24px; line-height: 1.6;">
        <strong style="color: #ffffff;">${accepterName}</strong> has accepted your invitation to manage <strong style="color: #ffffff;">${playerName}</strong>'s profile on EHA Connect.
      </p>
      <p style="margin-bottom: 24px; line-height: 1.6; color: #9ca3af;">
        They now have access to update the player's bio, social links, and media highlights.
      </p>
      <div style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          View Dashboard
        </a>
      </div>
      <p style="margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center;">
        &copy; ${new Date().getFullYear()} Elite Hoop Ambitions. All rights reserved.
      </p>
    </div>
  `
  return { subject, html }
}
