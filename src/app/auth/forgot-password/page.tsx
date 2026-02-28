'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong')
        return
      }

      setIsSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-32 pb-12 relative overflow-hidden">
      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E31837] blur-[150px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image
              src="/images/main.png"
              alt="EHA Connect"
              width={340}
              height={110}
              className="w-auto h-36 mx-auto mb-2 object-contain"
              priority
            />

            {!isSubmitted ? (
              <>
                <h1 className="text-3xl font-heading font-bold text-text-primary tracking-tight">
                  Forgot Password
                </h1>
                <p className="text-text-muted mt-2 font-light">
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-heading font-bold text-text-primary tracking-tight">
                  Check Your Email
                </h1>
                <p className="text-text-muted mt-2 font-light">
                  If an account exists with <strong className="text-text-primary">{email}</strong>, you&apos;ll receive a password reset link shortly.
                </p>
              </>
            )}
          </div>

          {!isSubmitted ? (
            <>
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6 flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-page-bg-alt border border-border-default rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] text-white font-bold uppercase tracking-widest text-sm rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#E31837]/25 hover:shadow-xl hover:shadow-[#E31837]/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <p className="text-text-muted text-sm mb-6">
                The link will expire in 1 hour. Check your spam folder if you don&apos;t see it.
              </p>
            </div>
          )}

          {/* Back to Sign In */}
          <div className="mt-8 text-center">
            <Link
              href="/auth/signin"
              className="text-[#E31837] hover:text-text-primary transition-colors font-semibold text-sm inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
