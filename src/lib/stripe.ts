import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export const SUBSCRIPTION_PRICES = {
  ANNUAL: process.env.STRIPE_PRICE_ANNUAL!,
  SEMI_ANNUAL: process.env.STRIPE_PRICE_SEMI_ANNUAL!,
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY!,
}

export const PRICE_AMOUNTS = {
  ANNUAL: 7500, // $75.00
  SEMI_ANNUAL: 5000, // $50.00
  MONTHLY: 1000, // $10.00
}
