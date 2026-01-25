'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users, Trophy, MapPin, Settings } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

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
          // No program exists, redirect to onboarding
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    return null
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <p className="text-red-400">{error}</p>
        </Card>
      </div>
    )
  }

  if (!program) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">
          Director Dashboard
        </h1>
        <p className="mt-2 text-gray-400">
          Manage your program and teams
        </p>
      </div>

      {/* Program Overview Card */}
      <Card className="p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            {program.logo ? (
              <img
                src={program.logo}
                alt={program.name}
                className="w-32 h-32 object-cover rounded-lg"
              />
            ) : (
              <div className="w-32 h-32 bg-[#1a3a6e] rounded-lg flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-500">
                  {program.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{program.name}</h2>
                {(program.city || program.state) && (
                  <div className="flex items-center gap-1 text-gray-400 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {[program.city, program.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              <Link href={`/director/program/edit`}>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Program
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-[#1a3a6e]/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Teams</div>
                <div className="text-2xl font-bold text-white">{program.teams.length}</div>
              </div>
              <div className="bg-[#1a3a6e]/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Combined Record</div>
                <div className="text-2xl font-bold text-white">
                  {program.totalWins}-{program.totalLosses}
                </div>
              </div>
              <div className="bg-[#1a3a6e]/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Total Players</div>
                <div className="text-2xl font-bold text-white">
                  {program.teams.reduce((sum, team) => sum + team.rosterCount, 0)}
                </div>
              </div>
              <div className="bg-[#1a3a6e]/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Win Rate</div>
                <div className="text-2xl font-bold text-white">
                  {program.totalWins + program.totalLosses > 0
                    ? Math.round((program.totalWins / (program.totalWins + program.totalLosses)) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Teams Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Teams</h2>
        <Link href={`/director/teams/new?programId=${program.id}`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Team
          </Button>
        </Link>
      </div>

      {program.teams.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-[#1a3a6e] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Teams Yet</h3>
          <p className="text-gray-400 mb-4">
            Get started by creating your first team
          </p>
          <Link href={`/director/teams/new?programId=${program.id}`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {program.teams.map((team) => (
            <Link key={team.id} href={`/director/teams/${team.id}`}>
              <Card className="p-4 hover:bg-[#1a3a6e]/30 transition-colors cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white">{team.name}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    <Trophy className="w-4 h-4 text-eha-gold" />
                    <span className="text-white">{team.wins}-{team.losses}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {team.ageGroup && (
                    <Badge variant="info">{team.ageGroup}</Badge>
                  )}
                  {team.division && (
                    <Badge variant="default">{team.division}</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{team.rosterCount} players</span>
                  </div>
                  {team.coachName && (
                    <span>Coach: {team.coachName}</span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
