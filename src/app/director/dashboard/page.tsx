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
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'


interface Team {
  id: string
  slug: string
  name: string
  ageGroup: string | null
  division: string | null
  coachName: string | null
  wins: number
  losses: number
  rosterCount: number
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

export default function DirectorDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [program, setProgram] = useState<Program | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('priority')

  const sortOptions = [
    { value: 'priority', label: 'Priority' },
    { value: 'division', label: 'Division' },
    { value: 'age', label: 'Age Group' },
    { value: 'name', label: 'Name' },
  ]

  const getAgeNumber = (ageGroup: string | null): number => {
    if (!ageGroup) return 0
    const match = ageGroup.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  const getDivisionPriority = (division: string | null): number => {
    if (!division) return 999
    if (division === 'EPL' || division.includes('Premier')) return 0
    if (division === 'Gold') return 1
    if (division === 'Silver') return 2
    return 3
  }

  const getSortedTeams = (teams: Team[]): Team[] => {
    return [...teams].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '')
        case 'division':
          const divCompare = (a.division || '').localeCompare(b.division || '')
          if (divCompare !== 0) return divCompare
          return (a.name || '').localeCompare(b.name || '')
        case 'age':
          const ageA = getAgeNumber(a.ageGroup)
          const ageB = getAgeNumber(b.ageGroup)
          if (ageA !== ageB) return ageB - ageA
          return (a.name || '').localeCompare(b.name || '')
        case 'priority':
        default:
          const divPriorityA = getDivisionPriority(a.division)
          const divPriorityB = getDivisionPriority(b.division)
          if (divPriorityA !== divPriorityB) return divPriorityA - divPriorityB
          const priorityAgeA = getAgeNumber(a.ageGroup)
          const priorityAgeB = getAgeNumber(b.ageGroup)
          if (priorityAgeA !== priorityAgeB) return priorityAgeB - priorityAgeA
          return (a.name || '').localeCompare(b.name || '')
      }
    })
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
                    {team.ageGroup && (
                      <Badge variant="info" size="sm">{team.ageGroup}</Badge>
                    )}
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
    </div>
  )
}
