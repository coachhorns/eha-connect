'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function ComingSoonPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: 'coming-soon' }),
      })

      const data = await res.json()

      if (res.ok) {
        setIsSuccess(true)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1D37] relative overflow-hidden flex items-center justify-center px-4">
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
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-[#E31837] blur-[200px] opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
        {/* Logos */}
        <div className="flex items-center justify-center gap-5 sm:gap-7 mb-10">
          <Image
            src="/images/overall.png"
            alt="Elite Hoops Association"
            width={300}
            height={300}
            className="w-auto h-32 sm:h-44 lg:h-52 object-contain"
            priority
          />

          {/* Connector */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
            <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">x</span>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
          </div>

          <Image
            src="/images/main.png"
            alt="EHA Connect"
            width={400}
            height={400}
            className="w-auto h-32 sm:h-44 lg:h-52 object-contain"
            priority
          />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-[#E31837] animate-pulse" />
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
            Launching 2026
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl text-white leading-tight tracking-tight mb-4">
          THE FUTURE OF{' '}
          <span className="text-[#E31837]">BASKETBALL</span>{' '}
          IS COMING
        </h1>

        {/* Description */}
        <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
          The official platform for the EHA Circuit is almost here.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10">
          {[
            'Player Profiles',
            'Live Box Scores',
            'Advanced Analytics',
            'College Recruiting',
            'Season Schedule',
            'Circuit Standings',
          ].map((feature) => (
            <span
              key={feature}
              className="inline-flex items-center bg-white/5 border border-white/10 text-gray-300 text-sm font-medium px-4 py-2 rounded-full"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {isSuccess ? (
            <div className="py-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-heading font-bold text-white mb-2">
                You&apos;re on the list!
              </h3>
              <p className="text-gray-400 text-sm">
                We&apos;ll notify you as soon as EHA Connect launches.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-heading font-semibold text-white mb-1">
                Join the Waitlist
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Be the first to know when we go live.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError('') }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#E31837]/50 focus:ring-1 focus:ring-[#E31837]/25 transition-colors"
                  required
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#E31837]/50 focus:ring-1 focus:ring-[#E31837]/25 transition-colors"
                  required
                />

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] text-white font-bold text-sm uppercase tracking-wider py-3 rounded-lg shadow-lg shadow-[#E31837]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Get Early Access'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="mt-10 flex items-center justify-center gap-8 text-center">
          <div>
            <span className="block font-heading font-bold text-2xl text-white">1,850+</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
              Colleges
            </span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <span className="block font-heading font-bold text-2xl text-white">10k</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
              Athletes
            </span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <span className="block font-heading font-bold text-2xl text-white">24+</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
              Programs
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
