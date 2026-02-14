'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns'
import {
  Calendar,
  MapPin,
  Clock,
  Play,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Filter,
  Lock,
  LogOut,
} from 'lucide-react'
import { Card, Button, Badge, Input } from '@/components/ui'

const VALID_PIN = '7890'
const AUTH_KEY = 'scorekeeper_auth'

interface Game {
  id: string
  homeTeam: { id: string; name: string; logo?: string }
  awayTeam: { id: string; name: string; logo?: string }
  homeScore: number
  awayScore: number
  scheduledAt: string
  status: string
  court?: string
  currentPeriod?: number
  event?: { id: string; name: string }
  division?: string
  gameType?: string
}

export default function ScorekeeperHub() {
  const router = useRouter()
  const [auth, setAuth] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Game list state
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Check sessionStorage for existing auth on mount
  useEffect(() => {
    const storedAuth = sessionStorage.getItem(AUTH_KEY)
    if (storedAuth === 'true') {
      setAuth(true)
    }
    setIsCheckingAuth(false)
  }, [])

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === VALID_PIN) {
      sessionStorage.setItem(AUTH_KEY, 'true')
      setAuth(true)
      setPinError('')
    } else {
      setPinError('Invalid PIN. Please try again.')
      setPin('')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY)
    setAuth(false)
    setPin('')
  }

  const fetchGames = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const params = new URLSearchParams({ date: dateStr })
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/scorekeeper/games?${params}`)
      const data = await res.json()
      setGames(data.games || [])
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedDate, statusFilter])

  useEffect(() => {
    if (auth) {
      fetchGames()
    }
  }, [auth, fetchGames])

  // Auto-refresh every 30 seconds for live games
  useEffect(() => {
    if (!auth) return
    const hasLiveGames = games.some(g => g.status === 'IN_PROGRESS')
    if (!hasLiveGames) return

    const interval = setInterval(() => {
      fetchGames()
    }, 30000)

    return () => clearInterval(interval)
  }, [auth, games, fetchGames])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchGames()
  }

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1))
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1))
  const goToToday = () => setSelectedDate(new Date())

  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMM d')
  }

  const getStatusBadge = (game: Game) => {
    switch (game.status) {
      case 'IN_PROGRESS':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Q{game.currentPeriod || 1}
          </Badge>
        )
      case 'FINAL':
        return <Badge>FINAL</Badge>
      case 'HALFTIME':
        return <Badge variant="warning">HALF</Badge>
      case 'POSTPONED':
        return <Badge variant="error">PPD</Badge>
      case 'CANCELED':
        return <Badge variant="error">CAN</Badge>
      default:
        return null
    }
  }

  const formatGameTime = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a')
  }

  // Group games by court
  const gamesByCourt = games.reduce((acc, game) => {
    const court = game.court || 'Unassigned'
    if (!acc[court]) acc[court] = []
    acc[court].push(game)
    return acc
  }, {} as Record<string, Game[]>)

  // Group games by status for alternate view
  const liveGames = games.filter(g => g.status === 'IN_PROGRESS' || g.status === 'HALFTIME')
  const upcomingGames = games.filter(g => g.status === 'SCHEDULED' || g.status === 'WARMUP')
  const completedGames = games.filter(g => g.status === 'FINAL' || g.status === 'POSTPONED' || g.status === 'CANCELED')

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-eha-navy flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-3 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  // PIN Entry Screen
  if (!auth) {
    return (
      <div className="min-h-screen bg-eha-navy flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-eha-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-eha-red" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Scorekeeper</h1>
            <p className="text-text-muted">Enter your PIN to access the scorekeeper</p>
          </div>

          <form onSubmit={handlePinSubmit}>
            <Card className="p-6">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''))
                  setPinError('')
                }}
                error={pinError}
                className="text-center text-2xl tracking-[0.5em] font-mono py-4"
                autoFocus
              />

              <Button
                type="submit"
                className="w-full mt-4 py-4 text-lg touch-manipulation"
                disabled={pin.length !== 4}
              >
                Access Scorekeeper
              </Button>
            </Card>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            Contact your tournament director for access
          </p>
        </div>
      </div>
    )
  }

  // Game Card Component
  const GameCard = ({ game }: { game: Game }) => (
    <Link href={`/scorekeeper/game/${game.id}`}>
      <Card variant="hover" className="p-4 touch-manipulation min-h-[100px]">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Event & Court Info */}
            <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
              {game.event && <span className="truncate">{game.event.name}</span>}
              {game.court && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <MapPin className="w-3 h-3" />
                    {game.court}
                  </span>
                </>
              )}
              {game.division && (
                <>
                  <span>•</span>
                  <Badge size="sm">{game.division}</Badge>
                </>
              )}
            </div>

            {/* Teams & Scores */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary truncate pr-2 text-lg">{game.awayTeam.name}</span>
                {(game.status === 'IN_PROGRESS' || game.status === 'FINAL' || game.status === 'HALFTIME') && (
                  <span className="text-2xl font-bold text-text-primary font-stats">
                    {game.awayScore}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary truncate pr-2 text-lg">{game.homeTeam.name}</span>
                {(game.status === 'IN_PROGRESS' || game.status === 'FINAL' || game.status === 'HALFTIME') && (
                  <span className="text-2xl font-bold text-text-primary font-stats">
                    {game.homeScore}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status/Action */}
          <div className="ml-4 flex flex-col items-end gap-2">
            {getStatusBadge(game)}
            {game.status === 'SCHEDULED' && (
              <>
                <span className="text-sm text-text-muted flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatGameTime(game.scheduledAt)}
                </span>
                <Button size="sm" className="flex items-center gap-1 touch-manipulation">
                  <Play className="w-3 h-3" />
                  Start
                </Button>
              </>
            )}
            {game.status === 'IN_PROGRESS' && (
              <span className="text-xs text-green-400">Live</span>
            )}
          </div>

          <ChevronRight className="w-6 h-6 text-gray-600 ml-2 flex-shrink-0" />
        </div>
      </Card>
    </Link>
  )

  // Authenticated Dashboard
  return (
    <div className="min-h-screen bg-eha-navy">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Scorekeeper Hub</h1>
            <p className="text-sm text-text-muted">Select a game to record stats</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 touch-manipulation"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary touch-manipulation"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={goToPreviousDay} className="p-3 touch-manipulation">
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-text-primary">{getDateLabel(selectedDate)}</p>
                <p className="text-sm text-text-muted">{format(selectedDate, 'MMMM d, yyyy')}</p>
              </div>
              {!isToday(selectedDate) && (
                <Button variant="outline" size="sm" onClick={goToToday} className="touch-manipulation">
                  Today
                </Button>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={goToNextDay} className="p-3 touch-manipulation">
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </Card>

        {/* Status Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${statusFilter === ''
                ? 'bg-eha-red text-white'
                : 'bg-surface-glass text-text-muted hover:text-text-primary'
              }`}
          >
            All Games
          </button>
          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${statusFilter === 'IN_PROGRESS'
                ? 'bg-green-600 text-white'
                : 'bg-surface-glass text-text-muted hover:text-text-primary'
              }`}
          >
            Live
          </button>
          <button
            onClick={() => setStatusFilter('SCHEDULED')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${statusFilter === 'SCHEDULED'
                ? 'bg-blue-600 text-white'
                : 'bg-surface-glass text-text-muted hover:text-text-primary'
              }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setStatusFilter('FINAL')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${statusFilter === 'FINAL'
                ? 'bg-gray-600 text-white'
                : 'bg-surface-glass text-text-muted hover:text-text-primary'
              }`}
          >
            Completed
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-10 h-10 border-3 border-eha-red border-t-transparent rounded-full" />
          </div>
        ) : games.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No games found</h3>
            <p className="text-text-muted">
              {statusFilter
                ? `No ${statusFilter.toLowerCase().replace('_', ' ')} games for ${getDateLabel(selectedDate).toLowerCase()}.`
                : `There are no games scheduled for ${getDateLabel(selectedDate).toLowerCase()}.`}
            </p>
            {statusFilter && (
              <Button variant="outline" size="sm" className="mt-4 touch-manipulation" onClick={() => setStatusFilter('')}>
                Show All Games
              </Button>
            )}
          </Card>
        ) : statusFilter ? (
          // Show filtered games without grouping
          <div className="space-y-3">
            {games.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          // Show grouped games by status
          <div className="space-y-6">
            {/* Live Games */}
            {liveGames.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Now ({liveGames.length})
                </h2>
                <div className="space-y-3">
                  {liveGames.map(game => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Games */}
            {upcomingGames.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Upcoming ({upcomingGames.length})
                </h2>
                <div className="space-y-3">
                  {upcomingGames.map(game => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Games */}
            {completedGames.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Completed ({completedGames.length})
                </h2>
                <div className="space-y-3">
                  {completedGames.map(game => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
