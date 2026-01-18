'use client'

import { useState, useEffect, use } from 'react'
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
} from 'lucide-react'
import { Card, Button, Input, Select, Badge } from '@/components/ui'
import { states, ageGroups as ageGroupOptions, divisions as divisionOptions } from '@/lib/constants'

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
  ageGroups: string[]
  divisions: string[]
  entryFee: number | null
  isPublished: boolean
}

export default function EventRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    teamName: '',
    organization: '',
    ageGroup: '',
    division: '',
    city: '',
    state: '',
    coachName: '',
    coachEmail: '',
    coachPhone: '',
  })

  useEffect(() => {
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

    fetchEvent()
  }, [resolvedParams.slug])

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
    if (event?.ageGroups.length && !formData.ageGroup) {
      errors.ageGroup = 'Please select an age group'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <Link href="/events">
          <Button>Browse Events</Button>
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Registration Complete!</h1>
          <p className="text-gray-400 mb-6">
            Your team has been registered for <strong className="text-white">{event?.name}</strong>.
            You will receive a confirmation email at {formData.coachEmail}.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={`/events/${event?.slug}`}>
              <Button variant="outline">View Event</Button>
            </Link>
            <Link href="/events">
              <Button>Browse More Events</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const registrationClosed = event && new Date() > new Date(event.startDate)
  const stateOptions = [{ value: '', label: 'Select State' }, ...states]
  const ageOptions = event && event.ageGroups && event.ageGroups.length > 0
    ? [{ value: '', label: 'Select Age Group' }, ...event.ageGroups.map(ag => ({ value: ag, label: ag }))]
    : [{ value: '', label: 'Select Age Group' }, ...ageGroupOptions.map(ag => ({ value: ag, label: ag }))]
  const divisionOpts = event && event.divisions && event.divisions.length > 0
    ? [{ value: '', label: 'Select Division (optional)' }, ...event.divisions.map(d => ({ value: d, label: d }))]
    : [{ value: '', label: 'Select Division (optional)' }, ...divisionOptions.map(d => ({ value: d, label: d }))]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        href={`/events/${event?.slug}`}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Event
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-wider">Team Registration</h1>
          <p className="text-gray-400 mb-8">Register your team for {event?.name}</p>

          {registrationClosed ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Registration Closed</h2>
              <p className="text-gray-400">
                This event has already started. Registration is no longer available.
              </p>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}

              {/* Team Information */}
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-white" />
                  Team Information
                </h2>
                <div className="space-y-4">
                  <Input
                    label="Team Name"
                    name="teamName"
                    value={formData.teamName}
                    onChange={handleChange}
                    error={formErrors.teamName}
                    placeholder="e.g., Dallas Elite 17U"
                  />
                  <Input
                    label="Organization/Club (Optional)"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    placeholder="e.g., Dallas Youth Basketball"
                  />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Select
                      label="Age Group"
                      name="ageGroup"
                      options={ageOptions}
                      value={formData.ageGroup}
                      onChange={handleChange}
                      error={formErrors.ageGroup}
                    />
                    <Select
                      label="Division"
                      name="division"
                      options={divisionOpts}
                      value={formData.division}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                    />
                    <Select
                      label="State"
                      name="state"
                      options={stateOptions}
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </Card>

              {/* Coach Information */}
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4">Coach Information</h2>
                <div className="space-y-4">
                  <Input
                    label="Coach Name"
                    name="coachName"
                    value={formData.coachName}
                    onChange={handleChange}
                    error={formErrors.coachName}
                    placeholder="Full name"
                  />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      name="coachEmail"
                      type="email"
                      value={formData.coachEmail}
                      onChange={handleChange}
                      error={formErrors.coachEmail}
                      placeholder="coach@example.com"
                    />
                    <Input
                      label="Phone (Optional)"
                      name="coachPhone"
                      type="tel"
                      value={formData.coachPhone}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </Card>

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
          <Card className="sticky top-24">
            <h2 className="text-lg font-semibold text-white mb-4">Event Details</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-white">{event?.name}</h3>
                <Badge variant="orange" className="mt-1">{event?.type}</Badge>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="text-gray-400">
                  {event && format(new Date(event.startDate), 'MMMM d')} -{' '}
                  {event && format(new Date(event.endDate), 'MMMM d, yyyy')}
                </div>
              </div>

              {(event?.venue || event?.city) && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="text-gray-400">
                    {event.venue && <div>{event.venue}</div>}
                    {event.city && (
                      <div>
                        {event.city}{event.state && `, ${event.state}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {event && event.ageGroups && event.ageGroups.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Age Groups</div>
                  <div className="flex flex-wrap gap-1">
                    {event.ageGroups.map(ag => (
                      <Badge key={ag} size="sm">{ag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {event && event.divisions && event.divisions.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Divisions</div>
                  <div className="flex flex-wrap gap-1">
                    {event.divisions.map(d => (
                      <Badge key={d} size="sm" variant="info">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {event?.entryFee && (
                <div className="pt-4 border-t border-[#252540]">
                  <div className="text-sm text-gray-500">Entry Fee</div>
                  <div className="text-2xl font-bold text-white">
                    ${parseFloat(event.entryFee.toString()).toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">per team</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
