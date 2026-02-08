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
  Trophy,
} from 'lucide-react'
import { Card, Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Select } from '@/components/ui'

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
  exposureId?: number | null
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

  // Push to Exposure State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isPushModalOpen, setPushModalOpen] = useState(false)
  const [pushDivisionId, setPushDivisionId] = useState('')
  const [isPushing, setIsPushing] = useState(false)
  const [pushError, setPushError] = useState('')
  const [pushSuccessCount, setPushSuccessCount] = useState(0)
  const [isBulkPush, setIsBulkPush] = useState(false)
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>('all')
  const [selectedAgeGroupFilter, setSelectedAgeGroupFilter] = useState<string>('all')

  const uniqueDivisions = Array.from(new Set(teams.map(t => t.division || 'Unassigned'))).sort()
  const uniqueAgeGroups = Array.from(new Set(teams.map(t => t.ageGroup || 'Unassigned'))).sort()
  const filteredTeams = teams.filter(t => {
    const matchesDivision = selectedDivisionFilter === 'all' || (t.division || 'Unassigned') === selectedDivisionFilter
    const matchesAgeGroup = selectedAgeGroupFilter === 'all' || (t.ageGroup || 'Unassigned') === selectedAgeGroupFilter
    return matchesDivision && matchesAgeGroup
  })

  const handlePushTeam = async () => {
    if (!pushDivisionId) return
    setIsPushing(true)
    setPushError('')
    setPushSuccessCount(0)

    try {
      if (isBulkPush) {
        // Bulk Push Logic
        // Filter out teams that are already synced? Or allow re-sync?
        // Let's assume re-sync is fine, but maybe prioritize unsynced.
        // For now, push ALL displayed (filtered) teams.
        let successCount = 0

        for (const team of filteredTeams) {
          try {
            const res = await fetch(`/api/admin/events/${resolvedParams.id}/push-team`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teamId: team.id,
                divisionId: pushDivisionId
              })
            })
            if (res.ok) successCount++
          } catch (e) {
            console.error(`Failed to push team ${team.name}`, e)
          }
        }

        setPushSuccessCount(successCount)
        if (successCount > 0) {
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } else {
          setPushError('Failed to push any teams.')
        }

      } else {
        // Single Team Push
        if (!selectedTeam) return

        const res = await fetch(`/api/admin/events/${resolvedParams.id}/push-team`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: selectedTeam.id,
            divisionId: pushDivisionId
          })
        })

        const data = await res.json()

        if (res.ok) {
          setPushModalOpen(false)
          setSelectedTeam(null)
          setPushDivisionId('')
          window.location.reload()
        } else {
          setPushError(data.error || 'Failed to push team')
        }
      }
    } catch (err) {
      setPushError('Network error occurred')
    } finally {
      setIsPushing(false)
    }
  }

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
      <div className="min-h-screen bg-[#0A1D37] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A1D37] text-white w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-6 text-center">
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
    <div className="min-h-screen bg-[#0A1D37] text-white w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl lg:text-5xl tracking-tighter font-bold text-white uppercase">{event.name}</h1>
              <Badge variant={eventStatus.variant as any}>{eventStatus.label}</Badge>
              {!event.isPublished && (
                <Badge variant="warning">Draft</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-bold uppercase tracking-widest mt-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              {(event.venue || event.city) && (
                <div className="flex items-center gap-2">
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
        <Card className="rounded-sm p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{teams.length}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Teams</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-sm p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-sm">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{games.length}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Games</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-sm p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-sm">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {games.filter(g => g.status === 'FINAL').length}
              </p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-sm p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-sm">
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
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</p>
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
          <TabsTrigger value="exposure">
            <Trophy className="w-4 h-4 mr-2 inline" />
            Exposure Sync
          </TabsTrigger>
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <Card className="overflow-hidden p-0 rounded-sm border border-white/5">
            {teams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">No teams registered</h3>
                <p className="text-gray-500 text-sm">Teams will appear here once they register for this event</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#152e50]/50 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Team Name
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Coach
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Age Group
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Division
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {teams.map((team) => (
                      <tr key={team.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white uppercase tracking-wide">{team.name}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
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
          <Card className="overflow-hidden p-0 rounded-sm border border-white/5">
            {games.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">No games scheduled</h3>
                <p className="text-gray-500 text-sm mb-4">Schedule games for this event</p>
                <Link href="/admin/games/new">
                  <Button>Schedule Game</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#152e50]/50 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Matchup
                      </th>
                      <th className="px-6 py-4 text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Score
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Date/Time
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Court
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {games.map((game) => (
                      <tr
                        key={game.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/games/${game.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-white uppercase tracking-wide">
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
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {format(new Date(game.scheduledAt), 'MMM d, h:mm a')}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
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

        {/* Exposure Sync Tab */}
        <TabsContent value="exposure">
          <Card className="overflow-hidden p-0 rounded-sm border border-white/5">
            <div className="p-4 border-b border-white/5 bg-[#152e50]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Exposure Integration</h3>
                <p className="text-xs text-gray-400 mt-1">Push registered teams to the official Exposure Events schedule.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-40">
                  <Select
                    options={[
                      { value: 'all', label: 'All Divisions' },
                      ...uniqueDivisions.map(d => ({ value: d, label: d }))
                    ]}
                    value={selectedDivisionFilter}
                    onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                    className="py-1 text-xs"
                  />
                </div>
                <div className="w-40">
                  <Select
                    options={[
                      { value: 'all', label: 'All Age Groups' },
                      ...uniqueAgeGroups.map(a => ({ value: a, label: a }))
                    ]}
                    value={selectedAgeGroupFilter}
                    onChange={(e) => setSelectedAgeGroupFilter(e.target.value)}
                    className="py-1 text-xs"
                  />
                </div>
                {filteredTeams.length > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex items-center gap-2"
                    onClick={() => {
                      setIsBulkPush(true)
                      setSelectedTeam(null)
                      setPushModalOpen(true)
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/exposure-logo.png" alt="Exposure" className="w-4 h-4 object-contain" />
                    Push Filtered ({filteredTeams.length})
                  </Button>
                )}
              </div>
            </div>
            {filteredTeams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">No teams found</h3>
                <p className="text-gray-500 text-sm">No teams match the selected filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#152e50]/50 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Team</th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Division</th>
                      <th className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-right text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTeams.map((team) => (
                      <tr key={team.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white uppercase tracking-wide">{team.name}</div>
                          <div className="text-xs text-gray-500">{team.coachName || 'No Coach'}</div>
                        </td>
                        <td className="px-6 py-4">
                          {team.division ? (
                            <Badge variant="default" size="sm">{team.division}</Badge>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {team.exposureId ? (
                            <Badge variant="success" size="sm">Synced ({team.exposureId})</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">Not Synced</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant={team.exposureId ? 'secondary' : 'primary'}
                            onClick={() => {
                              setIsBulkPush(false)
                              setSelectedTeam(team)
                              setPushModalOpen(true)
                            }}
                          >
                            {team.exposureId ? 'Re-Sync' : 'Push to Exposure'}
                          </Button>
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

      {/* Push Modal */}
      <Modal
        isOpen={isPushModalOpen}
        onClose={() => {
          setPushModalOpen(false)
          setSelectedTeam(null)
          setPushError('')
        }}
        title={isBulkPush ? 'Push All Teams to Exposure' : `Push ${selectedTeam?.name} to Exposure`}
      >
        <div className="space-y-4">
          {isBulkPush && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
              <strong>Warning:</strong> You are about to push <strong>{filteredTeams.length} teams</strong> to the same Exposure Division.
              Use this only if all teams belong to the same division (e.g., all 17U Gold).
            </div>
          )}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              Enter the <strong>Exposure Division ID</strong> for this team. This will create or update the team in the live schedule.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Exposure Division ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 1045"
                value={pushDivisionId}
                onChange={(e) => setPushDivisionId(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 text-white px-4 py-2 rounded-sm focus:outline-none focus:border-eha-red"
              />
              <Button variant="secondary" onClick={() => window.open('https://exposureevents.com/admin/divisions', '_blank')}>
                Find ID
              </Button>
            </div>
          </div>

          {pushError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {pushError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={() => {
                setPushModalOpen(false)
                setSelectedTeam(null)
                setIsBulkPush(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePushTeam}
              isLoading={isPushing}
              disabled={!pushDivisionId}
            >
              Confirm Push
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
