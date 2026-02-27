'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Check, Star, Crown } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { subscriptionPlans } from '@/lib/constants'

function BouncingBasketball() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="animate-bounce">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          <circle cx="12" cy="12" r="10" fill="#E41937" />
          <path
            d="M12 2C12 2 12 22 12 22"
            stroke="#000"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
          <path
            d="M2 12C2 12 22 12 22 12"
            stroke="#000"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
          <path
            d="M4.5 5.5C7 8 10 10 12 12C14 14 17 16.5 19.5 18.5"
            stroke="#000"
            strokeWidth="0.5"
            strokeOpacity="0.3"
            fill="none"
          />
          <path
            d="M19.5 5.5C17 8 14 10 12 12C10 14 7 16.5 4.5 18.5"
            stroke="#000"
            strokeWidth="0.5"
            strokeOpacity="0.3"
            fill="none"
          />
        </svg>
      </div>
      <span className="text-sm font-medium">Heading to Court...</span>
    </div>
  )
}

export default function PricingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [checkingOutPlan, setCheckingOutPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const plans = [
    {
      key: 'ANNUAL',
      ...subscriptionPlans.ANNUAL,
      popular: true,
    },
    {
      key: 'MONTHLY',
      ...subscriptionPlans.MONTHLY,
      popular: false,
    },
  ]

  const handleGetStarted = async (planKey: string) => {
    setError(null)

    if (status === 'unauthenticated' || !session) {
      router.push('/auth/role-selection')
      return
    }

    setCheckingOutPlan(planKey)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setCheckingOutPlan(null)
    }
  }

  const isCheckingOut = checkingOutPlan !== null

  return (
    <div className="min-h-screen bg-dark-base">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[#0A1D37] to-[#152e50] pt-40 pb-20 px-4 sm:px-6 lg:px-8 border-b border-border-subtle">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading font-bold text-5xl lg:text-7xl uppercase tracking-tighter text-text-primary mb-6">
            Get Connected
          </h1>
          <p className="text-blue-200/80 text-xl max-w-2xl mx-auto font-sans leading-relaxed">
            Your player profile, live stats, and direct access to 10,000+ college coaches.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-24 items-start">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`bg-input-bg border relative overflow-hidden rounded-xl p-8 lg:p-10 transition-all duration-300 shadow-2xl ${plan.popular
                ? 'border-eha-red/50 scale-105 z-10 shadow-eha-red/10'
                : 'border-border-subtle opacity-95 hover:opacity-100 hover:border-border-default'
                }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <Badge variant="gold" className="rounded-none rounded-bl-lg flex items-center gap-1 px-4 py-2">
                    <Crown className="w-3 h-3" />
                    MOST POPULAR
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-heading text-xl font-bold text-text-primary mb-1">{plan.name}</h3>
                <p className="text-sm text-text-muted">{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-6xl font-heading font-bold text-text-primary">${plan.price}</span>
                <span className="text-text-muted text-lg ml-1">/{plan.interval}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-eha-red flex-shrink-0 mt-0.5" />
                    <span className="text-text-secondary text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? 'primary' : 'outline'}
                className="w-full py-6 font-extrabold uppercase tracking-widest"
                onClick={() => handleGetStarted(plan.key)}
                disabled={isCheckingOut}
              >
                {checkingOutPlan === plan.key ? (
                  <BouncingBasketball />
                ) : (
                  'Get Started'
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto pb-20">
          <h2 className="font-heading text-2xl font-bold text-text-primary text-center mb-8 uppercase tracking-tight">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div className="bg-input-bg rounded-xl p-6">
              <h3 className="font-heading font-semibold text-text-primary mb-2">
                What&apos;s included with the Connect Pass?
              </h3>
              <p className="text-text-muted text-sm">
                You get a full player profile with photos and bio, live stats tracked by official
                scorekeepers at every EHA event, leaderboard rankings, a shareable profile URL for
                recruiting, and direct email access to over 10,000 college coaches across all divisions.
              </p>
            </div>

            <div className="bg-input-bg rounded-xl p-6">
              <h3 className="font-heading font-semibold text-text-primary mb-2">
                How does the college recruiting tool work?
              </h3>
              <p className="text-text-muted text-sm">
                Your Connect Pass gives you access to a database of 10,000+ college coaches across
                NCAA Division I, II, III, NAIA, and JUCO programs. You can search by school, state,
                or conference and email coaches directly from the platform with your profile link
                included. When a coach replies, the response goes straight to the email on your player profile.
              </p>
            </div>

            <div className="bg-input-bg rounded-xl p-6">
              <h3 className="font-heading font-semibold text-text-primary mb-2">
                How are stats tracked during events?
              </h3>
              <p className="text-text-muted text-sm">
                Official EHA scorekeepers are stationed at every court during events. They record
                points, rebounds, assists, steals, blocks, and shooting stats in real-time using our
                scoring system. Your stats automatically appear on your profile and the leaderboards.
              </p>
            </div>

            <div className="bg-input-bg rounded-xl p-6">
              <h3 className="font-heading font-semibold text-text-primary mb-2">
                What if my child plays for multiple teams?
              </h3>
              <p className="text-text-muted text-sm">
                The Connect Pass follows the player, not the team. All stats from every EHA event
                are tracked on one profile regardless of which team they play for.
              </p>
            </div>

            <div className="bg-input-bg rounded-xl p-6">
              <h3 className="font-heading font-semibold text-text-primary mb-2">
                Do you offer family discounts?
              </h3>
              <p className="text-text-muted text-sm">
                Yes! If you have multiple children playing in EHA events, additional players on your
                account are discounted. Contact us for details on family pricing.
              </p>
            </div>

            <div className="bg-input-bg rounded-xl p-6">
              <h3 className="font-heading font-semibold text-text-primary mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-text-muted text-sm">
                Absolutely. You can cancel your subscription from your account dashboard at any time.
                Your access continues through the end of your current billing period.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pb-16 text-center">
          <p className="text-text-muted mb-4">
            Have questions? Contact us at{' '}
            <a href="mailto:support@ehacircuit.com" className="text-text-primary hover:underline">
              support@ehacircuit.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
