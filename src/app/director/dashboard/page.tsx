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
  Filter,
  ChevronDown,
  GraduationCap,
  Mail,
  Crown,
  Clock,
  Check,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
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
  const [sortBy, setSortBy] = useState('priority')

  // Recruiting state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [recruitingOpen, setRecruitingOpen] = useState(false)
  const [emailLog, setEmailLog] = useState<EmailLogEntry[]>([])

  const sortOptions = [
    { value: 'priority', label: 'Priority' },
    { value: 'division', label: 'Division' },
    { value: 'name', label: 'Name' },
  ]

  const getSortedTeams = (teams: Team[]): Team[] => {
    return [...teams].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '')
        case 'division':
          const divCompare = (a.division || '').localeCompare(b.division || '')
          if (divCompare !== 0) return divCompare
          return (a.name || '').localeCompare(b.name || '')
        case 'priority':
        default:
          return (a.division || '').localeCompare(b.division || '') || (a.name || '').localeCompare(b.name || '')
      }
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

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    )
  }

  const selectAll = () => {
    const allPlayers = getAllPlayers()
    if (selectedPlayerIds.length === allPlayers.length) {
      setSelectedPlayerIds([])
    } else {
      setSelectedPlayerIds(allPlayers.map((p) => p.playerId))
    }
  }

  const handleOpenRecruiting = () => {
    if (selectedPlayerIds.length === 0) return
    setRecruitingOpen(true)
  }

  const getSelectedPlayerObjects = () => {
    const allPlayers = getAllPlayers()
    return allPlayers
      .filter((p) => selectedPlayerIds.includes(p.playerId))
      .map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        graduationYear: p.graduationYear,
        slug: p.slug,
      }))
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1D37] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A1D37] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8 relative z-10">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
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
    <div className="min-h-screen bg-[#0A1D37] relative overflow-hidden">
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
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">
            Director Dashboard
          </h1>
          <p className="text-gray-400 mt-2">
            Manage your program and teams
          </p>
        </div>

        {/* Program Overview Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden mb-8 shadow-2xl">
          {/* Program Header */}
          <div className="p-6 md:p-8 border-b border-white/10">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {program.logo ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg">
                    <Image
                      src={program.logo}
                      alt={program.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-28 h-28 bg-gradient-to-br from-[#1a3a6e] to-[#0a1628] rounded-2xl flex items-center justify-center border-2 border-white/10">
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
                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-white tracking-tight">
                      {program.name}
                    </h2>
                    {(program.city || program.state) && (
                      <div className="flex items-center gap-2 text-gray-400 mt-2">
                        <MapPin className="w-4 h-4 text-white" />
                        <span>
                          {[program.city, program.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <Link href="/director/program/edit">
                    <Button
                      variant="outline"
                      className="border-white/20 text-gray-300 hover:bg-white/10 hover:text-white"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Program
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {/* Teams */}
            <div className="p-5 border-r border-b lg:border-b-0 border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Teams</div>
                  <div className="text-2xl font-bold text-white font-mono">{program.teams.length}</div>
                </div>
              </div>
            </div>

            {/* Record */}
            <div className="p-5 border-b lg:border-b-0 lg:border-r border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Combined Record</div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {program.totalWins}-{program.totalLosses}
                  </div>
                </div>
              </div>
            </div>

            {/* Players */}
            <div className="p-5 border-r border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Players</div>
                  <div className="text-2xl font-bold text-white font-mono">{totalPlayers}</div>
                </div>
              </div>
            </div>

            {/* Win Rate */}
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Win Rate</div>
                  <div className="text-2xl font-bold text-white font-mono">{winRate}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-heading font-bold text-white">
              Your Teams
            </h2>
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Filter className="w-4 h-4" />
                  <span>Sort:</span>
                </div>
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 text-white px-4 py-2 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0a1628]">
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              <Link href={`/director/teams/new?programId=${program.id}`}>
                <Button className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Team
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {program.teams.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-heading font-bold text-white mb-2">No Teams Yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getSortedTeams(program.teams).map((team) => (
              <Link key={team.id} href={`/director/teams/${team.id}`}>
                <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-white text-lg group-hover:text-white transition-colors">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                      <Trophy className="w-4 h-4 text-white" />
                      <span className="text-white font-semibold font-mono text-sm">
                        {team.wins}-{team.losses}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {team.division && (
                      <Badge variant="default" size="sm">{team.division}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{team.rosterCount} players</span>
                    </div>
                    {team.coachName && (
                      <span className="text-gray-500 truncate max-w-[120px]">
                        Coach: {team.coachName}
                      </span>
                    )}
                  </div>

                  {/* Hover indicator */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
                    <span>Manage Team</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* College Recruiting - Premium Card */}
        {allPlayers.length > 0 && (
          <div className="mt-8 relative rounded-2xl overflow-hidden">
            {/* Gold gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-yellow-600/15 to-amber-500/30 rounded-2xl" />
            <div className="absolute inset-[1px] bg-[#0a1628]/95 backdrop-blur-xl rounded-2xl" />

            <div className="relative">
              {/* Premium Header */}
              <div className="p-6 border-b border-amber-500/10 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2.5">
                      <GraduationCap className="w-5 h-5 text-amber-400" />
                      College Recruiting
                      <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.15em] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        <Crown className="w-3 h-3" />
                        Premium
                      </span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Select players and send their profiles to college coaches
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenRecruiting}
                    disabled={selectedPlayerIds.length === 0}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-0 shadow-lg shadow-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Mail className="w-4 h-4" />
                    Email Coaches
                    {selectedPlayerIds.length > 0 && (
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {selectedPlayerIds.length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Select All */}
              <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selectedPlayerIds.length === allPlayers.length && allPlayers.length > 0
                      ? 'bg-amber-500 border-amber-500'
                      : 'border-white/20 hover:border-white/40'
                  }`}>
                    {selectedPlayerIds.length === allPlayers.length && allPlayers.length > 0 && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="font-semibold uppercase tracking-wider">
                    {selectedPlayerIds.length === allPlayers.length && allPlayers.length > 0 ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
                <span className="text-xs text-gray-500">
                  {selectedPlayerIds.length} of {allPlayers.length} selected
                </span>
              </div>

              {/* Player List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5">
                {allPlayers.map((player) => {
                  const isSelected = selectedPlayerIds.includes(player.playerId)
                  return (
                    <button
                      key={player.playerId}
                      onClick={() => togglePlayer(player.playerId)}
                      className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                        isSelected ? 'bg-amber-500/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {player.teamName}
                          {player.graduationYear ? ` • Class of ${player.graduationYear}` : ''}
                          {player.primaryPosition ? ` • ${player.primaryPosition}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Sent Emails Log */}
              <div className="border-t border-amber-500/10">
                <div className="px-6 py-3 pb-2">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Sent Emails
                  </h3>
                </div>
                {emailLog.length === 0 ? (
                  <div className="px-6 pb-5">
                    <p className="text-[11px] text-gray-600">No emails sent yet. Select players above and email a college coach.</p>
                  </div>
                ) : (
                  <div className="px-6 pb-4 space-y-2">
                    {emailLog.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded border border-white/5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white font-medium truncate">{log.coachName}</p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {log.collegeName}
                            {log.players.length > 0 && (
                              <> &bull; {log.players.map(p => `${p.firstName} ${p.lastName}`).join(', ')}</>
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-3">
                          {new Date(log.sentAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/events">
            <div className="bg-gradient-to-br from-[#E31837]/20 to-transparent border border-[#E31837]/30 rounded-xl p-6 hover:border-[#E31837]/50 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Browse Events</h3>
                  <p className="text-sm text-gray-400">Find tournaments and register your teams</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link href={`/programs/${program.slug}`}>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">View Public Profile</h3>
                  <p className="text-sm text-gray-400">See how your program appears to others</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        {/* Documentation */}

      </div>

      {/* Recruiting Modal */}
      {recruitingOpen && (
        <RecruitingModal
          players={getSelectedPlayerObjects()}
          isOpen={recruitingOpen}
          onClose={() => setRecruitingOpen(false)}
          onEmailSent={fetchEmailLog}
        />
      )}
    </div>
  )
}
