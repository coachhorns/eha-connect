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
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CreditCard,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'

interface Team {
  id: string
  slug: string
  name: string
  ageGroup: string | null
  division: string | null
  coachName: string | null
  rosterCount: number
}

interface Program {
  id: string
  slug: string
  name: string
  logo: string | null
  teams: Team[]
}

interface Event {
  id: string
  slug: string
  name: string
  type: string
  venue: string | null
  city: string | null
  state: string | null
  startDate: string
  endDate: string
  ageGroups: string[]
  divisions: string[]
  entryFee: number | null
  isPublished: boolean
  teams: { team: { id: string } }[]
}

interface TimeConstraint {
  type: 'NOT_BEFORE' | 'NOT_AFTER' | 'NOT_BETWEEN'
  day: 'Friday' | 'Saturday' | 'Sunday'
  time: string
  endTime?: string
}

interface ScheduleRequest {
  coachConflict: boolean
  maxGamesPerDay: number | null
  constraints: TimeConstraint[]
}

type RegistrationStep = 'teams' | 'rosters' | 'payment' | 'complete'

export default function DirectorRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [event, setEvent] = useState<Event | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [step, setStep] = useState<RegistrationStep>('teams')
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set())
  const [rostersConfirmed, setRostersConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [scheduleRequests, setScheduleRequests] = useState<Map<string, ScheduleRequest>>(new Map())
  const [expandedScheduleIds, setExpandedScheduleIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      if (sessionStatus === 'loading') return

      if (sessionStatus === 'unauthenticated') {
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/events/${resolvedParams.slug}/register/director`)}&role=PROGRAM_DIRECTOR`)
        return
      }

      if (session?.user?.role !== 'PROGRAM_DIRECTOR') {
        router.push(`/events/${resolvedParams.slug}/register`)
        return
      }

      // Fetch both event and program data
      try {
        const [eventRes, programRes] = await Promise.all([
          fetch(`/api/public/events/${resolvedParams.slug}`),
          fetch('/api/director/program'),
        ])

        if (!eventRes.ok) {
          setError('Event not found')
          setIsLoading(false)
          return
        }

        const eventData = await eventRes.json()
        setEvent(eventData.event)

        if (!programRes.ok) {
          setError('Failed to load program')
          setIsLoading(false)
          return
        }

        const programData = await programRes.json()

        if (!programData.program) {
          // No program - redirect to onboarding
          const callbackUrl = `/events/${resolvedParams.slug}/register/director`
          router.push(`/director/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
          return
        }

        if (programData.program.teams.length === 0) {
          // No teams - redirect to onboarding
          const callbackUrl = `/events/${resolvedParams.slug}/register/director`
          router.push(`/director/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
          return
        }

        setProgram(programData.program)
        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data')
        setIsLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [sessionStatus, session, resolvedParams.slug, router])

  // Check if a team is eligible for the event
  const isTeamEligible = (team: Team): { eligible: boolean; reason?: string } => {
    if (!event) return { eligible: false, reason: 'Event not loaded' }

    // Check if already registered
    const alreadyRegistered = event.teams.some(et => et.team.id === team.id)
    if (alreadyRegistered) {
      return { eligible: false, reason: 'Already registered' }
    }

    // Check age group compatibility
    if (event.ageGroups.length > 0 && team.ageGroup) {
      if (!event.ageGroups.includes(team.ageGroup)) {
        return { eligible: false, reason: `Age group ${team.ageGroup} not accepted` }
      }
    }

    // Check division compatibility
    if (event.divisions.length > 0 && team.division) {
      if (!event.divisions.includes(team.division)) {
        return { eligible: false, reason: `Division ${team.division} not accepted` }
      }
    }

    return { eligible: true }
  }

  const toggleTeamSelection = (teamId: string) => {
    const newSelected = new Set(selectedTeamIds)
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId)
      const newMap = new Map(scheduleRequests)
      newMap.delete(teamId)
      setScheduleRequests(newMap)
      const newExpanded = new Set(expandedScheduleIds)
      newExpanded.delete(teamId)
      setExpandedScheduleIds(newExpanded)
    } else {
      newSelected.add(teamId)
    }
    setSelectedTeamIds(newSelected)
  }

  const toggleTeamExpand = (teamId: string) => {
    const newExpanded = new Set(expandedTeamIds)
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId)
    } else {
      newExpanded.add(teamId)
    }
    setExpandedTeamIds(newExpanded)
  }

  const toggleScheduleExpand = (teamId: string) => {
    const newExpanded = new Set(expandedScheduleIds)
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId)
    } else {
      newExpanded.add(teamId)
    }
    setExpandedScheduleIds(newExpanded)
  }

  const getScheduleRequest = (teamId: string): ScheduleRequest => {
    return scheduleRequests.get(teamId) || {
      coachConflict: false,
      maxGamesPerDay: null,
      constraints: [],
    }
  }

  const updateScheduleRequest = (teamId: string, updates: Partial<ScheduleRequest>) => {
    const newMap = new Map(scheduleRequests)
    const current = getScheduleRequest(teamId)
    newMap.set(teamId, { ...current, ...updates })
    setScheduleRequests(newMap)
  }

  const addConstraint = (teamId: string) => {
    const current = getScheduleRequest(teamId)
    updateScheduleRequest(teamId, {
      constraints: [
        ...current.constraints,
        { type: 'NOT_BEFORE', day: 'Saturday', time: '08:00' },
      ],
    })
  }

  const updateConstraint = (teamId: string, index: number, updates: Partial<TimeConstraint>) => {
    const current = getScheduleRequest(teamId)
    const newConstraints = [...current.constraints]
    newConstraints[index] = { ...newConstraints[index], ...updates }
    updateScheduleRequest(teamId, { constraints: newConstraints })
  }

  const removeConstraint = (teamId: string, index: number) => {
    const current = getScheduleRequest(teamId)
    const newConstraints = current.constraints.filter((_, i) => i !== index)
    updateScheduleRequest(teamId, { constraints: newConstraints })
  }

  const selectedTeams = program?.teams.filter(t => selectedTeamIds.has(t.id)) || []
  const totalFee = event?.entryFee ? Number(event.entryFee) * selectedTeams.length : 0
  const isFreeEvent = !event?.entryFee || Number(event.entryFee) === 0

  const handleCompleteRegistration = async () => {
    if (!event || selectedTeamIds.size === 0) return

    setIsSubmitting(true)
    setError('')

    try {
      // Build scheduleRequests payload - only include teams with non-default data
      const scheduleRequestsPayload: Record<string, ScheduleRequest> = {}
      for (const teamId of selectedTeamIds) {
        const sr = scheduleRequests.get(teamId)
        if (sr && (sr.coachConflict || sr.maxGamesPerDay !== null || sr.constraints.length > 0)) {
          scheduleRequestsPayload[teamId] = sr
        }
      }

      const res = await fetch(`/api/events/${event.id}/register-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: Array.from(selectedTeamIds),
          ...(Object.keys(scheduleRequestsPayload).length > 0
            ? { scheduleRequests: scheduleRequestsPayload }
            : {}),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setRegistrationSuccess(true)
        setStep('complete')
      } else {
        setError(data.error || 'Failed to register teams')
      }
    } catch (err) {
      console.error('Error registering teams:', err)
      setError('Failed to register teams. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && (!event || !program)) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <div className="max-w-2xl mx-auto px-4 pt-32 pb-16 text-center">
          <div className="bg-[#0A1D37] border border-white/10 rounded-xl p-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold text-white mb-2">Error</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link href="/events">
              <Button>Browse Events</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!event || !program) return null

  // Success state
  if (step === 'complete' && registrationSuccess) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
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
              Your teams have been registered for <span className="text-white font-semibold">{event.name}</span>
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-[#0A1D37] border border-white/10 rounded-xl p-8">
            <h2 className="text-lg font-semibold text-white mb-4">Registered Teams</h2>
            <div className="space-y-3 mb-6">
              {selectedTeams.map(team => (
                <div key={team.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="font-medium text-white">{team.name}</div>
                    <div className="text-sm text-gray-400">
                      {team.ageGroup && <span>{team.ageGroup}</span>}
                      {team.ageGroup && team.division && <span> • </span>}
                      {team.division && <span>{team.division}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <Link href={`/events/${event.slug}`}>
                <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/5">
                  View Event
                </Button>
              </Link>
              <Link href="/director/dashboard">
                <Button className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
          <Link
            href={`/events/${event.slug}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>

          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2">
            Register Teams
          </h1>
          <p className="text-gray-400 text-lg">
            Register your teams for <span className="text-white">{event.name}</span>
          </p>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 'teams' ? 'bg-[#E31837]' : 'bg-white/10'}`}>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">1</span>
              <span className="text-sm font-medium text-white">Select Teams</span>
            </div>
            <div className="w-4 h-0.5 bg-white/20" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 'rosters' ? 'bg-[#E31837]' : 'bg-white/10'}`}>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">2</span>
              <span className="text-sm font-medium text-white">Verify Rosters</span>
            </div>
            <div className="w-4 h-0.5 bg-white/20" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 'payment' ? 'bg-[#E31837]' : 'bg-white/10'}`}>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">3</span>
              <span className="text-sm font-medium text-white">{isFreeEvent ? 'Confirm' : 'Payment'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            {/* Step 1: Team Selection */}
            {step === 'teams' && (
              <div className="space-y-4">
                <div className="bg-[#0A1D37] border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#E31837]" />
                    Select Teams to Register
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Select the teams from your program that you want to register for this event.
                  </p>

                  <div className="space-y-3">
                    {program.teams.map(team => {
                      const { eligible, reason } = isTeamEligible(team)
                      const isSelected = selectedTeamIds.has(team.id)
                      const isAlreadyRegistered = reason === 'Already registered'

                      return (
                        <div
                          key={team.id}
                          className={`border rounded-xl overflow-hidden transition-all ${
                            isAlreadyRegistered
                              ? 'border-gray-600 bg-gray-800/30 opacity-60'
                              : !eligible
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : isSelected
                              ? 'border-[#E31837] bg-[#E31837]/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-4 p-4 ${
                              eligible && !isAlreadyRegistered ? 'cursor-pointer' : 'cursor-not-allowed'
                            }`}
                            onClick={() => eligible && !isAlreadyRegistered && toggleTeamSelection(team.id)}
                          >
                            {/* Checkbox */}
                            <div
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                                isAlreadyRegistered
                                  ? 'border-gray-500 bg-gray-700'
                                  : !eligible
                                  ? 'border-amber-500/50 bg-amber-500/10'
                                  : isSelected
                                  ? 'border-[#E31837] bg-[#E31837]'
                                  : 'border-white/30 hover:border-white/50'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                              {isAlreadyRegistered && <Check className="w-4 h-4 text-gray-400" />}
                            </div>

                            {/* Team Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">{team.name}</span>
                                {isAlreadyRegistered && (
                                  <Badge size="sm" variant="default">Registered</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                {team.ageGroup && <Badge size="sm">{team.ageGroup}</Badge>}
                                {team.division && <Badge size="sm" variant="info">{team.division}</Badge>}
                                {team.coachName && <span>Coach: {team.coachName}</span>}
                              </div>
                            </div>

                            {/* Roster Count */}
                            <div className="text-right flex-shrink-0">
                              <div className="flex items-center gap-1 text-sm text-gray-400">
                                <Users className="w-4 h-4" />
                                <span>{team.rosterCount} players</span>
                              </div>
                            </div>

                            {/* Eligibility Status */}
                            <div className="flex-shrink-0">
                              {isAlreadyRegistered ? (
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-gray-400" />
                                </div>
                              ) : eligible ? (
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-green-400" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ineligibility Reason */}
                          {!eligible && !isAlreadyRegistered && (
                            <div className="px-4 pb-4 pt-0">
                              <div className="text-sm text-amber-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {reason}
                              </div>
                            </div>
                          )}

                          {/* Schedule Requests - only for selected teams */}
                          {isSelected && (
                            <div className="border-t border-white/10">
                              <div
                                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleScheduleExpand(team.id)
                                }}
                              >
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4 text-[#E31837]" />
                                  <span className="text-gray-300 font-medium">Scheduling Restrictions</span>
                                  {(() => {
                                    const sr = getScheduleRequest(team.id)
                                    const count = (sr.coachConflict ? 1 : 0)
                                      + (sr.maxGamesPerDay !== null ? 1 : 0)
                                      + sr.constraints.length
                                    return count > 0 ? (
                                      <Badge size="sm" variant="orange">{count}</Badge>
                                    ) : null
                                  })()}
                                </div>
                                {expandedScheduleIds.has(team.id) ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </div>

                              {expandedScheduleIds.has(team.id) && (
                                <div className="px-4 pb-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                                  {/* Coach Conflict Checkbox */}
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <div
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                        getScheduleRequest(team.id).coachConflict
                                          ? 'border-[#E31837] bg-[#E31837]'
                                          : 'border-white/30 hover:border-white/50'
                                      }`}
                                      onClick={() =>
                                        updateScheduleRequest(team.id, {
                                          coachConflict: !getScheduleRequest(team.id).coachConflict,
                                        })
                                      }
                                    >
                                      {getScheduleRequest(team.id).coachConflict && (
                                        <Check className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-sm text-white">Coach has another team in this event</span>
                                      <p className="text-xs text-gray-500">
                                        Avoid scheduling conflicts with another team this coach runs
                                      </p>
                                    </div>
                                  </label>

                                  {/* Max Games Per Day */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                      Game Restrictions (Max Per Day)
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      placeholder="No limit"
                                      value={getScheduleRequest(team.id).maxGamesPerDay ?? ''}
                                      onChange={(e) =>
                                        updateScheduleRequest(team.id, {
                                          maxGamesPerDay: e.target.value ? parseInt(e.target.value) : null,
                                        })
                                      }
                                      className="w-full max-w-[200px] px-3 py-2 bg-[#1A1A2E] border border-[#A2AAAD]/20 rounded-lg text-white placeholder-gray-500 text-sm transition-all duration-200 focus:outline-none focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                                    />
                                  </div>

                                  {/* Time Constraints */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <label className="text-sm font-medium text-gray-300">
                                        Date/Time Restrictions
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => addConstraint(team.id)}
                                        className="flex items-center gap-1 text-xs text-[#E31837] hover:text-white transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Restriction
                                      </button>
                                    </div>

                                    {getScheduleRequest(team.id).constraints.length === 0 && (
                                      <p className="text-xs text-gray-500 italic">No date/time restrictions added</p>
                                    )}

                                    <div className="space-y-2">
                                      {getScheduleRequest(team.id).constraints.map((constraint, idx) => (
                                        <div
                                          key={idx}
                                          className="flex flex-wrap items-center gap-2 p-2.5 bg-white/5 rounded-lg"
                                        >
                                          <select
                                            value={constraint.type}
                                            onChange={(e) =>
                                              updateConstraint(team.id, idx, {
                                                type: e.target.value as TimeConstraint['type'],
                                              })
                                            }
                                            className="px-2 py-1.5 bg-[#1A1A2E] border border-[#A2AAAD]/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                                          >
                                            <option value="NOT_BEFORE">Not Before</option>
                                            <option value="NOT_AFTER">Not After</option>
                                            <option value="NOT_BETWEEN">Not Between</option>
                                          </select>

                                          <select
                                            value={constraint.day}
                                            onChange={(e) =>
                                              updateConstraint(team.id, idx, {
                                                day: e.target.value as TimeConstraint['day'],
                                              })
                                            }
                                            className="px-2 py-1.5 bg-[#1A1A2E] border border-[#A2AAAD]/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                                          >
                                            <option value="Friday">Friday</option>
                                            <option value="Saturday">Saturday</option>
                                            <option value="Sunday">Sunday</option>
                                          </select>

                                          <input
                                            type="time"
                                            value={constraint.time}
                                            onChange={(e) =>
                                              updateConstraint(team.id, idx, { time: e.target.value })
                                            }
                                            className="px-2 py-1.5 bg-[#1A1A2E] border border-[#A2AAAD]/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                                          />

                                          {constraint.type === 'NOT_BETWEEN' && (
                                            <>
                                              <span className="text-gray-500 text-xs">to</span>
                                              <input
                                                type="time"
                                                value={constraint.endTime || ''}
                                                onChange={(e) =>
                                                  updateConstraint(team.id, idx, { endTime: e.target.value })
                                                }
                                                className="px-2 py-1.5 bg-[#1A1A2E] border border-[#A2AAAD]/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                                              />
                                            </>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => removeConstraint(team.id, idx)}
                                            className="p-1 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 ml-auto"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {program.teams.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">You don't have any teams yet.</p>
                      <Link href={`/director/teams/new?programId=${program.id}`}>
                        <Button>Add Team</Button>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep('rosters')}
                    disabled={selectedTeamIds.size === 0}
                    className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
                  >
                    Continue to Roster Verification
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Roster Verification */}
            {step === 'rosters' && (
              <div className="space-y-4">
                <div className="bg-[#0A1D37] border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#E31837]" />
                    Verify Rosters
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Please verify that the rosters for your selected teams are up to date.
                  </p>

                  <div className="space-y-3">
                    {selectedTeams.map(team => {
                      const isExpanded = expandedTeamIds.has(team.id)
                      const hasEmptyRoster = team.rosterCount === 0

                      return (
                        <div key={team.id} className="border border-white/10 rounded-xl overflow-hidden">
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
                            onClick={() => toggleTeamExpand(team.id)}
                          >
                            <div className="flex items-center gap-3">
                              {hasEmptyRoster ? (
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-green-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white">{team.name}</div>
                                <div className="text-sm text-gray-400">
                                  {team.rosterCount} players
                                  {hasEmptyRoster && (
                                    <span className="text-amber-400 ml-2">- Roster is empty!</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/director/teams/${team.id}`}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-[#E31837] hover:text-white flex items-center gap-1"
                              >
                                Edit Roster
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0 border-t border-white/10">
                              {hasEmptyRoster ? (
                                <div className="py-4 text-center text-gray-400">
                                  <p className="mb-3">No players on this roster yet.</p>
                                  <Link
                                    href={`/director/teams/${team.id}`}
                                    target="_blank"
                                  >
                                    <Button size="sm">Add Players</Button>
                                  </Link>
                                </div>
                              ) : (
                                <div className="py-3 text-sm text-gray-400">
                                  <p>Roster has {team.rosterCount} player{team.rosterCount !== 1 ? 's' : ''}.</p>
                                  <p className="mt-1">Click "Edit Roster" to make changes.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Confirmation Checkbox */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          rostersConfirmed
                            ? 'border-[#E31837] bg-[#E31837]'
                            : 'border-white/30 hover:border-white/50'
                        }`}
                        onClick={() => setRostersConfirmed(!rostersConfirmed)}
                      >
                        {rostersConfirmed && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className="text-gray-300 text-sm">
                        I confirm that all rosters are up-to-date and accurate. I understand that rosters may be verified before or during the event.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep('teams')}
                    className="border-white/20 text-gray-300 hover:bg-white/5"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('payment')}
                    disabled={!rostersConfirmed}
                    className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
                  >
                    Continue to {isFreeEvent ? 'Confirmation' : 'Payment'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Payment Summary / Confirmation */}
            {step === 'payment' && (
              <div className="space-y-4">
                <div className="bg-[#0A1D37] border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#E31837]" />
                    {isFreeEvent ? 'Confirm Registration' : 'Payment Summary'}
                  </h2>

                  {/* Registration Summary */}
                  <div className="space-y-3 mb-6">
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Teams</div>
                    {selectedTeams.map(team => (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <div className="font-medium text-white">{team.name}</div>
                          <div className="text-sm text-gray-400">
                            {team.ageGroup && <span>{team.ageGroup}</span>}
                            {team.ageGroup && team.division && <span> • </span>}
                            {team.division && <span>{team.division}</span>}
                          </div>
                        </div>
                        {!isFreeEvent && event.entryFee && (
                          <div className="text-white font-medium">
                            ${Number(event.entryFee).toFixed(0)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  {!isFreeEvent && (
                    <div className="border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between text-lg">
                        <span className="text-gray-300">Total</span>
                        <span className="text-white font-bold text-2xl">${totalFee.toFixed(0)}</span>
                      </div>
                      <p className="text-sm text-amber-400 mt-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Payment integration coming soon. Click "Complete Registration" to register without payment.
                      </p>
                    </div>
                  )}

                  {isFreeEvent && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <p className="text-green-400 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        This is a free event - no payment required!
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep('rosters')}
                    className="border-white/20 text-gray-300 hover:bg-white/5"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleCompleteRegistration}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Complete Registration
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-[#0A1D37] border border-white/10 rounded-xl p-6 sticky top-24">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                Event Details
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-heading font-semibold text-white text-lg">{event.name}</h3>
                  <Badge variant="orange" className="mt-2">{event.type}</Badge>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-start gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-[#E31837] mt-0.5" />
                    <div className="text-gray-300">
                      {format(new Date(event.startDate), 'MMMM d')} -{' '}
                      {format(new Date(event.endDate), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>

                {(event.venue || event.city) && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-[#E31837] mt-0.5" />
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

                {event.ageGroups && event.ageGroups.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Age Groups
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {event.ageGroups.map(ag => (
                        <Badge key={ag} size="sm">{ag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {event.divisions && event.divisions.length > 0 && (
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

                {event.entryFee && Number(event.entryFee) > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                      Entry Fee
                    </div>
                    <div className="text-3xl font-heading font-bold text-white">
                      ${Number(event.entryFee).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">per team</div>
                  </div>
                )}

                {/* Selection Summary */}
                {selectedTeamIds.size > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Selected
                    </div>
                    <div className="text-2xl font-heading font-bold text-white">
                      {selectedTeamIds.size} team{selectedTeamIds.size !== 1 ? 's' : ''}
                    </div>
                    {!isFreeEvent && (
                      <div className="text-sm text-gray-400 mt-1">
                        Total: ${totalFee.toFixed(0)}
                      </div>
                    )}
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
