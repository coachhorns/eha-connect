'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Users,
  CalendarCheck,
  BarChart3,
  ArrowRight,
  Shield,
  ClipboardList,
  Trophy,
  GraduationCap,
  Zap,
  X,
  Mail,
  Lock,
  User,
  Loader2,
} from 'lucide-react'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

const benefits = [
  {
    icon: ClipboardList,
    title: 'Roster Management',
    description:
      'Build and manage your rosters in one place. Add players, set jersey numbers, and move athletes between teams with drag-and-drop ease.',
  },
  {
    icon: CalendarCheck,
    title: 'Event Registration',
    description:
      'Browse EHA events, register your teams in minutes, and view schedules, brackets, and results — all from your director dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Player Profiles & Stats',
    description:
      'Every player on your roster gets an official EHA profile with verified box scores, career averages at EHA events, and performance analytics.',
  },
  {
    icon: GraduationCap,
    title: 'College Recruiting Tools',
    description:
      'Help your players get seen. Send branded recruiting emails with stat-backed player cards directly to college coaches.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create Your Account',
    description: 'Sign up as a Program Director in under 60 seconds.',
  },
  {
    number: '02',
    title: 'Build Your Program',
    description: 'Add your program name, logo, teams, and rosters. Snap a photo of your roster and our AI auto-populates player info — no manual entry needed.',
  },
  {
    number: '03',
    title: 'Register for Events',
    description: 'Browse upcoming EHA events and register your teams.',
  },
]

function SignUpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError('')
    try {
      await signIn('google', { callbackUrl: '/director/onboarding' })
    } catch {
      setError('Failed to sign in with Google. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'PROGRAM_DIRECTOR',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.details || data.error || 'Something went wrong')
        return
      }

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Account created but could not sign in. Please try signing in.')
        setMode('signin')
      } else {
        router.push('/director/onboarding')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/director/onboarding')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '' })
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md sm:mx-4 bg-page-bg border border-border-default rounded-t-2xl sm:rounded-2xl shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-glass hover:bg-surface-overlay transition-colors z-10"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <Image
              src="/images/main.png"
              alt="EHA Connect"
              width={200}
              height={60}
              className="w-auto h-16 mx-auto mb-4 object-contain"
            />
            <h2 className="text-2xl font-heading font-bold text-text-primary">
              {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="text-text-muted text-sm mt-1">
              {mode === 'signup' ? 'Set up your director account' : 'Sign in to continue'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-page-bg text-text-muted uppercase tracking-widest">
                or
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-surface-glass border border-border-default rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-[#E31837]/50 focus:ring-1 focus:ring-[#E31837]/25 transition-colors"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 bg-surface-glass border border-border-default rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-[#E31837]/50 focus:ring-1 focus:ring-[#E31837]/25 transition-colors"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="password"
                name="password"
                placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 bg-surface-glass border border-border-default rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-[#E31837]/50 focus:ring-1 focus:ring-[#E31837]/25 transition-colors"
              />
            </div>

            {mode === 'signup' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-surface-glass border border-border-default rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-[#E31837]/50 focus:ring-1 focus:ring-[#E31837]/25 transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] text-white font-bold uppercase tracking-widest text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#E31837]/25 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <p className="text-center text-text-muted text-sm mt-6">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); resetForm() }}
                  className="text-text-primary hover:text-[#E31837] transition-colors font-semibold"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); resetForm() }}
                  className="text-text-primary hover:text-[#E31837] transition-colors font-semibold"
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default function DirectorInvitePage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-page-bg">
      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24 sm:pb-16">
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
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
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
              <span className="text-xs font-bold text-text-muted uppercase tracking-[0.2em]">x</span>
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
          <div className="inline-flex items-center gap-2.5 bg-surface-glass border border-border-default px-4 py-2 rounded-full mb-8">
            <Shield className="w-4 h-4 text-text-muted" />
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
              Exclusive Director Invite
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-text-primary leading-tight tracking-tight mb-6">
            RUN YOUR PROGRAM{' '}
            <br className="hidden sm:block" />
            ON <span className="text-[#E31837]">EHA CONNECT</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed mb-10">
            The official platform for the Elite Hoops Association.
            Manage your rosters, register for events, and give every player in your program
            a player profile with live stats and college recruiting tools.
          </p>

          {/* CTA */}
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] text-white font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-lg shadow-lg shadow-[#E31837]/25 transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            Set Up Your Program
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-text-muted mt-4">
            Free to set up. Takes less than 5 minutes.
          </p>
        </div>
      </section>

      {/* ========== BENEFITS ========== */}
      <section className="relative py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-[#E31837] font-bold text-xs uppercase tracking-widest">
              Built for Directors
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-text-primary mt-3 mb-4">
              EVERYTHING YOUR PROGRAM NEEDS
            </h2>
            <p className="text-text-muted max-w-xl mx-auto">
              One platform to manage your teams, showcase your players, and connect with The EHA Circuit.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-surface-glass border border-border-default rounded-2xl p-8 hover:bg-surface-overlay hover:border-white/15 transition-all group"
              >
                <div className="w-12 h-12 bg-surface-glass border border-border-default rounded-xl flex items-center justify-center mb-5 group-hover:bg-surface-overlay transition-colors">
                  <benefit.icon className="w-6 h-6 text-text-muted" />
                </div>
                <h3 className="font-heading font-bold text-xl text-text-primary mb-2">
                  {benefit.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="relative py-12 sm:py-16 border-t border-border-subtle">
        <div className="max-w-4xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-[#E31837] font-bold text-xs uppercase tracking-widest">
              Get Started in Minutes
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-text-primary mt-3">
              HOW IT WORKS
            </h2>
          </div>

          {/* Steps */}
          <div className="space-y-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-6"
              >
                <div className="flex-shrink-0 w-14 h-14 bg-surface-glass border border-border-default rounded-xl flex items-center justify-center">
                  <span className="font-heading font-bold text-text-primary text-lg">
                    {step.number}
                  </span>
                </div>
                <div className="pt-1">
                  <h3 className="font-heading font-bold text-lg text-text-primary mb-1">
                    {step.title}
                  </h3>
                  <p className="text-text-muted text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== WHAT YOUR PLAYERS GET ========== */}
      <section className="relative py-12 sm:py-16 border-t border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-[#E31837] font-bold text-xs uppercase tracking-widest">
            For Your Players
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-text-primary mt-3 mb-12">
            GIVE YOUR ATHLETES AN EDGE
          </h2>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-surface-glass border border-border-default rounded-xl p-6">
              <Trophy className="w-8 h-8 text-text-muted mx-auto mb-4" />
              <h3 className="font-heading font-bold text-text-primary mb-2">Verified Profiles</h3>
              <p className="text-text-muted text-sm">
                Official EHA player profiles with photos, bio, transcripts, and links to Hudl, YouTube, Instagram, and more — all in one place.
              </p>
            </div>
            <div className="bg-surface-glass border border-border-default rounded-xl p-6">
              <Zap className="w-8 h-8 text-text-muted mx-auto mb-4" />
              <h3 className="font-heading font-bold text-text-primary mb-2">Live Box Scores</h3>
              <p className="text-text-muted text-sm">
                Real-time stats from every EHA game — points, rebounds, assists, and more. All stats feed directly into each player&apos;s profile.
              </p>
            </div>
            <div className="bg-surface-glass border border-border-default rounded-xl p-6">
              <GraduationCap className="w-8 h-8 text-text-muted mx-auto mb-4" />
              <h3 className="font-heading font-bold text-text-primary mb-2">Recruiting Reach</h3>
              <p className="text-text-muted text-sm">
                Players can email 1,850+ college coaches directly with their profile attached. Coach replies go straight to the player&apos;s personal email for direct communication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PRICING NOTE ========== */}
      <section className="relative pt-0 pb-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-surface-glass border border-border-default rounded-xl p-6 text-center">
            <h3 className="font-heading font-bold text-text-primary text-sm uppercase tracking-widest mb-3">
              Pricing Transparency
            </h3>
            <p className="text-text-muted text-sm leading-relaxed mb-3">
              Creating your program, teams, and rosters is <span className="text-text-primary font-semibold">completely free</span> for directors — no cost, ever.
              When you build your rosters, you&apos;re automatically creating player profiles for every athlete in your program.
            </p>
            <p className="text-text-muted text-sm leading-relaxed mb-3">
              <span className="text-text-primary font-semibold">Stats are always tracked.</span> Whether a family subscribes or not, every player&apos;s box scores and career stats are recorded at EHA events and visible to college coaches during live periods.
            </p>
            <p className="text-text-muted text-sm leading-relaxed">
              A family subscription (<span className="text-text-primary font-semibold">$10/month</span> or <span className="text-text-primary font-semibold">$50 for the season</span>) unlocks the ability for players and parents to edit their profile, add personal links and media, view their own stats, and use the college recruiting email tool.
            </p>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="relative py-12 sm:py-16 border-t border-border-subtle">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#E31837]/5 to-transparent" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-text-primary mb-4">
            READY TO GET STARTED?
          </h2>
          <p className="text-text-muted text-lg mb-8">
            Set up your program, add your teams, and get your players on the platform.
            It&apos;s free and takes less than 5 minutes.
          </p>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] text-white font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-lg shadow-lg shadow-[#E31837]/25 transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            Set Up Your Program
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-text-muted mt-6">
            Already have an account?{' '}
            <button
              onClick={() => setModalOpen(true)}
              className="text-text-muted hover:text-text-primary transition-colors underline cursor-pointer"
            >
              Sign in here
            </button>
          </p>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Image
            src="/images/main.png"
            alt="EHA Connect"
            width={100}
            height={100}
            className="w-auto h-10 mx-auto mb-4 object-contain opacity-40"
          />
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Elite Hoops Association. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Signup/Signin Modal */}
      <SignUpModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
