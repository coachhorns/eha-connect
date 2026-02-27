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
  Gamepad2,
  Calendar,
  Building2,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { formatPosition, formatHeight } from '@/lib/utils'
import { safeParseDate } from '@/lib/timezone'

interface Player {
  id: string
  firstName: string
  lastName: string
  slug: string
  jerseyNumber: string | null
  primaryPosition: string | null
  heightFeet: number | null
  heightInches: number | null
  school: string | null
  graduationYear: number | null
  profilePhoto: string | null
}

interface RosterEntry {
  id: string
  jerseyNumber: string | null
  player: Player
}

interface EventTeam {
  id: string
  event: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
}

interface Program {
  id: string
  name: string
  slug: string
}

interface Team {
  id: string
  name: string
  slug: string
  program: Program | null
  coachName: string | null
  coachEmail: string | null
  coachPhone: string | null
  division: string | null
  city: string | null
  state: string | null
  wins: number
  losses: number
  roster: RosterEntry[]
  eventTeams: EventTeam[]
  _count: {
    homeGames: number
    awayGames: number
  }
}

export default function TeamDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/teams/${resolvedParams.id}`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch(`/api/admin/teams/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          setTeam(data.team)
        } else {
          setError('Team not found')
        }
      } catch (err) {
        console.error('Error fetching team:', err)
        setError('Failed to load team')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchTeam()
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
            onClick={() => router.push('/admin/teams')}
            className="mt-4 text-text-primary hover:underline"
          >
            Back to Teams
          </button>
        </div>
      </div>
    )
  }

  if (!team) {
    return null
  }

  const totalGames = team._count.homeGames + team._count.awayGames

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/teams"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">{team.name}</h1>
              {team.division && <Badge variant="default">{team.division}</Badge>}
            </div>
            {team.program && (
              <Link
                href={`/admin/programs/${team.program.id}`}
                className="flex items-center gap-2 text-text-muted hover:text-eha-red transition-colors"
              >
                <Building2 className="w-4 h-4" />
                <span>{team.program.name}</span>
              </Link>
            )}
            {(team.city || team.state) && (
              <div className="flex items-center gap-1 text-text-muted mt-1">
                <MapPin className="w-4 h-4" />
                <span>{team.city}{team.city && team.state ? ', ' : ''}{team.state}</span>
              </div>
            )}
          </div>

          <Link href={`/admin/teams/${team.id}/edit`}>
            <Button className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Team
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-overlay rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{team.roster.length}</p>
              <p className="text-sm text-text-muted">Players</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-overlay rounded-lg">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalGames}</p>
              <p className="text-sm text-text-muted">Games</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-overlay rounded-lg">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{team.wins}-{team.losses}</p>
              <p className="text-sm text-text-muted">Record</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-overlay rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{team.eventTeams.length}</p>
              <p className="text-sm text-text-muted">Events</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coach Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Coach Information</h2>
          {team.coachName ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-muted">Name</p>
                <p className="text-text-primary font-medium">{team.coachName}</p>
              </div>
              {team.coachEmail && (
                <div className="flex items-center gap-2 text-text-muted">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${team.coachEmail}`} className="hover:text-eha-red">
                    {team.coachEmail}
                  </a>
                </div>
              )}
              {team.coachPhone && (
                <div className="flex items-center gap-2 text-text-muted">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${team.coachPhone}`} className="hover:text-eha-red">
                    {team.coachPhone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-muted">No coach information</p>
          )}
        </Card>

        {/* Roster */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Roster ({team.roster.length})</h2>
            <Link href={`/admin/players/new?teamId=${team.id}`}>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Add Player
              </Button>
            </Link>
          </div>

          {team.roster.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">No players on roster</p>
              <Link href={`/admin/players/new?teamId=${team.id}`}>
                <Button size="sm">Add First Player</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Player</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Pos</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Ht</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {team.roster.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-surface-overlay transition-colors cursor-pointer"
                      onClick={() => router.push(`/players/${entry.player.slug}`)}
                    >
                      <td className="px-3 py-3 text-text-primary font-bold">
                        {entry.jerseyNumber || entry.player.jerseyNumber || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-text-primary font-medium">
                          {entry.player.firstName} {entry.player.lastName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-text-muted">
                        {formatPosition(entry.player.primaryPosition)}
                      </td>
                      <td className="px-3 py-3 text-text-muted">
                        {entry.player.heightFeet
                          ? formatHeight(entry.player.heightFeet, entry.player.heightInches)
                          : '-'}
                      </td>
                      <td className="px-3 py-3 text-text-muted">
                        {entry.player.graduationYear || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Events */}
      {team.eventTeams.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Events</h2>
          <div className="space-y-3">
            {team.eventTeams.map((et) => (
              <div
                key={et.id}
                className="flex items-center justify-between p-3 bg-surface-raised rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/events/${et.event.id}`)}
              >
                <div>
                  <p className="text-text-primary font-medium">{et.event.name}</p>
                  <p className="text-sm text-text-muted">
                    {safeParseDate(et.event.startDate).toLocaleDateString()} - {safeParseDate(et.event.endDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="info" size="sm">View</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
