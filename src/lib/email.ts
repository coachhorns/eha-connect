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

export function buildPasswordResetEmail({ resetUrl }: { resetUrl: string }) {
  const subject = 'Reset your EHA Connect password'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="color-scheme" content="light only">
      <meta name="supported-color-schemes" content="light only">
      <style>
        :root { color-scheme: light only; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f1f5f9" style="background-color: #f1f5f9;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 0 24px 28px;">
                  <img src="https://ehaconnect.com/images/overall.png" alt="Elite Hoops Association" width="120" style="display: block; max-width: 120px; height: auto;" />
                </td>
              </tr>
              <!-- Card -->
              <tr>
                <td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                    <!-- Red accent bar -->
                    <tr>
                      <td bgcolor="#E31837" style="background-color: #E31837; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    <!-- Body content -->
                    <tr>
                      <td style="padding: 40px 36px 32px;">
                        <h1 style="font-family: 'Segoe UI', Arial, sans-serif; color: #0F172A; font-size: 26px; font-weight: 700; margin: 0 0 20px 0; letter-spacing: -0.3px;">Reset Your Password</h1>
                        <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #334155; font-size: 15px; line-height: 1.7; margin: 0 0 12px 0;">
                          We received a request to reset the password for your EHA Connect account.
                        </p>
                        <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #334155; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">
                          Click the button below to set a new password. This link will expire in <strong style="color: #0F172A;">1 hour</strong>.
                        </p>
                        <!-- Button -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding-bottom: 32px;">
                              <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td align="center" bgcolor="#E31837" style="background-color: #E31837; border-radius: 8px;">
                                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 1.5px; text-transform: uppercase;">RESET PASSWORD</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
                          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 36px;">
                  <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                    &copy; ${new Date().getFullYear()} Elite Hoops Association. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
  return { subject, html }
}
