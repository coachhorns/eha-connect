'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle,
  Users,
  AlertCircle,
  User,
  ShieldAlert,
} from 'lucide-react'
import { Button, Input, Select, Badge } from '@/components/ui'
import { states, divisions as divisionOptions } from '@/lib/constants'

interface Event {
  id: string
  slug: string
  name: string
  type: string
  description: string | null
  venue: string | null
  city: string | null
  state: string | null
  startDate: string
  endDate: string
  divisions: string[]
  entryFee: number | null
  isPublished: boolean
}

export default function EventRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isBlocked, setIsBlocked] = useState(false)

  const [formData, setFormData] = useState({
    teamName: '',
    division: '',
    city: '',
    state: '',
    coachName: '',
    coachEmail: '',
    coachPhone: '',
  })

  // Check user role and redirect accordingly
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // Wait for session to be determined
      if (sessionStatus === 'loading') return

      // Not logged in - redirect to signin
      if (sessionStatus === 'unauthenticated') {
        const callbackUrl = `/events/${resolvedParams.slug}/register`
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&role=PROGRAM_DIRECTOR`)
        return
      }

      const role = session?.user?.role

      // PARENT or PLAYER - show blocking message
      if (role === 'PARENT' || role === 'PLAYER') {
        setIsBlocked(true)
        setIsLoading(false)
        return
      }

      // PROGRAM_DIRECTOR - check if they have a program and redirect
      if (role === 'PROGRAM_DIRECTOR') {
        try {
          const res = await fetch('/api/director/program')
          const data = await res.json()

          if (!data.program || data.program.teams.length === 0) {
            // No program or no teams - redirect to onboarding
            const callbackUrl = `/events/${resolvedParams.slug}/register/director`
            router.push(`/director/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
          } else {
            // Has program with teams - go to director registration
            router.push(`/events/${resolvedParams.slug}/register/director`)
          }
          return
        } catch (err) {
          console.error('Error checking director program:', err)
          // Continue to regular registration if check fails
        }
      }

      // For ADMIN or fallback - continue with regular registration
      fetchEvent()
    }

    checkUserAndRedirect()
  }, [sessionStatus, session, resolvedParams.slug, router])

  const fetchEvent = async () => {
    try {
      // Fetch event by slug
      const res = await fetch(`/api/events?slug=${resolvedParams.slug}`)
      if (res.ok) {
        const data = await res.json()
        if (data.events && data.events.length > 0) {
          setEvent(data.events[0])
        } else {
          setError('Event not found')
        }
      } else {
        setError('Failed to load event')
      }
    } catch (err) {
      setError('Failed to load event')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.teamName.trim()) {
      errors.teamName = 'Team name is required'
    }
    if (!formData.coachName.trim()) {
      errors.coachName = 'Coach name is required'
    }
    if (!formData.coachEmail.trim()) {
      errors.coachEmail = 'Coach email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.coachEmail)) {
      errors.coachEmail = 'Please enter a valid email'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validate() || !event) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/events/${event.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to register. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-[#0A1D37] border border-white/10 rounded-sm p-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold text-white mb-2">Event Not Found</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link href="/events">
              <Button>Browse Events</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show blocking message for parents/players
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        {/* Hero Section */}
        <div className="relative bg-[#0A1D37] border-b border-white/10 pt-32">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <div className="w-20 h-20 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2">
              Director Account Required
            </h1>
            <p className="text-gray-400 text-lg">
              Only Program Directors can register teams for events.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-[#0A1D37] border border-white/10 rounded-xl p-8">
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-2">Are you a coach or club director?</h3>
                <p className="text-gray-400 mb-4">
                  Create a Director Account to manage your program and register teams for events.
                </p>
                <Link href="/auth/signup?role=PROGRAM_DIRECTOR">
                  <Button className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]">
                    Create Director Account
                  </Button>
                </Link>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-2">Are you a parent or player?</h3>
                <p className="text-gray-400">
                  Contact your team's director to register for this event. They will need to log in with their Program Director account to complete the registration.
                </p>
              </div>

              <div className="flex justify-center">
                <Link href="/events">
                  <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/5">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Events
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        {/* Hero Section */}
        <div className="relative bg-[#0A1D37] border-b border-white/10 pt-32">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2">
              Registration Complete!
            </h1>
            <p className="text-gray-400 text-lg">
              Your team has been registered for <span className="text-white font-semibold">{event?.name}</span>
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-[#0A1D37] border border-white/10 rounded-sm p-8 text-center">
            <p className="text-gray-400 mb-6">
              You will receive a confirmation email at <span className="text-white">{formData.coachEmail}</span>.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href={`/events/${event?.slug}`}>
                <Button variant="outline">View Event</Button>
              </Link>
              <Link href="/events">
                <Button>Browse More Events</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const registrationClosed = event && new Date() > new Date(event.startDate)
  const stateOptions = [{ value: '', label: 'Select State' }, ...states]
  const divisionOpts = event && event.divisions && event.divisions.length > 0
    ? [{ value: '', label: 'Select Division' }, ...event.divisions.map(d => ({ value: d, label: d }))]
    : [{ value: '', label: 'Select Division' }, ...divisionOptions.map(d => ({ value: d, label: d }))]

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Hero Section */}
      <div className="relative bg-[#0A1D37] border-b border-white/10 pt-32">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Link */}
          <Link
            href={`/events/${event?.slug}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>

          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2">
            Team Registration
          </h1>
          <p className="text-gray-400 text-lg">
            Register your team for <span className="text-white">{event?.name}</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-2">
            {registrationClosed ? (
              <div className="bg-[#0A1D37] border border-white/10 rounded-sm p-8 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-xl font-heading font-bold text-white mb-2">Registration Closed</h2>
                <p className="text-gray-400">
                  This event has already started. Registration is no longer available.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-4">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </p>
                  </div>
                )}

                {/* Team Information */}
                <div className="bg-[#0A1D37] border border-white/10 rounded-sm p-6">
                  <h2 className="text-lg font-heading font-semibold text-white mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-eha-red" />
                    Team Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Team Name
                      </label>
                      <input
                        type="text"
                        name="teamName"
                        value={formData.teamName}
                        onChange={handleChange}
                        placeholder="e.g., Dallas Elite 17U"
                        className="w-full bg-[#0a1628] border border-white/10 rounded-sm px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-eha-red/50 transition-colors"
                      />
                      {formErrors.teamName && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.teamName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Division
                      </label>
                      <select
                        name="division"
                        value={formData.division}
                        onChange={handleChange}
                        className="w-full bg-[#0a1628] border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-eha-red/50 transition-colors"
                      >
                        {divisionOpts.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="City"
                          className="w-full bg-[#0a1628] border border-white/10 rounded-sm px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-eha-red/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                          State
                        </label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="w-full bg-[#0a1628] border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-eha-red/50 transition-colors"
                        >
                          {stateOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coach Information */}
                <div className="bg-[#0A1D37] border border-white/10 rounded-sm p-6">
                  <h2 className="text-lg font-heading font-semibold text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-eha-red" />
                    Coach Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Coach Name
                      </label>
                      <input
                        type="text"
                        name="coachName"
                        value={formData.coachName}
                        onChange={handleChange}
                        placeholder="Full name"
                        className="w-full bg-[#0a1628] border border-white/10 rounded-sm px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-eha-red/50 transition-colors"
                      />
                      {formErrors.coachName && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.coachName}</p>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          name="coachEmail"
                          value={formData.coachEmail}
                          onChange={handleChange}
                          placeholder="coach@example.com"
                          className="w-full bg-[#0a1628] border border-white/10 rounded-sm px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-eha-red/50 transition-colors"
                        />
                        {formErrors.coachEmail && (
                          <p className="text-red-400 text-xs mt-1">{formErrors.coachEmail}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                          Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          name="coachPhone"
                          value={formData.coachPhone}
                          onChange={handleChange}
                          placeholder="(555) 123-4567"
                          className="w-full bg-[#0a1628] border border-white/10 rounded-sm px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-eha-red/50 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <Button type="submit" size="lg" isLoading={isSubmitting}>
                    Register Team
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Event Info Sidebar */}
          <div>
            <div className="bg-[#0A1D37] border border-white/10 rounded-sm p-6 sticky top-24">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                Event Details
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-heading font-semibold text-white text-lg">{event?.name}</h3>
                  <Badge variant="orange" className="mt-2">{event?.type}</Badge>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-start gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-eha-red mt-0.5" />
                    <div className="text-gray-300">
                      {event && format(new Date(event.startDate), 'MMMM d')} -{' '}
                      {event && format(new Date(event.endDate), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>

                {(event?.venue || event?.city) && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-eha-red mt-0.5" />
                    <div className="text-gray-300">
                      {event.venue && <div>{event.venue}</div>}
                      {event.city && (
                        <div>
                          {event.city}{event.state && `, ${event.state}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {event && event.divisions && event.divisions.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Divisions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {event.divisions.map(d => (
                        <Badge key={d} size="sm" variant="info">{d}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {event?.entryFee && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                      Entry Fee
                    </div>
                    <div className="text-3xl font-heading font-bold text-white">
                      ${parseFloat(event.entryFee.toString()).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">per team</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
