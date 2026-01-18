'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

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
  ageGroup?: string
  gameType?: string
}

export default function ScorekeeperDashboard() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/scorekeeper')
    }
  }, [authStatus, router])

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
    fetchGames()
  }, [fetchGames])

  // Auto-refresh every 30 seconds for live games
  useEffect(() => {
    const hasLiveGames = games.some(g => g.status === 'IN_PROGRESS')
    if (!hasLiveGames) return

    const interval = setInterval(() => {
      fetchGames()
    }, 30000)

    return () => clearInterval(interval)
  }, [games, fetchGames])

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

  // Group games by status
  const liveGames = games.filter(g => g.status === 'IN_PROGRESS' || g.status === 'HALFTIME')
  const upcomingGames = games.filter(g => g.status === 'SCHEDULED' || g.status === 'WARMUP')
  const completedGames = games.filter(g => g.status === 'FINAL' || g.status === 'POSTPONED' || g.status === 'CANCELED')

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'SCOREKEEPER' && session?.user.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
        <p className="text-gray-400 mb-8">
          You need scorekeeper privileges to access this page.
        </p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    )
  }

  const GameCard = ({ game }: { game: Game }) => (
    <Link href={`/scorekeeper/game/${game.id}`}>
      <Card variant="hover" className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Event & Court Info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
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
              {game.ageGroup && (
                <>
                  <span>•</span>
                  <Badge size="sm">{game.ageGroup}</Badge>
                </>
              )}
            </div>

            {/* Teams & Scores */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white truncate pr-2">{game.awayTeam.name}</span>
                {(game.status === 'IN_PROGRESS' || game.status === 'FINAL' || game.status === 'HALFTIME') && (
                  <span className={`text-xl font-bold ${game.status === 'FINAL' && game.awayScore > game.homeScore ? 'text-[#FF6B00]' : 'text-white'}`}>
                    {game.awayScore}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-white truncate pr-2">{game.homeTeam.name}</span>
                {(game.status === 'IN_PROGRESS' || game.status === 'FINAL' || game.status === 'HALFTIME') && (
                  <span className={`text-xl font-bold ${game.status === 'FINAL' && game.homeScore > game.awayScore ? 'text-[#FF6B00]' : 'text-white'}`}>
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
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatGameTime(game.scheduledAt)}
                </span>
                <Button size="sm" className="flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  Start
                </Button>
              </>
            )}
            {game.status === 'IN_PROGRESS' && (
              <span className="text-xs text-green-400">Live</span>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-gray-600 ml-2 flex-shrink-0" />
        </div>
      </Card>
    </Link>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Scorekeeper</h1>
          <p className="text-sm text-gray-500">Select a game to record stats</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Date Navigation */}
      <Card className="mb-4 p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPreviousDay}>
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{getDateLabel(selectedDate)}</p>
              <p className="text-sm text-gray-500">{format(selectedDate, 'MMMM d, yyyy')}</p>
            </div>
            {!isToday(selectedDate) && (
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={goToNextDay}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Status Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === ''
              ? 'bg-[#FF6B00] text-white'
              : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
          }`}
        >
          All Games
        </button>
        <button
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-green-600 text-white'
              : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
          }`}
        >
          Live
        </button>
        <button
          onClick={() => setStatusFilter('SCHEDULED')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'SCHEDULED'
              ? 'bg-blue-600 text-white'
              : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setStatusFilter('FINAL')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'FINAL'
              ? 'bg-gray-600 text-white'
              : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
        </div>
      ) : games.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No games found</h3>
          <p className="text-gray-500">
            {statusFilter
              ? `No ${statusFilter.toLowerCase().replace('_', ' ')} games for ${getDateLabel(selectedDate).toLowerCase()}.`
              : `There are no games scheduled for ${getDateLabel(selectedDate).toLowerCase()}.`}
          </p>
          {statusFilter && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setStatusFilter('')}>
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
        // Show grouped games when no filter
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
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
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
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
  )
}
