'use client'

import { useState } from 'react'
import { Mail, X, Search, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui'

interface ContactCoachButtonProps {
  playerName: string
  profileUrl?: string
}

// Placeholder for future coach data
interface Coach {
  id: string
  name: string
  email: string
  school: string
  position: string // e.g., "Head Coach", "Assistant Coach"
}

export default function ContactCoachButton({ playerName, profileUrl }: ContactCoachButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // TODO: Replace with actual coach data from API/database
  const coaches: Coach[] = []

  const filteredCoaches = coaches.filter(
    (coach) =>
      coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.school.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectCoach = (coach: Coach) => {
    const currentUrl = profileUrl || (typeof window !== 'undefined' ? window.location.href : '')
    const subject = encodeURIComponent(`Recruiting Interest - ${playerName}`)
    const body = encodeURIComponent(
      `Dear Coach ${coach.name.split(' ').pop()},\n\n` +
      `I am reaching out to express my interest in your basketball program at ${coach.school}.\n\n` +
      `You can view my player profile and stats here:\n${currentUrl}\n\n` +
      `I would love the opportunity to discuss how I can contribute to your team.\n\n` +
      `Thank you for your time and consideration.\n\n` +
      `Sincerely,\n${playerName}`
    )

    window.location.href = `mailto:${coach.email}?subject=${subject}&body=${body}`
    setIsOpen(false)
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="relative bg-eha-red hover:bg-eha-red text-white border-0 rounded-full px-6 py-6 text-[10px] font-extrabold uppercase tracking-widest shadow-[0_0_40px_rgba(200,16,46,0.8)] hover:shadow-[0_0_50px_rgba(200,16,46,1)] ring-4 ring-white/30 hover:ring-white/50 transition-all duration-300 animate-pulse hover:animate-none hover:scale-105"
      >
        <Mail className="w-4 h-4 mr-2" />
        Contact Coach
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-page-bg border border-border-default rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-default">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Contact a Coach</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Select a coach to send a recruiting email
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border-default">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by coach name or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-glass border border-border-default rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-gray-500 focus:outline-none focus:border-eha-red/50"
                />
              </div>
            </div>

            {/* Coach List */}
            <div className="max-h-[300px] overflow-y-auto">
              {coaches.length === 0 ? (
                <div className="p-8 text-center">
                  <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-text-primary font-medium mb-1">Coming Soon</p>
                  <p className="text-xs text-text-muted">
                    College coach directory is being built. Check back soon to connect with coaches directly!
                  </p>
                </div>
              ) : filteredCoaches.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-text-muted text-sm">No coaches found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredCoaches.map((coach) => (
                    <button
                      key={coach.id}
                      onClick={() => handleSelectCoach(coach)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-surface-glass transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-eha-red/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-eha-red">
                          {coach.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{coach.name}</p>
                        <p className="text-xs text-text-muted truncate">
                          {coach.position} • {coach.school}
                        </p>
                      </div>
                      <Mail className="w-4 h-4 text-text-muted flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-default bg-surface-glass">
              <p className="text-[10px] text-text-muted text-center">
                Emails open in your default email app with your profile link included
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
