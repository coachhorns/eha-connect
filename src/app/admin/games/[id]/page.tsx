'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Edit,
  Calendar,
  MapPin,
  Clock,
  Gamepad2,
  Users,
  Play,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

interface Player {
  id: string
  firstName: string
  lastName: string
  jerseyNumber: string | null
}

interface GameStats {
  id: string
  playerId: string
  teamId: string
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number
  fgMade: number
  fgAttempted: number
  fg3Made: number
  fg3Attempted: number
  ftMade: number
  ftAttempted: number
  player: Player
}

interface Team {
  id: string
  name: string
  slug: string
  coachName: string | null
  division: string | null
}

interface Event {
  id: string
  name: string
  slug: string
  venue: string | null
  city: string | null
  state: string | null
}

interface Game {
  id: string
  scheduledAt: string
  status: string
  currentPeriod: number
  homeScore: number
  awayScore: number
  court: string | null
  gameType: string
  division: string | null
  homeTeam: Team
  awayTeam: Team
  event: Event | null
  stats: GameStats[]
}

export default function GameDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [game, setGame] = useState<Game | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/games/${resolvedParams.id}`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/admin/games/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          setGame(data.game)
        } else {
          setError('Game not found')
        }
      } catch (err) {
        console.error('Error fetching game:', err)
        setError('Failed to load game')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchGame()
    }
  }, [session, resolvedParams.id])

  const getStatusBadge = (status: string): { label: string; variant: 'success' | 'warning' | 'default' | 'error' | 'info' } => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'default' | 'error' | 'info' }> = {
      SCHEDULED: { label: 'Scheduled', variant: 'info' },
      WARMUP: { label: 'Warmup', variant: 'warning' },
      IN_PROGRESS: { label: 'In Progress', variant: 'success' },
      HALFTIME: { label: 'Halftime', variant: 'warning' },
      FINAL: { label: 'Final', variant: 'default' },
      POSTPONED: { label: 'Postponed', variant: 'warning' },
      CANCELED: { label: 'Canceled', variant: 'error' },
    }
    return statusMap[status] || { label: status, variant: 'default' }
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
      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/admin/games')}
            className="mt-4 text-text-primary hover:underline"
          >
            Back to Games
          </button>
        </div>
      </div>
    )
  }

  if (!game) {
    return null
  }

  const statusBadge = getStatusBadge(game.status)

  // Separate stats by team
  const homeStats = game.stats.filter(s => s.teamId === game.homeTeam.id)
  const awayStats = game.stats.filter(s => s.teamId === game.awayTeam.id)

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/games"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary">
                {game.awayTeam.name} @ {game.homeTeam.name}
              </h1>
              <Badge variant={statusBadge.variant as any}>{statusBadge.label}</Badge>
            </div>
            {game.event && (
              <p className="text-text-muted">{game.event.name}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Link href={`/scorekeeper/game/${game.id}`}>
              <Button variant="secondary" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Open Scorekeeper
              </Button>
            </Link>
            <Link href={`/admin/games/${game.id}/edit`}>
              <Button className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Game
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Score Card */}
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-center gap-8">
          {/* Away Team */}
          <div className="text-center flex-1">
            <p className="text-lg font-medium text-text-muted mb-2">{game.awayTeam.name}</p>
            <p className="text-6xl font-bold text-text-primary">{game.awayScore}</p>
            {game.awayTeam.coachName && (
              <p className="text-sm text-text-muted mt-2">Coach: {game.awayTeam.coachName}</p>
            )}
          </div>

          {/* VS / Period */}
          <div className="flex flex-col items-center px-8">
            <p className="text-3xl font-bold text-text-muted">VS</p>
            {game.status === 'IN_PROGRESS' && (
              <Badge variant="success" className="mt-2">
                Q{game.currentPeriod}
              </Badge>
            )}
            {game.status === 'FINAL' && (
              <Badge variant="default" className="mt-2">FINAL</Badge>
            )}
          </div>

          {/* Home Team */}
          <div className="text-center flex-1">
            <p className="text-lg font-medium text-text-muted mb-2">{game.homeTeam.name}</p>
            <p className="text-6xl font-bold text-text-primary">{game.homeScore}</p>
            {game.homeTeam.coachName && (
              <p className="text-sm text-text-muted mt-2">Coach: {game.homeTeam.coachName}</p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Game Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-text-primary" />
            Game Info
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-text-muted" />
              <div>
                <p className="text-text-primary">{format(new Date(game.scheduledAt), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-text-muted">{format(new Date(game.scheduledAt), 'h:mm a')}</p>
              </div>
            </div>
            {game.court && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-text-muted" />
                <p className="text-text-primary">{game.court}</p>
              </div>
            )}
            {game.event && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-text-muted" />
                <div>
                  <p className="text-text-primary">{game.event.name}</p>
                  {game.event.venue && (
                    <p className="text-sm text-text-muted">
                      {game.event.venue}, {game.event.city}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-border-default">
              {game.division && (
                <Badge variant="default" size="sm" className="mr-2">{game.division}</Badge>
              )}
              <Badge variant="default" size="sm">{game.gameType}</Badge>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-text-primary" />
            Team Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Away Team Stats */}
            <div>
              <h3 className="text-sm font-medium text-text-muted mb-2">{game.awayTeam.name}</h3>
              <div className="space-y-1">
                {awayStats.length > 0 ? (
                  <>
                    <p className="text-text-primary">
                      FG: {awayStats.reduce((a, s) => a + s.fgMade, 0)}/{awayStats.reduce((a, s) => a + s.fgAttempted, 0)}
                    </p>
                    <p className="text-text-primary">
                      3PT: {awayStats.reduce((a, s) => a + s.fg3Made, 0)}/{awayStats.reduce((a, s) => a + s.fg3Attempted, 0)}
                    </p>
                    <p className="text-text-primary">
                      FT: {awayStats.reduce((a, s) => a + s.ftMade, 0)}/{awayStats.reduce((a, s) => a + s.ftAttempted, 0)}
                    </p>
                    <p className="text-text-primary">
                      REB: {awayStats.reduce((a, s) => a + s.rebounds, 0)}
                    </p>
                  </>
                ) : (
                  <p className="text-text-muted text-sm">No stats recorded</p>
                )}
              </div>
            </div>

            {/* Home Team Stats */}
            <div>
              <h3 className="text-sm font-medium text-text-muted mb-2">{game.homeTeam.name}</h3>
              <div className="space-y-1">
                {homeStats.length > 0 ? (
                  <>
                    <p className="text-text-primary">
                      FG: {homeStats.reduce((a, s) => a + s.fgMade, 0)}/{homeStats.reduce((a, s) => a + s.fgAttempted, 0)}
                    </p>
                    <p className="text-text-primary">
                      3PT: {homeStats.reduce((a, s) => a + s.fg3Made, 0)}/{homeStats.reduce((a, s) => a + s.fg3Attempted, 0)}
                    </p>
                    <p className="text-text-primary">
                      FT: {homeStats.reduce((a, s) => a + s.ftMade, 0)}/{homeStats.reduce((a, s) => a + s.ftAttempted, 0)}
                    </p>
                    <p className="text-text-primary">
                      REB: {homeStats.reduce((a, s) => a + s.rebounds, 0)}
                    </p>
                  </>
                ) : (
                  <p className="text-text-muted text-sm">No stats recorded</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Box Score */}
      {game.stats.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Box Score</h2>

          {/* Away Team Box Score */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-text-muted mb-3">{game.awayTeam.name}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-border-default">
                    <th className="text-left py-2 px-2">Player</th>
                    <th className="text-center py-2 px-1">PTS</th>
                    <th className="text-center py-2 px-1">REB</th>
                    <th className="text-center py-2 px-1">AST</th>
                    <th className="text-center py-2 px-1">STL</th>
                    <th className="text-center py-2 px-1">BLK</th>
                    <th className="text-center py-2 px-1">TO</th>
                    <th className="text-center py-2 px-1">FG</th>
                    <th className="text-center py-2 px-1">3PT</th>
                    <th className="text-center py-2 px-1">FT</th>
                  </tr>
                </thead>
                <tbody>
                  {awayStats.map(stat => (
                    <tr key={stat.id} className="border-b border-border-default/50">
                      <td className="py-2 px-2 text-text-primary">
                        #{stat.player.jerseyNumber || '?'} {stat.player.firstName[0]}. {stat.player.lastName}
                      </td>
                      <td className="text-center py-2 px-1 text-text-primary font-medium">{stat.points}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.rebounds}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.assists}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.steals}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.blocks}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.turnovers}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.fgMade}-{stat.fgAttempted}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.fg3Made}-{stat.fg3Attempted}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.ftMade}-{stat.ftAttempted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Home Team Box Score */}
          <div>
            <h3 className="text-md font-medium text-text-muted mb-3">{game.homeTeam.name}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-border-default">
                    <th className="text-left py-2 px-2">Player</th>
                    <th className="text-center py-2 px-1">PTS</th>
                    <th className="text-center py-2 px-1">REB</th>
                    <th className="text-center py-2 px-1">AST</th>
                    <th className="text-center py-2 px-1">STL</th>
                    <th className="text-center py-2 px-1">BLK</th>
                    <th className="text-center py-2 px-1">TO</th>
                    <th className="text-center py-2 px-1">FG</th>
                    <th className="text-center py-2 px-1">3PT</th>
                    <th className="text-center py-2 px-1">FT</th>
                  </tr>
                </thead>
                <tbody>
                  {homeStats.map(stat => (
                    <tr key={stat.id} className="border-b border-border-default/50">
                      <td className="py-2 px-2 text-text-primary">
                        #{stat.player.jerseyNumber || '?'} {stat.player.firstName[0]}. {stat.player.lastName}
                      </td>
                      <td className="text-center py-2 px-1 text-text-primary font-medium">{stat.points}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.rebounds}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.assists}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.steals}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.blocks}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.turnovers}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.fgMade}-{stat.fgAttempted}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.fg3Made}-{stat.fg3Attempted}</td>
                      <td className="text-center py-2 px-1 text-text-muted">{stat.ftMade}-{stat.ftAttempted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
