'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, CheckCircle, ChevronRight, BookOpen, Users, Mail, BarChart3, Printer } from 'lucide-react'
import { Button, Input, Badge } from '@/components/ui'
import { getPacketPrice } from '@/lib/constants'

interface CollegeCoachResult {
  id: string
  firstName: string
  lastName: string
  title: string | null
  email: string | null
  college: {
    id: string
    name: string
    division: string
    conference: string | null
    state: string | null
  }
}

interface RecruitingPacketModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventSlug: string
  eventName: string
}

export default function RecruitingPacketModal({
  isOpen,
  onClose,
  eventId,
  eventSlug,
  eventName,
}: RecruitingPacketModalProps) {
  const [step, setStep] = useState<'form' | 'summary' | 'checkout'>('form')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [school, setSchool] = useState('')
  const [email, setEmail] = useState('')
  const [division, setDivision] = useState('')
  const [collegeCoachId, setCollegeCoachId] = useState<string | null>(null)
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [wantsPhysicalCopy, setWantsPhysicalCopy] = useState(false)

  const [suggestions, setSuggestions] = useState<CollegeCoachResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedCoach, setConfirmedCoach] = useState<CollegeCoachResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Debounced coach search
  const searchCoaches = useCallback(async () => {
    if (confirmedCoach) return
    if (firstName.length < 2 && lastName.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    try {
      const params = new URLSearchParams()
      if (firstName) params.set('firstName', firstName)
      if (lastName) params.set('lastName', lastName)
      if (school) params.set('school', school)

      const res = await fetch(`/api/recruiting-packet/search-coach?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.coaches)
        setShowSuggestions(data.coaches.length > 0)
      }
    } catch {
      // Silently fail search
    } finally {
      setIsSearching(false)
    }
  }, [firstName, lastName, school, confirmedCoach])

  useEffect(() => {
    const timer = setTimeout(searchCoaches, 300)
    return () => clearTimeout(timer)
  }, [searchCoaches])

  const handleSelectCoach = (coach: CollegeCoachResult) => {
    setConfirmedCoach(coach)
    setFirstName(coach.firstName)
    setLastName(coach.lastName)
    setSchool(coach.college.name)
    setEmail(coach.email || '')
    setDivision(coach.college.division)
    setCollegeCoachId(coach.id)
    setCollegeId(coach.college.id)
    setShowSuggestions(false)
  }

  const handleClearCoach = () => {
    setConfirmedCoach(null)
    setCollegeCoachId(null)
    setCollegeId(null)
    setDivision('')
  }

  const validateForm = (): boolean => {
    if (!firstName.trim() || !lastName.trim() || !school.trim() || !email.trim()) {
      setError('All fields are required')
      return false
    }
    const emailDomain = email.split('@')[1]?.toLowerCase() || ''
    if (!emailDomain.endsWith('.edu')) {
      setError('A valid .edu email address is required')
      return false
    }
    if (!division) {
      setError('School division could not be determined. Please select your profile from the suggestions or contact support.')
      return false
    }
    setError('')
    return true
  }

  const handleProceedToSummary = () => {
    if (validateForm()) {
      setStep('summary')
    }
  }

  const handleCheckout = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/recruiting-packet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          school: school.trim(),
          email: email.trim().toLowerCase(),
          division,
          collegeCoachId,
          collegeId,
          wantsPhysicalCopy,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setIsSubmitting(false)
        return
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Failed to create checkout session. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const price = getPacketPrice(division) / 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-modal-bg backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div>
            <h2 className="text-lg font-heading font-bold text-text-primary">
              {step === 'form' && 'College Recruiting Packet'}
              {step === 'summary' && 'Packet Summary'}
            </h2>
            <p className="text-sm text-text-muted mt-0.5">{eventName}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Step 1: Form */}
          {step === 'form' && (
            <div className="space-y-4">
              {confirmedCoach && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {confirmedCoach.firstName} {confirmedCoach.lastName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {confirmedCoach.title && `${confirmedCoach.title} · `}
                      {confirmedCoach.college.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {confirmedCoach.college.division}
                      {confirmedCoach.college.conference && ` · ${confirmedCoach.college.conference}`}
                    </p>
                  </div>
                  <button
                    onClick={handleClearCoach}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); if (confirmedCoach) handleClearCoach() }}
                  placeholder="John"
                  disabled={!!confirmedCoach}
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); if (confirmedCoach) handleClearCoach() }}
                  placeholder="Smith"
                  disabled={!!confirmedCoach}
                />
              </div>

              <Input
                label="School"
                value={school}
                onChange={(e) => { setSchool(e.target.value); if (confirmedCoach) handleClearCoach() }}
                placeholder="University of..."
                disabled={!!confirmedCoach}
                icon={<Search className="w-4 h-4" />}
              />

              <Input
                label="School Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@university.edu"
                helperText="Must be a .edu email address"
                disabled={!!confirmedCoach}
              />

              {/* Autocomplete suggestions */}
              {showSuggestions && !confirmedCoach && (
                <div className="bg-surface-raised border border-border-default rounded-xl overflow-hidden">
                  <p className="px-4 py-2 text-xs font-semibold text-amber-400 uppercase tracking-wider border-b border-white/10">
                    Is this you?
                  </p>
                  {suggestions.map((coach) => (
                    <button
                      key={coach.id}
                      onClick={() => handleSelectCoach(coach)}
                      className="w-full px-4 py-3 text-left hover:bg-surface-glass transition-colors border-b border-border-subtle last:border-0"
                    >
                      <p className="text-sm font-semibold text-text-primary">
                        {coach.firstName} {coach.lastName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {coach.title && `${coach.title} · `}
                        {coach.college.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {coach.college.division}
                        {coach.college.state && ` · ${coach.college.state}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {isSearching && (
                <p className="text-xs text-text-muted flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-eha-red border-t-transparent rounded-full animate-spin" />
                  Searching coaches...
                </p>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Summary */}
          {step === 'summary' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
                  What&apos;s Included
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-text-secondary">
                    <Users className="w-4 h-4 text-eha-red mt-0.5 shrink-0" />
                    Up-to-date rosters for all participating teams
                  </li>
                  <li className="flex items-start gap-3 text-sm text-text-secondary">
                    <Mail className="w-4 h-4 text-eha-red mt-0.5 shrink-0" />
                    Player information and email contacts
                  </li>
                  <li className="flex items-start gap-3 text-sm text-text-secondary">
                    <BookOpen className="w-4 h-4 text-eha-red mt-0.5 shrink-0" />
                    Coaches and directors emails for all programs
                  </li>
                  <li className="flex items-start gap-3 text-sm text-text-secondary">
                    <BarChart3 className="w-4 h-4 text-eha-red mt-0.5 shrink-0" />
                    Live stats throughout the event
                  </li>
                </ul>
              </div>

              <div className="bg-surface-glass border border-border-default rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-muted">Division</span>
                  <Badge variant="info" size="sm">
                    {division}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Total</span>
                  <span className="text-2xl font-heading font-bold text-text-primary">
                    ${price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Physical copy option */}
              <label className="flex items-start gap-3 bg-surface-glass border border-border-default rounded-xl p-4 cursor-pointer hover:bg-surface-overlay transition-colors">
                <input
                  type="checkbox"
                  checked={wantsPhysicalCopy}
                  onChange={(e) => setWantsPhysicalCopy(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded-sm border-border-default bg-page-bg text-eha-red focus:ring-eha-red"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-text-primary">
                      Request a physical printed copy
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    A printed recruiting packet booklet will be available for you at check-in when you arrive to the event.
                  </p>
                </div>
              </label>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default flex items-center justify-between">
          {step === 'summary' && (
            <button
              onClick={() => { setStep('form'); setError('') }}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Back
            </button>
          )}
          {step === 'form' && <div />}

          {step === 'form' && (
            <Button onClick={handleProceedToSummary} className="flex items-center gap-2">
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          {step === 'summary' && (
            <Button
              onClick={handleCheckout}
              isLoading={isSubmitting}
              className="flex items-center gap-2"
            >
              Proceed to Payment
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
