import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { invalidateStripeCache } from '@/lib/stripe-dynamic'

// Keys that are considered sensitive and should be masked on read
const SENSITIVE_KEYS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']

// Payment setting keys
const PAYMENT_SETTING_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLIC_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_ANNUAL',
  'STRIPE_PRICE_ID_SEMI_ANNUAL',
  'STRIPE_PRICE_ID_MONTHLY',
]

function maskValue(value: string): string {
  if (value.length <= 8) {
    return '••••••••'
  }
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4)
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let keys: string[] = []
    if (category === 'payments') {
      keys = PAYMENT_SETTING_KEYS
    }

    const settings = await prisma.systemSetting.findMany({
      where: keys.length > 0 ? { key: { in: keys } } : undefined,
    })

    // Mask sensitive values
    const maskedSettings = settings.map((setting) => ({
      ...setting,
      value: SENSITIVE_KEYS.includes(setting.key) ? maskValue(setting.value) : setting.value,
      hasValue: setting.value.length > 0,
    }))

    // Return all expected keys with their values (or null if not set)
    const result: Record<string, { value: string | null; hasValue: boolean; isPrivate: boolean }> = {}
    for (const key of keys.length > 0 ? keys : PAYMENT_SETTING_KEYS) {
      const setting = maskedSettings.find((s) => s.key === key)
      result[key] = {
        value: setting?.value ?? null,
        hasValue: setting?.hasValue ?? false,
        isPrivate: SENSITIVE_KEYS.includes(key),
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { settings } = body as { settings: Record<string, string> }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 })
    }

    // Validate that all keys are allowed
    const allowedKeys = PAYMENT_SETTING_KEYS
    for (const key of Object.keys(settings)) {
      if (!allowedKeys.includes(key)) {
        return NextResponse.json({ error: `Invalid setting key: ${key}` }, { status: 400 })
      }
    }

    // Upsert each setting
    const updates = Object.entries(settings)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          create: {
            key,
            value,
            isPrivate: SENSITIVE_KEYS.includes(key),
          },
          update: {
            value,
            isPrivate: SENSITIVE_KEYS.includes(key),
          },
        })
      )

    await prisma.$transaction(updates)

    // Invalidate Stripe cache when settings are updated
    invalidateStripeCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
