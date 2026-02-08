import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

export const SUBSCRIPTION_PRICES = {
  ANNUAL: process.env.STRIPE_PRICE_ANNUAL!,
  SEMI_ANNUAL: process.env.STRIPE_PRICE_SEMI_ANNUAL!,
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY!,
}

export const PRICE_AMOUNTS = {
  ANNUAL: 5000, // $50.00
  SEMI_ANNUAL: 3500, // $35.00
  MONTHLY: 1000, // $10.00
}
