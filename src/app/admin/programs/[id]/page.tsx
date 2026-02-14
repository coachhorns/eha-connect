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
            className="mt-4 text-text-primary hover:underline"
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
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
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
              <div className="w-16 h-16 bg-surface-overlay rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-text-muted" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">{program.name}</h1>
              {(program.city || program.state) && (
                <div className="flex items-center gap-1 text-text-muted mt-1">
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
            <div className="p-2 bg-surface-overlay rounded-lg">
              <Users className="w-5 h-5 text-text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{program._count.teams}</p>
              <p className="text-sm text-text-muted">Teams</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-overlay rounded-lg">
              <Users className="w-5 h-5 text-text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {program.teams.reduce((acc, team) => acc + team._count.roster, 0)}
              </p>
              <p className="text-sm text-text-muted">Total Players</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-overlay rounded-lg">
              <Trophy className="w-5 h-5 text-text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {program.teams.reduce((acc, team) => acc + team.wins, 0)}-
                {program.teams.reduce((acc, team) => acc + team.losses, 0)}
              </p>
              <p className="text-sm text-text-muted">Combined Record</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Director Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Director Information</h2>
          {program.directorName ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-muted">Name</p>
                <p className="text-text-primary font-medium">{program.directorName}</p>
              </div>
              {program.directorEmail && (
                <div className="flex items-center gap-2 text-text-muted">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${program.directorEmail}`} className="hover:text-eha-red">
                    {program.directorEmail}
                  </a>
                </div>
              )}
              {program.directorPhone && (
                <div className="flex items-center gap-2 text-text-muted">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${program.directorPhone}`} className="hover:text-eha-red">
                    {program.directorPhone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-muted">No director information</p>
          )}
        </Card>

        {/* Teams */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Teams ({program.teams.length})</h2>
            <Link href={`/admin/teams/new?programId=${program.id}`}>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Add Team
              </Button>
            </Link>
          </div>

          {program.teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">No teams in this program</p>
              <Link href={`/admin/teams/new?programId=${program.id}`}>
                <Button size="sm">Add First Team</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Team</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Division</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Coach</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Players</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a3a6e]">
                  {program.teams.map((team) => (
                    <tr
                      key={team.id}
                      className="hover:bg-surface-overlay/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/teams/${team.id}`)}
                    >
                      <td className="px-3 py-3">
                        <span className="text-text-primary font-medium">{team.name}</span>
                      </td>
                      <td className="px-3 py-3">
                        {team.division ? (
                          <Badge variant="default" size="sm">{team.division}</Badge>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-text-muted">
                        {team.coachName || '-'}
                      </td>
                      <td className="px-3 py-3 text-text-muted">
                        {team._count.roster}
                      </td>
                      <td className="px-3 py-3 text-text-muted">
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
