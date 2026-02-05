import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import prisma from '@/lib/prisma'

const POSITION_LABELS: Record<string, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
}

function formatHeight(feet: number | null, inches: number | null): string | null {
  if (feet == null) return null
  return `${feet}'${inches ?? 0}"`
}

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

    // Fetch player data for the Player Card
    const player = playerSlug
      ? await prisma.player.findUnique({
          where: { slug: playerSlug },
          select: {
            firstName: true,
            lastName: true,
            primaryPosition: true,
            heightFeet: true,
            heightInches: true,
            graduationYear: true,
            gpa: true,
            transcriptUrl: true,
            profilePhoto: true,
            teamRosters: {
              include: { team: { select: { name: true } } },
              orderBy: { joinedAt: 'desc' },
              take: 1,
            },
          },
        })
      : null

    const senderName = session.user.name || session.user.email
    const baseUrl = process.env.NEXTAUTH_URL || 'https://ehaconnect.com'
    const profileUrl = `${baseUrl}/players/${playerSlug}?recruit=true`

    // Build dynamic subject line
    const playerName = player ? `${player.firstName} ${player.lastName}` : null
    const positionLabel = player?.primaryPosition ? POSITION_LABELS[player.primaryPosition] || player.primaryPosition : null
    const teamName = player?.teamRosters?.[0]?.team?.name || null
    const classYear = player?.graduationYear ? `Class of ${player.graduationYear}` : null
    const height = player ? formatHeight(player.heightFeet, player.heightInches) : null

    const dynamicSubject = player
      ? `Recruit: ${playerName}${classYear ? ` (${player.graduationYear}` : ''}${positionLabel ? `${classYear ? ' ' : ' ('}${positionLabel})` : classYear ? ')' : ''} - ${teamName || 'EHA'}`
      : subject

    // Fallback photo: a simple placeholder initial circle (handled inline)
    const photoUrl = player?.profilePhoto || null
    const photoHtml = photoUrl
      ? `<img src="${photoUrl}" alt="${playerName}" width="64" height="64" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.2); display: block;" />`
      : `<div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #E31837, #a01128); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #ffffff; border: 2px solid rgba(255,255,255,0.2);">${player?.firstName?.[0] || 'P'}${player?.lastName?.[0] || ''}</div>`

    // Build subtext parts
    const subtextParts: string[] = []
    if (classYear) subtextParts.push(classYear)
    if (height) subtextParts.push(height)
    if (positionLabel) subtextParts.push(positionLabel)
    const subtext = subtextParts.join(' &bull; ')

    // Academic badge
    const academicBadge = player?.gpa
      ? `<span style="display: inline-block; font-size: 11px; font-weight: 700; color: #22c55e; background-color: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); padding: 4px 10px; border-radius: 12px; margin-left: 8px;">&#x2705; ${player.gpa.toFixed(1)} GPA</span>`
      : ''

    // Team badge
    const teamBadge = teamName
      ? `<span style="display: inline-block; font-size: 11px; font-weight: 700; color: #60a5fa; background-color: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.25); padding: 4px 10px; border-radius: 12px;">${teamName}</span>`
      : ''

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

                      ${player ? `
                      <!-- Player Card Header -->
                      <tr>
                        <td style="padding: 0;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
                            <tr>
                              <td style="padding: 28px 40px;">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <!-- Player Photo -->
                                    <td style="vertical-align: top; width: 64px; padding-right: 20px;">
                                      ${photoHtml}
                                    </td>
                                    <!-- Player Info -->
                                    <td style="vertical-align: top;">
                                      <p style="margin: 0 0 4px 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.2; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        ${playerName}
                                      </p>
                                      ${subtext ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #94a3b8; line-height: 1.4;">${subtext}</p>` : ''}
                                      <div>
                                        ${teamBadge}${academicBadge}
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}

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
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #153361; border: 0; border-radius: 8px;">
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
                      Reply directly to this email to respond to ${senderName}.
                    </p>
                    <p style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #3a4a6a;">
                      Elite Hoops Association
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
      subject: dynamicSubject,
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
