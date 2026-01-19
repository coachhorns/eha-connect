import Stripe from 'stripe'
import prisma from '@/lib/prisma'

// Cache for Stripe instance to avoid re-initializing on every request
let cachedStripe: Stripe | null = null
let cachedSecretKey: string | null = null

/**
 * Fetches a system setting value from the database
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  })
  return setting?.value ?? null
}

/**
 * Fetches multiple system settings at once
 */
export async function getSystemSettings(keys: string[]): Promise<Record<string, string | null>> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: keys } },
  })

  const result: Record<string, string | null> = {}
  for (const key of keys) {
    result[key] = settings.find(s => s.key === key)?.value ?? null
  }
  return result
}

/**
 * Gets a Stripe server client initialized with the secret key from the database.
 * Falls back to process.env.STRIPE_SECRET_KEY if not found in DB.
 */
export async function getStripeServer(): Promise<Stripe> {
  const secretKey = await getSystemSetting('STRIPE_SECRET_KEY') || process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error('Stripe secret key is not configured. Please configure it in Admin > Settings > Payments.')
  }

  // Return cached instance if key hasn't changed
  if (cachedStripe && cachedSecretKey === secretKey) {
    return cachedStripe
  }

  // Create new Stripe instance
  cachedStripe = new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
  })
  cachedSecretKey = secretKey

  return cachedStripe
}

/**
 * Gets the Stripe public key for client-side usage.
 * Falls back to process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY if not found in DB.
 */
export async function getStripePublicKey(): Promise<string | null> {
  return await getSystemSetting('STRIPE_PUBLIC_KEY') || process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || null
}

/**
 * Gets the Stripe webhook secret.
 * Falls back to process.env.STRIPE_WEBHOOK_SECRET if not found in DB.
 */
export async function getStripeWebhookSecret(): Promise<string | null> {
  return await getSystemSetting('STRIPE_WEBHOOK_SECRET') || process.env.STRIPE_WEBHOOK_SECRET || null
}

/**
 * Gets all subscription price IDs from the database.
 * Falls back to process.env values if not found in DB.
 */
export async function getSubscriptionPrices(): Promise<{
  ANNUAL: string | null
  SEMI_ANNUAL: string | null
  MONTHLY: string | null
}> {
  const settings = await getSystemSettings([
    'STRIPE_PRICE_ID_ANNUAL',
    'STRIPE_PRICE_ID_SEMI_ANNUAL',
    'STRIPE_PRICE_ID_MONTHLY',
  ])

  return {
    ANNUAL: settings['STRIPE_PRICE_ID_ANNUAL'] || process.env.STRIPE_PRICE_ANNUAL || null,
    SEMI_ANNUAL: settings['STRIPE_PRICE_ID_SEMI_ANNUAL'] || process.env.STRIPE_PRICE_SEMI_ANNUAL || null,
    MONTHLY: settings['STRIPE_PRICE_ID_MONTHLY'] || process.env.STRIPE_PRICE_MONTHLY || null,
  }
}

/**
 * Invalidates the cached Stripe instance (use after updating settings)
 */
export function invalidateStripeCache(): void {
  cachedStripe = null
  cachedSecretKey = null
}
