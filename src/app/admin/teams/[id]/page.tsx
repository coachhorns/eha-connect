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
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { formatPosition, formatHeight } from '@/lib/utils'

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

interface Team {
  id: string
  name: string
  slug: string
  organization: string | null
  coachName: string | null
  coachEmail: string | null
  coachPhone: string | null
  ageGroup: string | null
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
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/admin/teams')}
            className="mt-4 text-[#FF6B00] hover:underline"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/teams"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              {team.ageGroup && <Badge variant="info">{team.ageGroup}</Badge>}
              {team.division && <Badge variant="default">{team.division}</Badge>}
            </div>
            {team.organization && (
              <p className="text-gray-400">{team.organization}</p>
            )}
            {(team.city || team.state) && (
              <div className="flex items-center gap-1 text-gray-500 mt-1">
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
            <div className="p-2 bg-[#FF6B00]/10 rounded-lg">
              <Users className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{team.roster.length}</p>
              <p className="text-sm text-gray-400">Players</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Gamepad2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalGames}</p>
              <p className="text-sm text-gray-400">Games</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Gamepad2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{team.wins}-{team.losses}</p>
              <p className="text-sm text-gray-400">Record</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{team.eventTeams.length}</p>
              <p className="text-sm text-gray-400">Events</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coach Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Coach Information</h2>
          {team.coachName ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-white font-medium">{team.coachName}</p>
              </div>
              {team.coachEmail && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${team.coachEmail}`} className="hover:text-[#FF6B00]">
                    {team.coachEmail}
                  </a>
                </div>
              )}
              {team.coachPhone && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${team.coachPhone}`} className="hover:text-[#FF6B00]">
                    {team.coachPhone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No coach information</p>
          )}
        </Card>

        {/* Roster */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Roster ({team.roster.length})</h2>
            <Link href={`/admin/players/new?teamId=${team.id}`}>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Add Player
              </Button>
            </Link>
          </div>

          {team.roster.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No players on roster</p>
              <Link href={`/admin/players/new?teamId=${team.id}`}>
                <Button size="sm">Add First Player</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#252540]">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Player</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Pos</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Ht</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252540]">
                  {team.roster.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-[#252540]/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/players/${entry.player.slug}`)}
                    >
                      <td className="px-3 py-3 text-[#FF6B00] font-bold">
                        {entry.jerseyNumber || entry.player.jerseyNumber || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-white font-medium">
                          {entry.player.firstName} {entry.player.lastName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {formatPosition(entry.player.primaryPosition)}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {entry.player.heightFeet
                          ? formatHeight(entry.player.heightFeet, entry.player.heightInches)
                          : '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
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
          <h2 className="text-lg font-semibold text-white mb-4">Recent Events</h2>
          <div className="space-y-3">
            {team.eventTeams.map((et) => (
              <div
                key={et.id}
                className="flex items-center justify-between p-3 bg-[#252540] rounded-lg hover:bg-[#252540]/70 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/events/${et.event.id}`)}
              >
                <div>
                  <p className="text-white font-medium">{et.event.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(et.event.startDate).toLocaleDateString()} - {new Date(et.event.endDate).toLocaleDateString()}
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
