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

    const baseUrl = process.env.NEXTAUTH_URL || 'https://ehaconnect.com'
    const profileUrl = `${baseUrl}/players/${playerSlug}?recruit=true`

    const sanitizedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
      <body style="margin: 0; padding: 0; background-color: #0D2B5B; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D2B5B;">
          <tr>
            <td align="center" style="padding: 48px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Logo Header -->
                <tr>
                  <td align="center" style="padding: 0 0 40px 0;">
                    <img src="${baseUrl}/logo.png" alt="EHA Connect" style="height: 44px; display: block;" />
                  </td>
                </tr>

                <!-- Eyebrow Label -->
                <tr>
                  <td align="center" style="padding: 0 0 16px 0;">
                    <span style="display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #E31837; background-color: #153361; border: 1px solid #1a3a6e; padding: 6px 16px; border-radius: 20px;">
                      Recruiting Interest
                    </span>
                  </td>
                </tr>

                <!-- Main Card -->
                <tr>
                  <td>
                    <!-- Red Top Accent -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="height: 4px; background: linear-gradient(to right, #E31837, #a01128); border-radius: 12px 12px 0 0;"></td></tr>
                    </table>
                    <!-- Card Body -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 0 0 12px 12px;">
                      <tr>
                        <td style="padding: 44px 40px 40px 40px;">
                          <!-- Message -->
                          <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.75; color: #374151; white-space: pre-line; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${sanitizedMessage}</p>

                          <!-- Divider -->
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                            <tr><td style="height: 1px; background-color: #E2E8F0;"></td></tr>
                          </table>

                          <!-- CTA Button -->
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="background: linear-gradient(to right, #E31837, #a01128); border-radius: 6px; box-shadow: 0 4px 14px rgba(227, 24, 55, 0.25);">
                                      <a href="${profileUrl}" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        View Player Profile
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Powered By Bar -->
                <tr>
                  <td style="padding: 32px 0 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #153361; border: 1px solid #1a3a6e; border-radius: 8px;">
                      <tr>
                        <td style="padding: 20px 24px; text-align: center;">
                          <p style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #A2AAAD;">
                            Powered by <a href="${baseUrl}" style="color: #E31837; text-decoration: none; font-weight: 800;">EHA Connect</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 0 0 0; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; color: #5a6a8a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                      Reply directly to this email to respond to the sender.
                    </p>
                    <p style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #3a4a6a;">
                      Elite Hoops Academy &bull; Empowering Athletes
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
