'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Mail, ChevronRight, ArrowLeft, GraduationCap, Search, Building2, Send, CheckCircle } from 'lucide-react'
import { Select, Button } from '@/components/ui'

interface Player {
  firstName: string
  lastName: string
  graduationYear?: number | null
  slug: string
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
  player: Player
  isOpen: boolean
  onClose: () => void
}

export default function RecruitingModal({ player, isOpen, onClose }: RecruitingModalProps) {
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
    setEmailSubject(
      `Recruiting Profile: ${player.firstName} ${player.lastName} - ${player.graduationYear || ''}`
    )
    setEmailBody(
      `Coach ${coach.lastName},\n\nI would like to introduce myself and express my interest in your basketball program.\n\nThank you for your time and consideration.\n\nSincerely,\n${player.firstName} ${player.lastName}`
    )
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
          playerSlug: player.slug,
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

  if (!isOpen) return null

  // Derive unique conferences from current results for the filter
  const conferenceOptions = Array.from(
    new Set(colleges.map((c) => c.conference).filter(Boolean))
  ).sort() as string[]

  // Determine header based on current view
  const getHeader = () => {
    if (composingCoach) {
      return {
        title: `Email ${composingCoach.firstName} ${composingCoach.lastName}`,
        subtitle: selectedCollege
          ? `${selectedCollege.name} • ${composingCoach.title || 'Coach'}`
          : composingCoach.title || 'Coach',
      }
    }
    if (selectedCollege) {
      return {
        title: selectedCollege.name,
        subtitle: `${selectedCollege.division}${selectedCollege.conference ? ` • ${selectedCollege.conference}` : ''}`,
      }
    }
    return {
      title: 'Share Profile with College Coach',
      subtitle: 'Find a college and email your profile to their coaching staff',
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
          className="w-full max-w-2xl bg-[#0A1D37]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              {(selectedCollege || composingCoach) && (
                <button
                  onClick={composingCoach ? handleBackFromCompose : () => setSelectedCollege(null)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-heading font-bold text-white">
                  {header.title}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {header.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Compose View */}
            {composingCoach ? (
              <div className="p-6 space-y-4">
                {sendSuccess ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
                    <p className="text-white font-semibold text-lg">Message Sent!</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Your email has been delivered to {composingCoach.firstName} {composingCoach.lastName}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        To
                      </label>
                      <div className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400">
                        {composingCoach.email}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-4 py-2.5 bg-dark-surface border border-eha-silver/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Message
                      </label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2.5 bg-dark-surface border border-eha-silver/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all duration-200 resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        A link to your player profile will be included automatically.
                      </p>
                    </div>

                    {sendError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-300 text-sm">{sendError}</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleBackFromCompose}
                        className="px-4 py-2.5 text-gray-400 hover:text-white text-sm font-medium transition-colors"
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
                    <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-white font-medium mb-1">No Coaches Listed</p>
                    <p className="text-xs text-gray-400">
                      No coaching staff data is available for this school yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
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
                          <p className="text-sm font-medium text-white truncate">
                            {coach.firstName} {coach.lastName}
                          </p>
                          {coach.title && (
                            <p className="text-xs text-gray-400 truncate">{coach.title}</p>
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
                          <span className="text-xs text-gray-500">No email</span>
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
                <div className="px-6 py-4 border-b border-white/10">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Search by School Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Type a school name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-dark-surface border border-eha-silver/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all duration-200"
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
                        <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-white font-medium mb-1">No Schools Found</p>
                        <p className="text-xs text-gray-400">
                          No results for &ldquo;{searchQuery}&rdquo;. Try a different name or use the filters below.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {searchResults.map((college) => (
                          <button
                            key={college.id}
                            onClick={() => handleSelectCollege(college.id)}
                            className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-white/5 transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                              <GraduationCap className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {college.name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {[college.division, college.city, college.state, college.conference]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Filters */}
                    <div className="px-6 py-4 border-b border-white/10">
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
                          <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-white font-medium mb-1">Select Filters</p>
                          <p className="text-xs text-gray-400">
                            Choose a division or state to find colleges
                          </p>
                        </div>
                      ) : colleges.length === 0 ? (
                        <div className="p-8 text-center">
                          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-white font-medium mb-1">No Colleges Found</p>
                          <p className="text-xs text-gray-400">
                            Try adjusting your filters
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {colleges.map((college) => (
                            <button
                              key={college.id}
                              onClick={() => handleSelectCollege(college.id)}
                              className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-white/5 transition-colors text-left"
                            >
                              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                                <GraduationCap className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {college.name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {[college.city, college.state, college.conference]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
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
          <div className="px-6 py-3 border-t border-white/10 shrink-0">
            <p className="text-[10px] text-gray-500 text-center">
              Emails are sent from EHA Connect. Coaches can reply directly to your email address.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
