'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Users,
  Plus,
  MapPin,
  Phone,
  Mail,
  Building2,
  Trophy,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

interface Team {
  id: string
  name: string
  slug: string
  division: string | null
  coachName: string | null
  wins: number
  losses: number
  _count: {
    roster: number
  }
}

interface Program {
  id: string
  name: string
  slug: string
  directorName: string | null
  directorEmail: string | null
  directorPhone: string | null
  logo: string | null
  city: string | null
  state: string | null
  teams: Team[]
  _count: {
    teams: number
  }
}

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [program, setProgram] = useState<Program | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/programs/${resolvedParams.id}`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const res = await fetch(`/api/admin/programs/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          setProgram(data.program)
        } else {
          setError('Program not found')
        }
      } catch (err) {
        console.error('Error fetching program:', err)
        setError('Failed to load program')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchProgram()
    }
  }, [session, resolvedParams.id])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (error) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/admin/programs')}
            className="mt-4 text-white hover:underline"
          >
            Back to Programs
          </button>
        </div>
      </div>
    )
  }

  if (!program) {
    return null
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/programs"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Programs
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {program.logo ? (
              <img
                src={program.logo}
                alt={program.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white uppercase tracking-wider">{program.name}</h1>
              {(program.city || program.state) && (
                <div className="flex items-center gap-1 text-gray-400 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{program.city}{program.city && program.state ? ', ' : ''}{program.state}</span>
                </div>
              )}
            </div>
          </div>

          <Link href={`/admin/programs/${program.id}/edit`}>
            <Button className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Program
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{program._count.teams}</p>
              <p className="text-sm text-gray-400">Teams</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {program.teams.reduce((acc, team) => acc + team._count.roster, 0)}
              </p>
              <p className="text-sm text-gray-400">Total Players</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {program.teams.reduce((acc, team) => acc + team.wins, 0)}-
                {program.teams.reduce((acc, team) => acc + team.losses, 0)}
              </p>
              <p className="text-sm text-gray-400">Combined Record</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Director Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Director Information</h2>
          {program.directorName ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-white font-medium">{program.directorName}</p>
              </div>
              {program.directorEmail && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${program.directorEmail}`} className="hover:text-eha-red">
                    {program.directorEmail}
                  </a>
                </div>
              )}
              {program.directorPhone && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${program.directorPhone}`} className="hover:text-eha-red">
                    {program.directorPhone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No director information</p>
          )}
        </Card>

        {/* Teams */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Teams ({program.teams.length})</h2>
            <Link href={`/admin/teams/new?programId=${program.id}`}>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Add Team
              </Button>
            </Link>
          </div>

          {program.teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No teams in this program</p>
              <Link href={`/admin/teams/new?programId=${program.id}`}>
                <Button size="sm">Add First Team</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a3a6e]">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Team</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Division</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Coach</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Players</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a3a6e]">
                  {program.teams.map((team) => (
                    <tr
                      key={team.id}
                      className="hover:bg-[#1a3a6e]/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/teams/${team.id}`)}
                    >
                      <td className="px-3 py-3">
                        <span className="text-white font-medium">{team.name}</span>
                      </td>
                      <td className="px-3 py-3">
                        {team.division ? (
                          <Badge variant="default" size="sm">{team.division}</Badge>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {team.coachName || '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {team._count.roster}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {team.wins}-{team.losses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
