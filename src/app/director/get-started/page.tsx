'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, LogIn, UserPlus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'

function GetStartedContent() {
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/events'

  const signInUrl = `/auth/signin?role=PROGRAM_DIRECTOR&callbackUrl=${encodeURIComponent(returnUrl)}`
  const signUpUrl = `/auth/signup?role=PROGRAM_DIRECTOR&callbackUrl=${encodeURIComponent(returnUrl)}`

  return (
    <div className="min-h-screen bg-page-bg relative overflow-hidden flex items-center justify-center">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E31837] blur-[180px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 blur-[150px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 w-full max-w-lg mx-auto px-6">
        {/* Back Link */}
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        {/* Main Card */}
        <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="w-20 h-20 bg-surface-overlay rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-heading font-bold text-text-primary text-center mb-3">
            Director Access Required
          </h1>

          {/* Description */}
          <p className="text-text-muted text-center mb-8 leading-relaxed">
            To register a team for this event, you must sign in or create a Program Director account.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link href={signInUrl} className="block">
              <Button className="w-full bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25 py-3">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </Button>
            </Link>

            <Link href={signUpUrl} className="block">
              <Button
                variant="outline"
                className="w-full border-border-default text-text-primary hover:bg-surface-overlay py-3"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create Account
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-border-default">
            <p className="text-sm text-text-muted text-center">
              Program Directors can manage teams, register for events, and track player rosters.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DirectorGetStartedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page-bg flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
        </div>
      }
    >
      <GetStartedContent />
    </Suspense>
  )
}
