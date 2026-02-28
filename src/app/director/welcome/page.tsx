'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Users,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Rocket,
} from 'lucide-react'

interface RosterEntry {
  playerId: string
  firstName: string
  lastName: string
  jerseyNumber: string | null
  primaryPosition: string | null
  graduationYear: number | null
  profilePhoto: string | null
}

interface Team {
  id: string
  name: string
  division: string | null
  coachName: string | null
  rosterCount: number
  roster: RosterEntry[]
}

interface Program {
  id: string
  name: string
  logo: string | null
  city: string | null
  state: string | null
  teams: Team[]
}

export default function DirectorWelcomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [program, setProgram] = useState<Program | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (session?.user.role !== 'PROGRAM_DIRECTOR') {
      router.push('/')
      return
    }

    fetchProgram()
  }, [status, session, router])

  const fetchProgram = async () => {
    try {
      const res = await fetch('/api/director/program')
      const data = await res.json()
      if (data.program) {
        setProgram(data.program)
        // Auto-expand first team
        if (data.program.teams.length > 0) {
          setExpandedTeams({ [data.program.teams[0].id]: true })
        }
      }
    } catch (err) {
      console.error('Error fetching program:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }))
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <p className="text-text-muted">No program found.</p>
      </div>
    )
  }

  const totalPlayers = program.teams.reduce((sum, t) => sum + t.rosterCount, 0)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E31837] blur-[150px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-12 pb-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/images/main.png"
            alt="EHA Connect"
            width={200}
            height={200}
            className="w-auto h-32 sm:h-40 mx-auto mb-6 object-contain"
            priority
          />
        </div>

        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-surface-glass border border-border-default rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-text-primary/60" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary mb-2">
            You&apos;re All Set, {session?.user.name?.split(' ')[0] || 'Director'}!
          </h1>
          <p className="text-text-muted">
            Your program has been created. Here&apos;s a summary of what you&apos;ve set up.
          </p>
        </div>

        {/* Program Card */}
        <div className="bg-surface-glass border border-border-default rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {program.logo ? (
              <img
                src={program.logo}
                alt={program.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 bg-surface-overlay rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-text-muted" />
              </div>
            )}
            <div>
              <h2 className="font-heading font-bold text-xl text-text-primary">{program.name}</h2>
              {(program.city || program.state) && (
                <p className="text-sm text-text-muted">
                  {[program.city, program.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-6 pt-4 border-t border-border-default">
            <div>
              <span className="block text-2xl font-bold text-text-primary">{program.teams.length}</span>
              <span className="text-xs text-text-muted uppercase tracking-wider">Teams</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-text-primary">{totalPlayers}</span>
              <span className="text-xs text-text-muted uppercase tracking-wider">Players</span>
            </div>
          </div>
        </div>

        {/* Teams & Rosters */}
        <div className="space-y-3 mb-8">
          {program.teams.map((team) => (
            <div key={team.id} className="bg-surface-glass border border-border-default rounded-xl overflow-hidden">
              {/* Team Header */}
              <button
                onClick={() => toggleTeam(team.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-glass transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-surface-overlay rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-text-primary">{team.name}</h3>
                    <p className="text-xs text-text-muted">
                      {team.division && `${team.division} · `}{team.rosterCount} players
                    </p>
                  </div>
                </div>
                {expandedTeams[team.id] ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>

              {/* Roster List */}
              {expandedTeams[team.id] && team.roster.length > 0 && (
                <div className="border-t border-border-subtle px-4 pb-3">
                  {team.roster.map((entry) => (
                    <div key={entry.playerId} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                      {entry.jerseyNumber && (
                        <span className="text-xs font-mono text-text-muted w-7">#{entry.jerseyNumber}</span>
                      )}
                      <span className="text-sm text-text-primary">
                        {entry.firstName} {entry.lastName}
                      </span>
                      {entry.primaryPosition && (
                        <span className="text-xs text-text-muted">{entry.primaryPosition}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-surface-glass border border-border-default rounded-xl p-6 text-center">
          <Rocket className="w-8 h-8 text-text-primary/60 mx-auto mb-3" />
          <h3 className="font-heading font-bold text-lg text-text-primary mb-2">
            Full Director Dashboard Coming at Launch
          </h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Event registration, schedule management, roster editing, player profile management, and more — all available when EHA Connect goes live. You&apos;ll receive an email once we launch.
          </p>
        </div>
      </div>
    </div>
  )
}
