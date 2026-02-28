import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const subjectLabels: Record<string, string> = {
  general: 'General Inquiry',
  billing: 'Billing & Subscriptions',
  technical: 'Technical Support',
  recruiting: 'Recruiting Questions',
  events: 'Event Information',
  privacy: 'Privacy / Data Request',
}

export async function POST(request: Request) {
  try {
    const { name, email, subject, message, _hp } = await request.json()

    // Honeypot — if filled, return fake success (bots won't know)
    if (_hp) {
      return NextResponse.json(
        { success: true, message: 'Message sent successfully!' },
        { status: 200 }
      )
    }

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a more detailed message (at least 10 characters)' },
        { status: 400 }
      )
    }

    const subjectLabel = subjectLabels[subject] || subject

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0a1628; color: #e5e7eb; border-radius: 8px;">
        <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 24px;">New Contact Form Submission</h1>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #9ca3af; width: 100px;">Name:</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: bold;">${name.trim()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9ca3af;">Email:</td>
            <td style="padding: 8px 0; color: #ffffff;">${email.trim()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9ca3af;">Category:</td>
            <td style="padding: 8px 0; color: #ffffff;">${subjectLabel}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
        <h3 style="color: #ffffff; font-size: 16px; margin-bottom: 8px;">Message:</h3>
        <p style="line-height: 1.6; white-space: pre-wrap; color: #e5e7eb;">${message.trim()}</p>
        <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Sent from EHA Connect Contact Form</p>
      </div>
    `

    const result = await sendEmail({
      to: 'john@ehacircuit.com',
      subject: `[Contact Form] ${subjectLabel} — ${name.trim()}`,
      html,
      replyTo: email.trim(),
    })

    if (!result.success) {
      console.error('[Contact] Email send failed:', result.error)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Message sent successfully!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
