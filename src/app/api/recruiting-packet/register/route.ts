import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getStripeServer, getStripeConnectId } from '@/lib/stripe-dynamic'
import { getPacketPrice } from '@/lib/constants'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      eventId,
      firstName,
      lastName,
      school,
      email,
      division,
      collegeCoachId,
      collegeId,
      wantsPhysicalCopy,
    } = body

    // Validate required fields
    if (!eventId || !firstName || !lastName || !school || !email || !division) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate .edu email
    const emailDomain = email.split('@')[1]?.toLowerCase() || ''
    if (!emailDomain.endsWith('.edu')) {
      return NextResponse.json(
        { error: 'A valid .edu email address is required' },
        { status: 400 }
      )
    }

    // Validate event exists and is NCAA certified
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, slug: true, isNcaaCertified: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.isNcaaCertified) {
      return NextResponse.json(
        { error: 'This event is not NCAA certified' },
        { status: 400 }
      )
    }

    // Determine price based on division
    const amountInCents = getPacketPrice(division)
    const amountInDollars = amountInCents / 100

    // Check for existing registration (reuse PENDING if exists)
    let registration = await prisma.eventCollegeRegistration.findUnique({
      where: { eventId_email: { eventId, email: email.toLowerCase() } },
    })

    if (registration?.paymentStatus === 'COMPLETED') {
      return NextResponse.json(
        { error: 'You have already purchased a recruiting packet for this event' },
        { status: 400 }
      )
    }

    // Create or update registration
    if (registration) {
      registration = await prisma.eventCollegeRegistration.update({
        where: { id: registration.id },
        data: {
          firstName,
          lastName,
          school,
          division,
          amountPaid: amountInDollars,
          wantsPhysicalCopy: wantsPhysicalCopy ?? false,
          ...(collegeCoachId && { collegeCoachId }),
          ...(collegeId && { collegeId }),
        },
      })
    } else {
      registration = await prisma.eventCollegeRegistration.create({
        data: {
          eventId,
          firstName,
          lastName,
          school,
          email: email.toLowerCase(),
          division,
          amountPaid: amountInDollars,
          wantsPhysicalCopy: wantsPhysicalCopy ?? false,
          ...(collegeCoachId && { collegeCoachId }),
          ...(collegeId && { collegeId }),
        },
      })
    }

    // Create Stripe Checkout session
    const stripe = await getStripeServer()
    const connectId = await getStripeConnectId()

    const sessionConfig: any = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountInCents,
            product_data: {
              name: `College Recruiting Packet - ${event.name}`,
              description: `${division} — access to rosters, player info, coach emails, and live stats`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'recruiting_packet',
        eventId,
        registrationId: registration.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}?packet=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}?packet=cancelled`,
    }

    // Apply Stripe Connect split if configured
    if (connectId) {
      sessionConfig.payment_intent_data = {
        transfer_data: {
          destination: connectId,
          amount: Math.round(amountInCents * 0.6),
        },
      }
    }

    let checkoutSession
    try {
      checkoutSession = await stripe.checkout.sessions.create(sessionConfig)
    } catch (connectError: any) {
      if (connectId && connectError?.code === 'insufficient_capabilities_for_transfer') {
        delete sessionConfig.payment_intent_data
        checkoutSession = await stripe.checkout.sessions.create(sessionConfig)
      } else {
        throw connectError
      }
    }

    // Store Stripe session ID
    await prisma.eventCollegeRegistration.update({
      where: { id: registration.id },
      data: { stripeSessionId: checkoutSession.id },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error creating recruiting packet checkout:', message, error)
    return NextResponse.json(
      { error: message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
