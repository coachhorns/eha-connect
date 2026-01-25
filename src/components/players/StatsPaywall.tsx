'use client'

import Link from 'next/link'
import { Lock, UserPlus, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui'

interface StatsPaywallProps {
  playerId?: string
  variant?: 'overlay' | 'inline'
  showClaimOption?: boolean
}

export default function StatsPaywall({
  playerId,
  variant = 'overlay',
  showClaimOption = true,
}: StatsPaywallProps) {
  if (variant === 'inline') {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Stats Locked</h3>
        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
          Subscribe to view detailed player statistics, game logs, and performance data
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/pricing">
            <Button>
              <CreditCard className="w-4 h-4 mr-2" />
              Subscribe Now
            </Button>
          </Link>
          {showClaimOption && (
            <Link href="/claim-player">
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Claim This Player
              </Button>
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/60 backdrop-blur-sm rounded-lg z-10">
      <div className="text-center p-6 max-w-sm">
        <div className="w-14 h-14 bg-eha-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-eha-red" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          Subscribe to View Stats
        </h3>
        <p className="text-gray-400 text-sm mb-5">
          Get access to detailed statistics, game logs, and performance analytics
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/pricing">
            <Button className="w-full">
              <CreditCard className="w-4 h-4 mr-2" />
              View Plans
            </Button>
          </Link>
          {showClaimOption && (
            <Link href="/claim-player">
              <Button variant="ghost" className="w-full text-sm">
                <UserPlus className="w-4 h-4 mr-2" />
                I'm a parent of this player
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
