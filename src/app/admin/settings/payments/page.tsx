'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard,
  Key,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from '@/components/ui'

interface SettingInfo {
  value: string | null
  hasValue: boolean
  isPrivate: boolean
}

interface Settings {
  STRIPE_SECRET_KEY: SettingInfo
  STRIPE_PUBLIC_KEY: SettingInfo
  STRIPE_WEBHOOK_SECRET: SettingInfo
  STRIPE_PRICE_ID_ANNUAL: SettingInfo
  STRIPE_PRICE_ID_SEMI_ANNUAL?: SettingInfo
  STRIPE_PRICE_ID_MONTHLY?: SettingInfo
  STRIPE_CONNECT_ID?: SettingInfo
}

interface FormData {
  STRIPE_SECRET_KEY: string
  STRIPE_PUBLIC_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_ID_ANNUAL: string
  STRIPE_PRICE_ID_SEMI_ANNUAL: string
  STRIPE_PRICE_ID_MONTHLY: string
  STRIPE_CONNECT_ID: string
}

export default function PaymentSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState<FormData>({
    STRIPE_SECRET_KEY: '',
    STRIPE_PUBLIC_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    STRIPE_PRICE_ID_ANNUAL: '',
    STRIPE_PRICE_ID_SEMI_ANNUAL: '',
    STRIPE_PRICE_ID_MONTHLY: '',
    STRIPE_CONNECT_ID: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/settings/payments')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings?category=payments')
      const data = await res.json()
      setSettings(data)

      // Populate form with non-private values (private values show masked placeholder)
      setFormData({
        STRIPE_SECRET_KEY: '',
        STRIPE_PUBLIC_KEY: data.STRIPE_PUBLIC_KEY?.value || '',
        STRIPE_WEBHOOK_SECRET: '',
        STRIPE_PRICE_ID_ANNUAL: data.STRIPE_PRICE_ID_ANNUAL?.value || '',
        STRIPE_PRICE_ID_SEMI_ANNUAL: data.STRIPE_PRICE_ID_SEMI_ANNUAL?.value || '',
        STRIPE_PRICE_ID_MONTHLY: data.STRIPE_PRICE_ID_MONTHLY?.value || '',
        STRIPE_CONNECT_ID: data.STRIPE_CONNECT_ID?.value || '',
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      // Only send non-empty values (empty string means "don't change")
      const settingsToSave: Record<string, string> = {}

      Object.entries(formData).forEach(([key, value]) => {
        if (value && value.trim()) {
          settingsToSave[key] = value.trim()
        }
      })

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      setMessage({ type: 'success', text: 'Settings saved successfully' })

      // Refresh settings to show updated state
      await fetchSettings()

      // Clear sensitive fields after save
      setFormData((prev) => ({
        ...prev,
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: '',
      }))
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save settings' })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen">
      <header className="pt-32 lg:pt-36 relative overflow-hidden border-b border-border-subtle">
        <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">Admin Panel</span>
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-text-primary uppercase tracking-tighter flex items-center gap-3">
                <CreditCard className="w-10 h-10 text-eha-red" />
                Payment Settings
              </h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">Configure your Stripe integration for subscription payments</p>
            </div>
          </div>
        </div>
      </header>
      <main className="w-full max-w-4xl mx-auto px-6 sm:px-12 lg:px-16 py-10">

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* API Keys */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Your Stripe API keys from the Stripe Dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Secret Key */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Secret Key
                  {settings?.STRIPE_SECRET_KEY?.hasValue && (
                    <span className="ml-2 text-xs text-green-400">(configured)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['STRIPE_SECRET_KEY'] ? 'text' : 'password'}
                    value={formData.STRIPE_SECRET_KEY}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, STRIPE_SECRET_KEY: e.target.value }))
                    }
                    placeholder={settings?.STRIPE_SECRET_KEY?.hasValue ? '••••••••' : 'sk_live_...'}
                    className="w-full px-4 py-2.5 bg-input-bg border border-eha-silver/20 rounded-lg text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowSecret('STRIPE_SECRET_KEY')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showSecrets['STRIPE_SECRET_KEY'] ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Leave blank to keep existing value. Find this in Stripe Dashboard &gt; Developers &gt; API Keys
                </p>
              </div>

              {/* Public Key */}
              <Input
                label="Public Key"
                value={formData.STRIPE_PUBLIC_KEY}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, STRIPE_PUBLIC_KEY: e.target.value }))
                }
                placeholder="pk_live_..."
                helperText="Used for client-side Stripe.js"
              />
            </CardContent>
          </Card>

          {/* Webhook */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Webhook secret for verifying Stripe events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Webhook Secret
                  {settings?.STRIPE_WEBHOOK_SECRET?.hasValue && (
                    <span className="ml-2 text-xs text-green-400">(configured)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['STRIPE_WEBHOOK_SECRET'] ? 'text' : 'password'}
                    value={formData.STRIPE_WEBHOOK_SECRET}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, STRIPE_WEBHOOK_SECRET: e.target.value }))
                    }
                    placeholder={settings?.STRIPE_WEBHOOK_SECRET?.hasValue ? '••••••••' : 'whsec_...'}
                    className="w-full px-4 py-2.5 bg-input-bg border border-eha-silver/20 rounded-lg text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowSecret('STRIPE_WEBHOOK_SECRET')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showSecrets['STRIPE_WEBHOOK_SECRET'] ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Leave blank to keep existing value. Find this in Stripe Dashboard &gt; Developers &gt; Webhooks
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Connect Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Revenue Split Configuration</CardTitle>
              <CardDescription>
                Configure the destination account for Player Profile revenue splits (60%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                label="Connected Account ID"
                value={formData.STRIPE_CONNECT_ID}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, STRIPE_CONNECT_ID: e.target.value }))
                }
                placeholder="acct_..."
                helperText="The Stripe Connect Account ID that will receive 60% of Player Subscription revenue."
              />
            </CardContent>
          </Card>

          {/* Price IDs */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Subscription Price IDs</CardTitle>
              <CardDescription>
                Price IDs from your Stripe Products
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Annual Plan Price ID"
                value={formData.STRIPE_PRICE_ID_ANNUAL}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, STRIPE_PRICE_ID_ANNUAL: e.target.value }))
                }
                placeholder="price_..."
                helperText="$75/year subscription price"
              />

              <Input
                label="Monthly Plan Price ID (Optional)"
                value={formData.STRIPE_PRICE_ID_MONTHLY}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, STRIPE_PRICE_ID_MONTHLY: e.target.value }))
                }
                placeholder="price_..."
                helperText="$10/month subscription price"
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              {isSaving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
