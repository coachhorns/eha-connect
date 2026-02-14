'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Plus,
  Users,
  Trophy,
  MapPin,
  Settings,
  TrendingUp,
  ChevronRight,
  Calendar,
  Shield,
  GraduationCap,
  Mail,
  Crown,
  Clock,
  ArrowLeftRight,
} from 'lucide-react'
import { Button } from '@/components/ui'
import RecruitingModal from '@/components/recruiting/RecruitingModal'


interface RosterPlayer {
  playerId: string
  slug: string
  firstName: string
  lastName: string
  jerseyNumber: string | null
  graduationYear: number | null
  profilePhoto: string | null
  primaryPosition: string | null
}

interface Team {
  id: string
  slug: string
  name: string
  division: string | null
  coachName: string | null
  wins: number
  losses: number
  rosterCount: number
  roster: RosterPlayer[]
}

interface Program {
  id: string
  slug: string
  name: string
  logo: string | null
  city: string | null
  state: string | null
  directorName: string | null
  directorEmail: string | null
  teams: Team[]
  totalWins: number
  totalLosses: number
}

interface EmailLogEntry {
  id: string
  coachName: string
  coachEmail: string
  collegeName: string
  sentAt: string
  players: Array<{ firstName: string; lastName: string }>
}

export default function DirectorDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [program, setProgram] = useState<Program | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [recruitingOpen, setRecruitingOpen] = useState(false)
  const [emailLog, setEmailLog] = useState<EmailLogEntry[]>([])

  // Extract age number from team name or division (e.g. "17U" → 17, "EPL 15" → 15)
  const getAgeGroup = (team: Team): number => {
    const text = `${team.division || ''} ${team.name || ''}`
    const match = text.match(/(\d{2})U?\b/i)
    return match ? parseInt(match[1], 10) : 0
  }

  const getSortedTeams = (teams: Team[]): Team[] => {
    return [...teams].sort((a, b) => {
      // Always sort oldest (highest age) first, then alphabetically by name
      const ageDiff = getAgeGroup(b) - getAgeGroup(a)
      if (ageDiff !== 0) return ageDiff
      return (a.name || '').localeCompare(b.name || '')
    })
  }

  // Flatten all players from all teams (deduped by playerId)
  const getAllPlayers = (): (RosterPlayer & { teamName: string })[] => {
    if (!program) return []
    const seen = new Set<string>()
    const players: (RosterPlayer & { teamName: string })[] = []
    for (const team of program.teams) {
      for (const player of team.roster) {
        if (!seen.has(player.playerId)) {
          seen.add(player.playerId)
          players.push({ ...player, teamName: team.name })
        }
      }
    }
    return players.sort((a, b) => a.lastName.localeCompare(b.lastName))
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/director/dashboard')
      return
    }

    if (status === 'authenticated' && session?.user.role !== 'PROGRAM_DIRECTOR') {
      router.push('/')
      return
    }

    if (status === 'authenticated' && session?.user.role === 'PROGRAM_DIRECTOR') {
      fetchProgram()
      fetchEmailLog()
    }
  }, [status, session, router])

  const fetchProgram = async () => {
    try {
      const res = await fetch('/api/director/program')
      const data = await res.json()

      if (res.ok) {
        if (!data.program) {
          router.push('/director/onboarding')
          return
        }
        setProgram(data.program)
      } else {
        setError(data.error || 'Failed to fetch program')
      }
    } catch (err) {
      console.error('Error fetching program:', err)
      setError('Failed to fetch program')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmailLog = async () => {
    try {
      const res = await fetch('/api/recruiting/log')
      if (res.ok) {
        const data = await res.json()
        setEmailLog(data.logs || [])
      }
    } catch (err) {
      console.error('Failed to fetch email log:', err)
    }
  }


  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-page-bg relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8 relative z-10">
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-6">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!program) {
    return null
  }

  const totalPlayers = program.teams.reduce((sum, team) => sum + team.rosterCount, 0)
  const winRate = program.totalWins + program.totalLosses > 0
    ? Math.round((program.totalWins / (program.totalWins + program.totalLosses)) * 100)
    : 0

  const allPlayers = getAllPlayers()

  return (
    <div className="min-h-screen bg-page-bg relative overflow-hidden">
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

      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary tracking-tight">
            Director Dashboard
          </h1>
          <p className="text-text-muted mt-2">
            Manage your program and teams
          </p>
        </div>

        {/* Program Overview Card */}
        <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl overflow-hidden mb-8 shadow-2xl">
          {/* Program Header */}
          <div className="p-6 md:p-8 border-b border-border-default">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {program.logo ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-border-default shadow-lg">
                    <Image
                      src={program.logo}
                      alt={program.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-28 h-28 bg-gradient-to-br from-[#1a3a6e] to-[#0a1628] rounded-2xl flex items-center justify-center border-2 border-border-default">
                    <span className="text-4xl font-bold text-white/30">
                      {program.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary tracking-tight">
                      {program.name}
                    </h2>
                    {(program.city || program.state) && (
                      <div className="flex items-center gap-2 text-text-muted mt-2">
                        <MapPin className="w-4 h-4 text-text-muted" />
                        <span>
                          {[program.city, program.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/programs/${program.slug}`}>
                      <Button
                        variant="outline"
                        className="border-border-default text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                    </Link>
                    <Link href="/director/program/edit">
                      <Button
                        variant="outline"
                        className="border-border-default text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Program
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {/* Teams */}
            <div className="p-5 border-r border-b lg:border-b-0 border-border-default">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Teams</div>
                  <div className="text-2xl font-bold text-text-primary font-mono">{program.teams.length}</div>
                </div>
              </div>
            </div>

            {/* Record */}
            <div className="p-5 border-b lg:border-b-0 lg:border-r border-border-default">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Combined Record</div>
                  <div className="text-2xl font-bold text-text-primary font-mono">
                    {program.totalWins}-{program.totalLosses}
                  </div>
                </div>
              </div>
            </div>

            {/* Players */}
            <div className="p-5 border-r border-border-default">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Players</div>
                  <div className="text-2xl font-bold text-text-primary font-mono">{totalPlayers}</div>
                </div>
              </div>
            </div>

            {/* Win Rate */}
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Win Rate</div>
                  <div className="text-2xl font-bold text-text-primary font-mono">{winRate}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-text-primary">
              Your Teams
            </h2>
            <Link href={`/director/teams/new?programId=${program.id}`}>
              <button className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add Team
              </button>
            </Link>
          </div>

          {program.teams.length === 0 ? (
            <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-surface-overlay rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-text-muted" />
              </div>
              <h3 className="text-xl font-heading font-bold text-text-primary mb-2">No Teams Yet</h3>
              <p className="text-text-muted mb-6 max-w-md mx-auto">
                Get started by creating your first team to manage rosters and register for events.
              </p>
              <Link href={`/director/teams/new?programId=${program.id}`}>
                <Button className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Team
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {getSortedTeams(program.teams).map((team) => (
                <Link key={team.id} href={`/director/teams/${team.id}`}>
                  <div className="group flex items-center gap-2 bg-surface-glass border border-border-default rounded-lg px-3.5 py-2 hover:bg-surface-overlay hover:border-border-default transition-all cursor-pointer">
                    <span className="text-sm font-medium text-text-primary whitespace-nowrap">
                      {team.name}
                    </span>
                    {team.division && (
                      <span className="text-[10px] text-text-muted">{team.division}</span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-muted transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {program.teams.length >= 2 && (
            <Link href="/director/roster-manager">
              <div className="bg-surface-glass border border-border-default rounded-xl p-6 hover:bg-surface-overlay hover:border-border-default transition-all duration-300 group h-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                    <ArrowLeftRight className="w-6 h-6 text-text-muted" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary mb-1">Roster Manager</h3>
                    <p className="text-sm text-text-muted">Move players between teams</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          )}

          <Link href="/events">
            <div className="bg-gradient-to-br from-[#E31837]/20 to-transparent border border-[#E31837]/30 rounded-xl p-6 hover:border-[#E31837]/50 transition-all duration-300 group h-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-text-muted" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-1">Browse Events</h3>
                  <p className="text-sm text-text-muted">Find tournaments and register your teams</p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        {/* College Recruiting - Premium Card */}
        {allPlayers.length > 0 && (
          <div className="mt-8 relative rounded-2xl overflow-hidden">
            {/* Gold gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-yellow-600/15 to-amber-500/30 rounded-2xl" />
            <div className="absolute inset-[1px] bg-page-bg-alt/95 backdrop-blur-xl rounded-2xl" />

            <div className="relative">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-heading font-bold text-text-primary flex items-center gap-2.5">
                      <GraduationCap className="w-5 h-5 text-amber-400" />
                      College Recruiting
                      <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.15em] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        <Crown className="w-3 h-3" />
                        Premium
                      </span>
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                      Send player profiles to college coaches
                    </p>
                  </div>
                  <Button
                    onClick={() => setRecruitingOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-0 shadow-lg shadow-amber-900/20"
                  >
                    <Mail className="w-4 h-4" />
                    Email Coaches
                  </Button>
                </div>
              </div>

              {/* Sent Emails Log */}
              {emailLog.length > 0 && (
                <div className="border-t border-amber-500/10">
                  <div className="px-6 py-3 pb-2">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-muted flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Sent Emails
                    </h3>
                  </div>
                  <div className="px-6 pb-4 space-y-2">
                    {emailLog.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded border border-border-subtle">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-text-primary font-medium truncate">{log.coachName}</p>
                          <p className="text-[10px] text-text-muted truncate">
                            {log.collegeName}
                            {log.players.length > 0 && (
                              <> &bull; {log.players.map(p => `${p.firstName} ${p.lastName}`).join(', ')}</>
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono shrink-0 ml-3">
                          {new Date(log.sentAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documentation */}

      </div>

      {/* Recruiting Modal */}
      {recruitingOpen && (
        <RecruitingModal
          allPlayers={allPlayers.map((p) => ({
            firstName: p.firstName,
            lastName: p.lastName,
            graduationYear: p.graduationYear,
            slug: p.slug,
            teamName: p.teamName,
            primaryPosition: p.primaryPosition,
          }))}
          isOpen={recruitingOpen}
          onClose={() => setRecruitingOpen(false)}
          onEmailSent={fetchEmailLog}
        />
      )}
    </div>
  )
}
