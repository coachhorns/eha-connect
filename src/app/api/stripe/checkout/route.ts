import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripeServer, getStripeConnectId } from '@/lib/stripe-dynamic'
import { calculateFamilyPrice, familyPricing } from '@/lib/constants'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, childCount = 1 } = await request.json()

    if (!plan || !['ANNUAL', 'SEMI_ANNUAL', 'MONTHLY'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Validate childCount
    const validChildCount = Math.min(Math.max(1, parseInt(childCount) || 1), 10)

    // Get Stripe client and Connect ID from database settings
    const stripe = await getStripeServer()
    const connectId = await getStripeConnectId()

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    if (existingSubscription?.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let stripeCustomerId = existingSubscription?.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      })
      stripeCustomerId = customer.id
    }

    // Calculate total price based on family plan
    const totalPriceInCents = calculateFamilyPrice(
      plan as 'ANNUAL' | 'SEMI_ANNUAL' | 'MONTHLY',
      validChildCount
    )

    // Determine billing interval
    const intervalMap = {
      ANNUAL: { interval: 'year' as const, interval_count: 1 },
      SEMI_ANNUAL: { interval: 'month' as const, interval_count: 6 },
      MONTHLY: { interval: 'month' as const, interval_count: 1 },
    }

    const billingInterval = intervalMap[plan as keyof typeof intervalMap]

    // Create a price for this specific configuration
    const price = await stripe.prices.create({
      unit_amount: totalPriceInCents,
      currency: 'usd',
      recurring: billingInterval,
      product_data: {
        name: `EHA Connect ${plan.replace('_', '-')} Plan${validChildCount > 1 ? ` (${validChildCount} Players)` : ''}`,
        metadata: {
          plan,
          childCount: validChildCount.toString(),
        },
      },
      metadata: {
        plan,
        childCount: validChildCount.toString(),
      },
    })

    // Create Stripe checkout session
    // Explicitly type the config to allow extension with transfer_data
    const sessionConfig: any = {
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?subscription=cancelled`,
      metadata: {
        userId: session.user.id,
        plan,
        childCount: validChildCount.toString(),
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          plan,
          childCount: validChildCount.toString(),
        },
      },
    }

    // Apply Split Payment (Stripe Connect) if Connect ID is configured
    // Try with transfer_data first; if the connected account isn't ready, retry without it
    if (connectId) {
      sessionConfig.subscription_data.transfer_data = {
        destination: connectId,
        amount_percent: 60,
      }
    }

    // Log ToS acceptance for checkout
    await prisma.tosAcceptance.create({
      data: {
        userId: session.user.id,
        touchpoint: 'checkout',
      },
    })

    let checkoutSession
    try {
      checkoutSession = await stripe.checkout.sessions.create(sessionConfig)
    } catch (connectError: any) {
      if (connectId && connectError?.code === 'insufficient_capabilities_for_transfer') {
        console.warn(`Connect account ${connectId} not ready for transfers. Proceeding without split payment.`)
        delete sessionConfig.subscription_data.transfer_data
        checkoutSession = await stripe.checkout.sessions.create(sessionConfig)
      } else {
        throw connectError
      }
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error creating checkout session:', message, error)
    return NextResponse.json(
      { error: message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
