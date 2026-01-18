'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Gamepad2,
  Edit,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'

interface Event {
  id: string
  name: string
  slug: string
  type: string
  description: string | null
  venue: string | null
  city: string | null
  state: string | null
  startDate: string
  endDate: string
  ageGroups: string[]
  divisions: string[]
  isPublished: boolean
  isActive: boolean
  _count?: {
    teams: number
    games: number
  }
}

interface Team {
  id: string
  name: string
  coachName: string | null
  ageGroup: string | null
  division: string | null
}

interface Game {
  id: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  homeScore: number
  awayScore: number
  scheduledAt: string
  status: string
  court: string | null
  gameType: string
}

export default function EventDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/events/${resolvedParams.id}`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch event details
        const eventRes = await fetch(`/api/admin/events/${resolvedParams.id}`)
        if (!eventRes.ok) {
          setError('Event not found')
          return
        }
        const eventData = await eventRes.json()
        setEvent(eventData.event)

        // Fetch teams for this event
        const teamsRes = await fetch(`/api/admin/teams?eventId=${resolvedParams.id}&limit=100`)
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          setTeams(teamsData.teams || [])
        }

        // Fetch games for this event
        const gamesRes = await fetch(`/api/scorekeeper/games?eventId=${resolvedParams.id}&limit=100`)
        if (gamesRes.ok) {
          const gamesData = await gamesRes.json()
          setGames(gamesData.games || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchData()
    }
  }, [session, resolvedParams.id])

  const getEventStatus = (): { label: string; variant: 'success' | 'warning' | 'default' | 'error' | 'info' } => {
    if (!event) return { label: 'Unknown', variant: 'default' }

    const now = new Date()
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)

    if (!event.isActive) {
      return { label: 'Inactive', variant: 'error' }
    }
    if (now < start) {
      return { label: 'Upcoming', variant: 'info' }
    }
    if (now >= start && now <= end) {
      return { label: 'In Progress', variant: 'success' }
    }
    return { label: 'Completed', variant: 'default' }
  }

  const getGameStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
      SCHEDULED: 'default',
      WARMUP: 'warning',
      IN_PROGRESS: 'success',
      HALFTIME: 'warning',
      FINAL: 'info',
      POSTPONED: 'error',
      CANCELED: 'error',
    }
    return variants[status] || 'default'
  }

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/admin/events')}
            className="mt-4 text-white hover:underline"
          >
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  if (!event) {
    return null
  }

  const eventStatus = getEventStatus()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white uppercase tracking-wider">{event.name}</h1>
              <Badge variant={eventStatus.variant as any}>{eventStatus.label}</Badge>
              {!event.isPublished && (
                <Badge variant="warning">Draft</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              {(event.venue || event.city) && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {event.venue ? `${event.venue}, ` : ''}
                    {event.city}{event.state ? `, ${event.state}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/events/${event.slug}`}>
              <Button variant="secondary" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                View Public
              </Button>
            </Link>
            <Link href={`/admin/events/${event.id}/edit`}>
              <Button className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Event
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{teams.length}</p>
              <p className="text-sm text-gray-400">Teams</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{games.length}</p>
              <p className="text-sm text-gray-400">Games</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {games.filter(g => g.status === 'FINAL').length}
              </p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              {event.isPublished ? (
                <Eye className="w-5 h-5 text-white" />
              ) : (
                <EyeOff className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {event.isPublished ? 'Live' : 'Draft'}
              </p>
              <p className="text-sm text-gray-400">Status</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">
            <Users className="w-4 h-4 mr-2 inline" />
            Teams ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="games">
            <Gamepad2 className="w-4 h-4 mr-2 inline" />
            Games ({games.length})
          </TabsTrigger>
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <Card className="overflow-hidden p-0">
            {teams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No teams registered</h3>
                <p className="text-gray-500">Teams will appear here once they register for this event</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#252540]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Team Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Coach
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Age Group
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Division
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252540]">
                    {teams.map((team) => (
                      <tr key={team.id} className="hover:bg-[#252540]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{team.name}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {team.coachName || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {team.ageGroup ? (
                            <Badge variant="info" size="sm">{team.ageGroup}</Badge>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {team.division ? (
                            <Badge variant="default" size="sm">{team.division}</Badge>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games">
          <Card className="overflow-hidden p-0">
            {games.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No games scheduled</h3>
                <p className="text-gray-500 mb-4">Schedule games for this event</p>
                <Link href="/admin/games/new">
                  <Button>Schedule Game</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#252540]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Matchup
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Date/Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Court
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252540]">
                    {games.map((game) => (
                      <tr
                        key={game.id}
                        className="hover:bg-[#252540]/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/games/${game.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">
                            {game.homeTeam.name} vs {game.awayTeam.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {game.status === 'FINAL' || game.status === 'IN_PROGRESS' ? (
                            <span className="font-bold text-white">
                              {game.homeScore} - {game.awayScore}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {format(new Date(game.scheduledAt), 'MMM d, h:mm a')}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {game.court || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="default" size="sm">
                            {game.gameType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getGameStatusBadge(game.status)} size="sm">
                            {game.status.replace('_', ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
