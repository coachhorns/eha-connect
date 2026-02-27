'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Users, User, Building2, ArrowRight, Check, Loader2 } from 'lucide-react'

const roles = [
  {
    id: 'PARENT',
    title: 'Parent / Guardian',
    description:
      "Manage your child's player profile, track their stats, and follow their basketball journey.",
    icon: Users,
    features: [
      'Create and manage player profiles',
      'View game stats and achievements',
      'Upload photos and highlights',
    ],
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    id: 'PLAYER',
    title: 'Player',
    description:
      'Build your own profile, showcase your skills, and get discovered by college coaches.',
    icon: User,
    features: ['Personal player profile', 'Track your own stats', 'Share with recruiters'],
    iconBg: 'bg-[#E31837]/20',
    iconColor: 'text-[#E31837]',
  },
  {
    id: 'PROGRAM_DIRECTOR',
    title: 'Club / Program Director',
    description: "Manage your club's teams, rosters, and represent your program in EHA events.",
    icon: Building2,
    features: ['Create and manage your program', 'Build team rosters', 'Register for EHA events'],
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
]

function getRedirectForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'PROGRAM_DIRECTOR':
      return '/director/onboarding'
    case 'SCOREKEEPER':
      return '/scorekeeper'
    default:
      return '/dashboard'
  }
}

function CompleteProfileContent() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Auto-redirect if role already selected or user has a non-default role
  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
      return
    }

    if (!session?.user) return

    const { role, roleSelected } = session.user

    // Already completed role selection — redirect to destination
    if (roleSelected) {
      const destination = callbackUrl || getRedirectForRole(role)
      router.replace(destination)
      return
    }

    // Has a non-default role (ADMIN, SCOREKEEPER, etc.) but roleSelected is false
    // This means they're an existing user who never went through this flow — auto-approve
    if (role !== 'PARENT') {
      fetch('/api/user/select-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
        .then(() => update())
        .then(() => {
          const destination = callbackUrl || getRedirectForRole(role)
          router.replace(destination)
        })
        .catch(() => {
          // Fallback: just redirect without setting the flag
          const destination = callbackUrl || getRedirectForRole(role)
          router.replace(destination)
        })
    }
  }, [status, session, router, callbackUrl, update])

  const handleSelectRole = async (roleId: string) => {
    setIsSubmitting(true)
    setSelectedRole(roleId)
    setError('')

    try {
      const res = await fetch('/api/user/select-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to set role')
        setIsSubmitting(false)
        setSelectedRole(null)
        return
      }

      // Refresh the JWT so it picks up the new role + roleSelected
      await update()

      // Redirect based on chosen role
      const destination =
        roleId === 'PROGRAM_DIRECTOR' ? '/director/onboarding' : '/dashboard'
      router.push(destination)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
      setSelectedRole(null)
    }
  }

  // Show loading while checking session or auto-redirecting
  if (
    status === 'loading' ||
    (status === 'authenticated' && (session?.user?.roleSelected || session?.user?.role !== 'PARENT'))
  ) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-4 py-12 relative overflow-hidden">
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
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-amber-500 blur-[120px] opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Image
            src="/images/main.png"
            alt="EHA Connect"
            width={380}
            height={120}
            className="w-auto h-40 mx-auto mb-3 object-contain"
            priority
          />
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-text-primary tracking-tight mb-4">
            One More Step
          </h1>
          <p className="text-text-muted text-lg font-light max-w-xl mx-auto">
            Select your account type to complete your profile
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {error}
          </div>
        )}

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const isSelected = selectedRole === role.id
            return (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                disabled={isSubmitting}
                className="block group text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="h-full bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:bg-surface-overlay hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 ${role.iconBg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <role.icon className={`w-8 h-8 ${role.iconColor}`} />
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-xl font-heading font-bold text-text-primary mb-2 group-hover:text-[#E31837] transition-colors">
                    {role.title}
                  </h2>
                  <p className="text-text-muted text-sm mb-5 leading-relaxed">{role.description}</p>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {role.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-text-secondary">
                        <div className="w-5 h-5 bg-[#E31837]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#E31837]" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-[#E31837] font-semibold group-hover:gap-4 transition-all duration-300">
                    {isSelected ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="uppercase tracking-widest text-sm">Select</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page-bg flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
        </div>
      }
    >
      <CompleteProfileContent />
    </Suspense>
  )
}
