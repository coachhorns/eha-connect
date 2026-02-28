'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Mail, ChevronRight, ArrowLeft, GraduationCap, Search, Building2, Send, CheckCircle, Check } from 'lucide-react'
import { Select, Button } from '@/components/ui'

interface Player {
  firstName: string
  lastName: string
  graduationYear?: number | null
  slug: string
}

interface RosterPlayer extends Player {
  teamName?: string
  primaryPosition?: string | null
}

interface College {
  id: string
  name: string
  city: string | null
  state: string | null
  conference: string | null
  division: string
}

interface Coach {
  id: string
  firstName: string
  lastName: string
  title: string | null
  email: string | null
}

interface CollegeDetail extends College {
  coaches: Coach[]
}

interface RecruitingModalProps {
  allPlayers: RosterPlayer[]
  isOpen: boolean
  onClose: () => void
  onEmailSent?: () => void
}

export default function RecruitingModal({ allPlayers, isOpen, onClose, onEmailSent }: RecruitingModalProps) {
  // Player selection state (first step)
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
  const [players, setPlayers] = useState<Player[]>([])

  const [divisions, setDivisions] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])

  const [selectedDivision, setSelectedDivision] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedConference, setSelectedConference] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<College[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [colleges, setColleges] = useState<College[]>([])
  const [selectedCollege, setSelectedCollege] = useState<CollegeDetail | null>(null)

  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  const [isLoadingColleges, setIsLoadingColleges] = useState(false)
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(false)

  // Compose state
  const [composingCoach, setComposingCoach] = useState<Coach | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)

  const isMultiPlayer = players.length > 1
  const playerNames = players.map(p => `${p.firstName} ${p.lastName}`).join(', ')

  // Fetch filter options on open
  useEffect(() => {
    if (!isOpen) return

    const fetchFilters = async () => {
      setIsLoadingFilters(true)
      try {
        const res = await fetch('/api/colleges')
        const data = await res.json()
        setDivisions(data.divisions || [])
        setStates(data.states || [])
      } catch (err) {
        console.error('Failed to fetch filters:', err)
      } finally {
        setIsLoadingFilters(false)
      }
    }

    fetchFilters()
  }, [isOpen])

  // Fetch colleges when filters change
  const fetchColleges = useCallback(async () => {
    if (!selectedDivision && !selectedState) return

    setIsLoadingColleges(true)
    setSelectedCollege(null)

    const params = new URLSearchParams()
    if (selectedDivision) params.set('division', selectedDivision)
    if (selectedState) params.set('state', selectedState)
    if (selectedConference) params.set('conference', selectedConference)

    try {
      const res = await fetch(`/api/colleges?${params}`)
      const data = await res.json()
      setColleges(data.colleges || [])
    } catch (err) {
      console.error('Failed to fetch colleges:', err)
    } finally {
      setIsLoadingColleges(false)
    }
  }, [selectedDivision, selectedState, selectedConference])

  useEffect(() => {
    fetchColleges()
  }, [fetchColleges])

  // Debounced search by school name
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/colleges?search=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data.colleges || [])
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch coaches when a college is selected
  const handleSelectCollege = async (collegeId: string) => {
    setIsLoadingCoaches(true)
    try {
      const res = await fetch(`/api/colleges?schoolId=${collegeId}`)
      const data = await res.json()
      setSelectedCollege(data.college || null)
    } catch (err) {
      console.error('Failed to fetch coaches:', err)
    } finally {
      setIsLoadingCoaches(false)
    }
  }

  const handleStartCompose = (coach: Coach) => {
    setComposingCoach(coach)

    if (isMultiPlayer) {
      const names = players.map(p => `${p.firstName} ${p.lastName}`).join(', ')
      setEmailSubject(`Recruiting Profiles: ${names}`)
      setEmailBody(
        `Coach ${coach.lastName},\n\nI would like to introduce the following players and express their interest in your basketball program:\n\n${players.map(p => `- ${p.firstName} ${p.lastName}${p.graduationYear ? ` (Class of ${p.graduationYear})` : ''}`).join('\n')}\n\nThank you for your time and consideration.`
      )
    } else {
      const player = players[0]
      setEmailSubject(
        `Recruiting Profile: ${player.firstName} ${player.lastName} - ${player.graduationYear || ''}`
      )
      setEmailBody(
        `Coach ${coach.lastName},\n\nI would like to introduce myself and express my interest in your basketball program.\n\nThank you for your time and consideration.\n\nSincerely,\n${player.firstName} ${player.lastName}`
      )
    }

    setSendError('')
    setSendSuccess(false)
  }

  const handleSendEmail = async () => {
    if (!composingCoach?.email || !emailSubject.trim() || !emailBody.trim()) return

    setIsSending(true)
    setSendError('')

    try {
      const res = await fetch('/api/recruiting/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachEmail: composingCoach.email,
          coachName: `${composingCoach.firstName} ${composingCoach.lastName}`,
          coachId: composingCoach.id,
          collegeId: selectedCollege?.id || null,
          collegeName: selectedCollege?.name || '',
          playerSlugs: players.map(p => p.slug),
          subject: emailSubject,
          message: emailBody,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSendError(data.error || 'Failed to send email')
        return
      }

      setSendSuccess(true)
      onEmailSent?.()
      setTimeout(() => {
        setComposingCoach(null)
        setSendSuccess(false)
      }, 2000)
    } catch (err) {
      setSendError('Failed to send email. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleBackFromCompose = () => {
    setComposingCoach(null)
    setEmailSubject('')
    setEmailBody('')
    setSendError('')
    setSendSuccess(false)
  }

  const handleClose = () => {
    setSelectedSlugs(new Set())
    setPlayers([])
    setSelectedDivision('')
    setSelectedState('')
    setSelectedConference('')
    setSearchQuery('')
    setSearchResults([])
    setColleges([])
    setSelectedCollege(null)
    setComposingCoach(null)
    setEmailSubject('')
    setEmailBody('')
    setSendError('')
    setSendSuccess(false)
    onClose()
  }

  const togglePlayerSelection = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedSlugs.size === allPlayers.length) {
      setSelectedSlugs(new Set())
    } else {
      setSelectedSlugs(new Set(allPlayers.map((p) => p.slug)))
    }
  }

  const handleContinueWithPlayers = () => {
    if (selectedSlugs.size === 0) return
    const selected = allPlayers.filter((p) => selectedSlugs.has(p.slug))
    setPlayers(selected)
  }

  const handleBackToPlayerSelection = () => {
    setPlayers([])
    setSelectedDivision('')
    setSelectedState('')
    setSelectedConference('')
    setSearchQuery('')
    setSearchResults([])
    setColleges([])
    setSelectedCollege(null)
    setComposingCoach(null)
  }

  if (!isOpen) return null

  // Derive unique conferences from current results for the filter
  const conferenceOptions = Array.from(
    new Set(colleges.map((c) => c.conference).filter(Boolean))
  ).sort() as string[]

  // Determine header based on current view
  const getHeader = () => {
    if (players.length === 0) {
      return {
        title: 'Select Players',
        subtitle: 'Choose which players to include in this email',
        showBack: false,
      }
    }
    if (composingCoach) {
      return {
        title: `Email ${composingCoach.firstName} ${composingCoach.lastName}`,
        subtitle: selectedCollege
          ? `${selectedCollege.name} • ${composingCoach.title || 'Coach'}`
          : composingCoach.title || 'Coach',
        showBack: true,
      }
    }
    if (selectedCollege) {
      return {
        title: selectedCollege.name,
        subtitle: `${selectedCollege.division}${selectedCollege.conference ? ` • ${selectedCollege.conference}` : ''}`,
        showBack: true,
      }
    }
    return {
      title: isMultiPlayer ? 'Share Profiles with College Coach' : 'Share Profile with College Coach',
      subtitle: isMultiPlayer
        ? `Sending ${players.length} player profiles`
        : 'Find a college and email your profile to their coaching staff',
      showBack: true,
    }
  }

  const header = getHeader()

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl bg-page-bg/95 backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0">
            <div className="flex items-center gap-3">
              {header.showBack && (
                <button
                  onClick={
                    composingCoach
                      ? handleBackFromCompose
                      : selectedCollege
                        ? () => setSelectedCollege(null)
                        : handleBackToPlayerSelection
                  }
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-heading font-bold text-text-primary">
                  {header.title}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {header.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Player Selection Step — grouped by team */}
            {players.length === 0 ? (
              <div>
                {/* Players grouped by team */}
                <div className="max-h-[450px] overflow-y-auto">
                  {(() => {
                    // Group players by team, sorted oldest age group first
                    const teamMap = new Map<string, RosterPlayer[]>()
                    for (const p of allPlayers) {
                      const team = p.teamName || 'Unassigned'
                      if (!teamMap.has(team)) teamMap.set(team, [])
                      teamMap.get(team)!.push(p)
                    }

                    // Sort teams: extract age number, descending (oldest first)
                    const sortedTeams = Array.from(teamMap.entries()).sort(([a], [b]) => {
                      const ageA = parseInt(a.match(/(\d{2})U?\b/i)?.[1] || '0', 10)
                      const ageB = parseInt(b.match(/(\d{2})U?\b/i)?.[1] || '0', 10)
                      if (ageB !== ageA) return ageB - ageA
                      return a.localeCompare(b)
                    })

                    return sortedTeams.map(([teamName, teamPlayers]) => {
                      const teamSlugs = teamPlayers.map((p) => p.slug)
                      const allTeamSelected = teamSlugs.every((s) => selectedSlugs.has(s))
                      const someTeamSelected = teamSlugs.some((s) => selectedSlugs.has(s))

                      const toggleTeam = () => {
                        setSelectedSlugs((prev) => {
                          const next = new Set(prev)
                          if (allTeamSelected) {
                            teamSlugs.forEach((s) => next.delete(s))
                          } else {
                            teamSlugs.forEach((s) => next.add(s))
                          }
                          return next
                        })
                      }

                      return (
                        <div key={teamName}>
                          {/* Team Header */}
                          <div className="sticky top-0 z-10 px-5 py-2.5 bg-page-bg border-b border-border-default flex items-center gap-3">
                            <button
                              onClick={toggleTeam}
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                allTeamSelected
                                  ? 'bg-amber-500 border-amber-500'
                                  : someTeamSelected
                                    ? 'bg-amber-500/40 border-amber-500'
                                    : 'border-border-default hover:border-white/40'
                              }`}
                            >
                              {(allTeamSelected || someTeamSelected) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </button>
                            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                              {teamName}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              ({teamPlayers.length})
                            </span>
                          </div>

                          {/* Team Players */}
                          <div className="divide-y divide-border-subtle">
                            {teamPlayers.map((player) => {
                              const isSelected = selectedSlugs.has(player.slug)
                              return (
                                <button
                                  key={player.slug}
                                  onClick={() => togglePlayerSelection(player.slug)}
                                  className={`w-full flex items-center gap-3 px-6 py-2.5 text-left transition-colors ${
                                    isSelected ? 'bg-amber-500/5' : 'hover:bg-white/[0.02]'
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-amber-500 border-amber-500'
                                      : 'border-border-default'
                                  }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate">
                                      {player.firstName} {player.lastName}
                                    </p>
                                    <p className="text-[10px] text-text-muted truncate">
                                      {[
                                        player.primaryPosition,
                                        player.graduationYear ? `Class of ${player.graduationYear}` : null,
                                      ].filter(Boolean).join(' \u2022 ')}
                                    </p>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>

                {/* Continue Button */}
                <div className="px-6 py-4 border-t border-border-default">
                  <Button
                    onClick={handleContinueWithPlayers}
                    disabled={selectedSlugs.size === 0}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue with {selectedSlugs.size} Player{selectedSlugs.size !== 1 ? 's' : ''}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : composingCoach ? (
              <div className="p-6 space-y-4">
                {sendSuccess ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
                    <p className="text-text-primary font-semibold text-lg">Message Sent!</p>
                    <p className="text-text-muted text-sm mt-1">
                      Your email has been delivered to {composingCoach.firstName} {composingCoach.lastName}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        To
                      </label>
                      <div className="px-4 py-2.5 bg-surface-glass border border-border-default rounded-lg text-sm text-text-muted">
                        {composingCoach.email}
                      </div>
                    </div>

                    {isMultiPlayer && (
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          Players Included
                        </label>
                        <div className="px-4 py-2.5 bg-surface-glass border border-border-default rounded-lg text-sm text-text-muted">
                          {playerNames}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-4 py-2.5 bg-input-bg border border-eha-silver/20 rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        Message
                      </label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2.5 bg-input-bg border border-eha-silver/20 rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all duration-200 resize-none"
                      />
                      <p className="text-xs text-text-muted mt-1.5">
                        {isMultiPlayer
                          ? 'Links to all player profiles will be included automatically.'
                          : 'A link to your player profile will be included automatically.'}
                      </p>
                    </div>

                    {sendError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-300 text-sm">{sendError}</p>
                      </div>
                    )}

                    <p className="text-xs text-text-muted leading-relaxed">
                      By sending this message, you consent to sharing player profile information with the selected coach in accordance with our{' '}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#E31837] hover:text-text-primary transition-colors"
                      >
                        Privacy Policy
                      </a>.
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleBackFromCompose}
                        className="px-4 py-2.5 text-text-muted hover:text-text-primary text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={handleSendEmail}
                        disabled={!emailSubject.trim() || !emailBody.trim() || isSending}
                        isLoading={isSending}
                        className="flex-1"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : selectedCollege ? (
              /* Coach List View */
              <div>
                {isLoadingCoaches ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-[#E31837] border-t-transparent rounded-full" />
                  </div>
                ) : selectedCollege.coaches.length === 0 ? (
                  <div className="p-8 text-center">
                    <GraduationCap className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-primary font-medium mb-1">No Coaches Listed</p>
                    <p className="text-xs text-text-muted">
                      No coaching staff data is available for this school yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {selectedCollege.coaches.map((coach) => (
                      <div
                        key={coach.id}
                        className="flex items-center gap-4 px-6 py-4"
                      >
                        <div className="w-10 h-10 bg-eha-red/20 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-eha-red">
                            {coach.firstName.charAt(0)}{coach.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {coach.firstName} {coach.lastName}
                          </p>
                          {coach.title && (
                            <p className="text-xs text-text-muted truncate">{coach.title}</p>
                          )}
                        </div>
                        {coach.email ? (
                          <button
                            onClick={() => handleStartCompose(coach)}
                            className="flex items-center gap-2 px-4 py-2 bg-eha-red/20 hover:bg-eha-red/30 text-eha-red rounded-lg text-xs font-semibold transition-colors shrink-0"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email Coach
                          </button>
                        ) : (
                          <span className="text-xs text-text-muted">No email</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Search & Filter View */
              <>
                {/* Search by Name */}
                <div className="px-6 py-4 border-b border-border-default">
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Search by School Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Type a school name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-input-bg border border-eha-silver/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 ? (
                  <div className="max-h-[400px] overflow-y-auto">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-6 h-6 border-2 border-[#E31837] border-t-transparent rounded-full" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-8 text-center">
                        <Building2 className="w-12 h-12 text-text-muted mx-auto mb-3" />
                        <p className="text-text-primary font-medium mb-1">No Schools Found</p>
                        <p className="text-xs text-text-muted">
                          No results for &ldquo;{searchQuery}&rdquo;. Try a different name or use the filters below.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border-subtle">
                        {searchResults.map((college) => (
                          <button
                            key={college.id}
                            onClick={() => handleSelectCollege(college.id)}
                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-surface-glass transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-surface-overlay rounded-lg flex items-center justify-center shrink-0">
                              <GraduationCap className="w-5 h-5 text-text-muted" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {college.name}
                              </p>
                              <p className="text-xs text-text-muted truncate">
                                {[college.division, college.city, college.state, college.conference]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Filters */}
                    <div className="px-6 py-4 border-b border-border-default">
                      {isLoadingFilters ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin w-5 h-5 border-2 border-[#E31837] border-t-transparent rounded-full" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Select
                            label="Division"
                            placeholder="All Divisions"
                            value={selectedDivision}
                            onChange={(e) => {
                              setSelectedDivision(e.target.value)
                              setSelectedConference('')
                            }}
                            options={divisions.map((d) => ({ value: d, label: d }))}
                          />
                          <Select
                            label="State"
                            placeholder="All States"
                            value={selectedState}
                            onChange={(e) => {
                              setSelectedState(e.target.value)
                              setSelectedConference('')
                            }}
                            options={states.map((s) => ({ value: s, label: s }))}
                          />
                          <Select
                            label="Conference"
                            placeholder="All Conferences"
                            value={selectedConference}
                            onChange={(e) => setSelectedConference(e.target.value)}
                            options={conferenceOptions.map((c) => ({ value: c, label: c }))}
                            disabled={colleges.length === 0}
                          />
                        </div>
                      )}
                    </div>

                    {/* College Results */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {isLoadingColleges ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin w-6 h-6 border-2 border-[#E31837] border-t-transparent rounded-full" />
                        </div>
                      ) : !selectedDivision && !selectedState ? (
                        <div className="p-8 text-center">
                          <Search className="w-12 h-12 text-text-muted mx-auto mb-3" />
                          <p className="text-text-primary font-medium mb-1">Select Filters</p>
                          <p className="text-xs text-text-muted">
                            Choose a division or state to find colleges
                          </p>
                        </div>
                      ) : colleges.length === 0 ? (
                        <div className="p-8 text-center">
                          <Building2 className="w-12 h-12 text-text-muted mx-auto mb-3" />
                          <p className="text-text-primary font-medium mb-1">No Colleges Found</p>
                          <p className="text-xs text-text-muted">
                            Try adjusting your filters
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border-subtle">
                          {colleges.map((college) => (
                            <button
                              key={college.id}
                              onClick={() => handleSelectCollege(college.id)}
                              className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-surface-glass transition-colors text-left"
                            >
                              <div className="w-10 h-10 bg-surface-overlay rounded-lg flex items-center justify-center shrink-0">
                                <GraduationCap className="w-5 h-5 text-text-muted" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                  {college.name}
                                </p>
                                <p className="text-xs text-text-muted truncate">
                                  {[college.city, college.state, college.conference]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border-default shrink-0">
            <p className="text-[10px] text-text-muted text-center">
              Emails are sent from EHA Connect. Coaches can reply directly to your email address.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
