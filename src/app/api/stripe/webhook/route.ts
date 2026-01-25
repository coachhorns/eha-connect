import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripeServer, getStripeWebhookSecret } from '@/lib/stripe-dynamic'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Get Stripe client and webhook secret from database settings
  const stripe = await getStripeServer()
  const webhookSecret = await getStripeWebhookSecret()

  if (!webhookSecret) {
    console.error('Stripe webhook secret is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan as 'ANNUAL' | 'SEMI_ANNUAL' | 'MONTHLY'
        const childCount = parseInt(session.metadata?.childCount || '1') || 1

        if (!userId || !plan) break

        // Get subscription details
        const subscriptionResponse = await stripe.subscriptions.retrieve(
          session.subscription as string
        )
        const subscription = subscriptionResponse as Stripe.Subscription

        // Create or update subscription in database
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: 'ACTIVE',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            childCount,
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
          update: {
            plan,
            status: 'ACTIVE',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            childCount,
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscriptionData = event.data.object as any
        const stripeCustomerId = subscriptionData.customer as string

        // Find subscription by Stripe customer ID
        const existingSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId },
        })

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: subscriptionData.status === 'active' ? 'ACTIVE' :
                      subscriptionData.status === 'past_due' ? 'PAST_DUE' :
                      subscriptionData.status === 'canceled' ? 'CANCELED' : 'EXPIRED',
              currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
              currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
              cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object as any
        const stripeCustomerId = deletedSub.customer as string

        const existingSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId },
        })

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: 'CANCELED',
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeCustomerId = invoice.customer as string

        const existingSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId },
        })

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: 'PAST_DUE',
            },
          })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
