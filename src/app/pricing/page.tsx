'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Check, Star, Zap } from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui'
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
          <circle cx="12" cy="12" r="10" fill="#FF6B00" />
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
      key: 'MONTHLY',
      ...subscriptionPlans.MONTHLY,
      popular: false,
    },
    {
      key: 'ANNUAL',
      ...subscriptionPlans.ANNUAL,
      popular: true,
    },
    {
      key: 'SEMI_ANNUAL',
      ...subscriptionPlans.SEMI_ANNUAL,
      popular: false,
    },
  ]

  const handleGetStarted = async (planKey: string) => {
    setError(null)

    // If not logged in, redirect to signup
    if (status === 'unauthenticated' || !session) {
      router.push('/auth/signup')
      return
    }

    // User is logged in, proceed to checkout
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge variant="orange" className="mb-4">
          <Zap className="w-3 h-3 mr-1" />
          Simple Pricing
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
          Get Your EHA Connect Pass
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Choose the plan that works best for you. All plans include full access to every feature.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {plans.map((plan) => (
          <Card
            key={plan.key}
            variant={plan.popular ? 'highlight' : 'default'}
            className={`relative p-8 ${plan.popular ? 'scale-105' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge variant="gold" className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Most Popular
                </Badge>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-sm text-gray-400">{plan.description}</p>
            </div>

            <div className="text-center mb-8">
              <span className="text-5xl font-bold text-white">${plan.price}</span>
              <span className="text-gray-400">/{plan.interval}</span>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-[#FF6B00]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.popular ? 'primary' : 'outline'}
              className="w-full"
              size="lg"
              onClick={() => handleGetStarted(plan.key)}
              disabled={isCheckingOut}
            >
              {checkingOutPlan === plan.key ? (
                <BouncingBasketball />
              ) : (
                'Get Started'
              )}
            </Button>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-white mb-2">
              What does EHA Connect include?
            </h3>
            <p className="text-gray-400 text-sm">
              EHA Connect includes a full player profile with photos and bio, live stats tracking
              at all EHA events, achievement badges, leaderboard rankings, and a shareable profile
              URL for college recruiting.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-white mb-2">
              How are stats recorded?
            </h3>
            <p className="text-gray-400 text-sm">
              Stats are recorded by official EHA scorekeepers at each court during events. They use
              our tablet-optimized system to capture every point, rebound, assist, steal, and block
              in real-time.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-white mb-2">
              Can college coaches see my profile?
            </h3>
            <p className="text-gray-400 text-sm">
              Yes! All player profiles are publicly accessible. You get a professional profile URL
              (ehacircuit.com/player/your-name) that you can share with college coaches. You can
              also download your profile as a PDF for recruiting packets.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-white mb-2">
              Can I cancel my subscription?
            </h3>
            <p className="text-gray-400 text-sm">
              Yes, you can cancel anytime from your account dashboard. Your access will continue
              until the end of your current billing period.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-white mb-2">
              What if I play for multiple teams?
            </h3>
            <p className="text-gray-400 text-sm">
              Your EHA Connect pass follows you, not your team. All your stats from any EHA event
              are tracked on your single player profile, regardless of which team you play for.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <p className="text-gray-400 mb-4">
          Have questions? Contact us at{' '}
          <a href="mailto:support@ehacircuit.com" className="text-white hover:underline">
            support@ehacircuit.com
          </a>
        </p>
      </div>
    </div>
  )
}
