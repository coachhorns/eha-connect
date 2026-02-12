'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import {
  Trophy,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Search,
  PlayCircle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Team {
  id: string
  slug: string
  name: string
  logo: string | null
}

interface Event {
  id: string
  slug: string
  name: string
}

interface Game {
  id: string
  homeTeam: Team
  awayTeam: Team
  homeScore: number
  awayScore: number
  scheduledAt: string
  status: string
  court: string | null
  currentPeriod: number
  division: string | null
  gameType: string
  bracketRound: string | null
  event: Event | null
}

interface EventFilter {
  id: string
  name: string
  slug: string
}

interface Filters {
  events: EventFilter[]
  divisions: string[]
  dates: string[]
}

// ============================================================================
// GAME CARD COMPONENT
// ============================================================================

function GameCard({ game }: { game: Game }) {
  const isLive = game.status === 'IN_PROGRESS' || game.status === 'HALFTIME'
  const isFinal = game.status === 'FINAL'
  const homeWon = isFinal && game.homeScore > game.awayScore
  const awayWon = isFinal && game.awayScore > game.homeScore

  const category = game.division || ''

  return (
    <Link href={`/games/${game.id}`}>
      <article
        className={cn(
          "bg-[#0a1628] rounded-sm p-0 border cursor-pointer group flex flex-col overflow-hidden relative transition-all duration-300",
          isLive
            ? "ring-2 ring-eha-red/20 border-eha-red/30 shadow-lg shadow-eha-red/10 hover:shadow-xl hover:shadow-eha-red/20"
            : "border-white/10 shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:border-white/20"
        )}
      >
        {/* Left Border Indicator */}
        <div
          className={cn(
            "absolute top-0 left-0 w-1 h-full",
            isLive ? "bg-eha-red" : homeWon || awayWon ? "bg-green-500" : "bg-white/20"
          )}
        />

        <div className="p-5 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                {category || 'Game'}
              </span>
              {isLive ? (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-eha-red opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-eha-red" />
                  </span>
                  <span className="text-xs font-bold text-eha-red uppercase tracking-wider">
                    {game.status === 'HALFTIME' ? 'Halftime' : `Live • Q${game.currentPeriod || 1}`}
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider w-fit",
                      isFinal
                        ? "text-green-400 bg-green-500/10"
                        : "text-gray-400 bg-white/5"
                    )}
                  >
                    {isFinal ? 'Final' : game.status}
                  </span>
                  {game.bracketRound && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider w-fit">
                      {game.bracketRound}
                    </span>
                  )}
                </div>
              )}
            </div>
            {isLive ? (
              <span className="text-xs font-bold text-eha-red bg-eha-red/10 px-2 py-1 rounded">
                {format(new Date(game.scheduledAt), 'h:mm a')}
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(game.scheduledAt), 'h:mm a')}
              </span>
            )}
          </div>

          {/* Teams */}
          <div className="space-y-4 mb-6 flex-grow">
            {/* Away Team */}
            <div className={cn("flex items-center justify-between", !isLive && !awayWon && isFinal && "opacity-60")}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#153361] flex items-center justify-center border border-white/10 overflow-hidden">
                  {game.awayTeam.logo ? (
                    <Image
                      src={game.awayTeam.logo}
                      alt={game.awayTeam.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <Users className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-base leading-tight font-heading">
                    {game.awayTeam.name}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-2xl font-black font-stats",
                  isLive || awayWon ? "text-white" : "text-gray-500"
                )}
              >
                {game.awayScore}
              </span>
            </div>

            {/* Home Team */}
            <div className={cn("flex items-center justify-between", !isLive && !homeWon && isFinal && "opacity-60")}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#153361] flex items-center justify-center border border-white/10 overflow-hidden">
                  {game.homeTeam.logo ? (
                    <Image
                      src={game.homeTeam.logo}
                      alt={game.homeTeam.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <Users className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-base leading-tight font-heading">
                    {game.homeTeam.name}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-2xl font-black font-stats",
                  isLive || homeWon ? "text-white" : "text-gray-500"
                )}
              >
                {game.homeScore}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
              <MapPin className="w-3 h-3" />
              <span>{game.court || 'TBD'}</span>
            </div>
            {isLive ? (
              <span className="text-xs font-bold text-eha-red group-hover:text-white transition-colors flex items-center gap-1">
                Watch Live <PlayCircle className="w-4 h-4" />
              </span>
            ) : (
              <span className="text-xs font-bold text-white group-hover:text-eha-red transition-colors flex items-center gap-1">
                Box Score <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function GameCardSkeleton() {
  return (
    <div className="bg-[#0a1628] rounded-sm border border-white/5 p-5 animate-pulse">
      <div className="flex justify-between mb-5">
        <div className="space-y-2">
          <div className="h-3 bg-[#153361] rounded w-24" />
          <div className="h-4 bg-[#153361] rounded w-16" />
        </div>
        <div className="h-4 bg-[#153361] rounded w-16" />
      </div>
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#153361] rounded-lg" />
            <div className="h-4 bg-[#153361] rounded w-28" />
          </div>
          <div className="h-6 bg-[#153361] rounded w-8" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#153361] rounded-lg" />
            <div className="h-4 bg-[#153361] rounded w-24" />
          </div>
          <div className="h-6 bg-[#153361] rounded w-8" />
        </div>
      </div>
      <div className="pt-4 border-t border-white/5 flex justify-between">
        <div className="h-3 bg-[#153361] rounded w-20" />
        <div className="h-3 bg-[#153361] rounded w-16" />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ResultsPage() {
  const [games, setGames] = useState<Game[]>([])
  const [filters, setFilters] = useState<Filters | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('date')

  // Refactored fetch function that can be called for initial load or silent refresh
  const fetchResults = async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true)
    }
    try {
      const params = new URLSearchParams()
      if (selectedEvent) params.append('eventId', selectedEvent)
      if (selectedDivision) params.append('division', selectedDivision)
      if (selectedDate) params.append('date', selectedDate)

      const res = await fetch(`/api/public/results?${params}`)
      if (res.ok) {
        const data = await res.json()
        setGames(data.games)
        if (data.filters) {
          setFilters(data.filters)
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  // Initial fetch and refetch when filters change (shows loading spinner)
  useEffect(() => {
    fetchResults(false)
  }, [selectedEvent, selectedDivision, selectedDate])

  // Auto-refresh every 5 seconds (silent - no loading spinner)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchResults(true)
    }, 5000)

    return () => clearInterval(intervalId)
  }, [selectedEvent, selectedDivision, selectedDate])

  // Filter games by search query
  const filteredGames = games.filter((game) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      game.homeTeam.name.toLowerCase().includes(query) ||
      game.awayTeam.name.toLowerCase().includes(query) ||
      game.event?.name.toLowerCase().includes(query)
    )
  })

  // Sort games based on selected sort option
  const sortedGames = [...filteredGames].sort((a, b) => {
    switch (sortBy) {
      case 'division':
        const divA = a.division || ''
        const divB = b.division || ''
        if (divA !== divB) return divA.localeCompare(divB)
        return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      case 'event':
        const eventA = a.event?.name || ''
        const eventB = b.event?.name || ''
        if (eventA !== eventB) return eventA.localeCompare(eventB)
        return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      case 'date':
      default:
        return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    }
  })

  // Group games by date (or other criteria based on sort)
  const groupGames = () => {
    if (sortBy === 'division') {
      return sortedGames.reduce((acc, game) => {
        const key = game.division || 'Unspecified'
        if (!acc[key]) acc[key] = []
        acc[key].push(game)
        return acc
      }, {} as Record<string, Game[]>)
    } else if (sortBy === 'event') {
      return sortedGames.reduce((acc, game) => {
        const key = game.event?.name || 'No Event'
        if (!acc[key]) acc[key] = []
        acc[key].push(game)
        return acc
      }, {} as Record<string, Game[]>)
    } else {
      return sortedGames.reduce((acc, game) => {
        const date = format(new Date(game.scheduledAt), 'yyyy-MM-dd')
        if (!acc[date]) acc[date] = []
        acc[date].push(game)
        return acc
      }, {} as Record<string, Game[]>)
    }
  }

  const gamesByGroup = groupGames()

  const sortedKeys = Object.keys(gamesByGroup).sort((a, b) => {
    if (sortBy === 'date') {
      return b.localeCompare(a) // Dates descending
    } else {
      return a.localeCompare(b) // Alphabetical for division/event
    }
  })

  const formatGroupHeader = (key: string) => {
    if (sortBy === 'date') {
      const date = parseISO(key)
      if (isToday(date)) return 'Today'
      if (isYesterday(date)) return 'Yesterday'
      return format(date, 'EEEE, MMMM d, yyyy')
    }
    return key
  }

  const hasFilters = selectedEvent || selectedDivision || selectedDate

  const clearFilters = () => {
    setSelectedEvent('')
    setSelectedDivision('')
    setSelectedDate('')
    setSearchQuery('')
  }

  const selectStyle = {
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem',
  }

  return (
    <div className="min-h-screen bg-[#0A1D37]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-12 bg-[#0a1628] border-b border-white/5">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div className="space-y-4">
              {/* Live Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-eha-red animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                  Live Updates Enabled
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl text-white tracking-tighter font-heading font-bold">
                Game Results
              </h1>
              <p className="text-lg text-gray-400 font-light max-w-xl">
                Real-time scores, box scores, and analytics from EHA events.
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full lg:w-auto relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-eha-red transition-colors" />
              <input
                type="text"
                placeholder="Search team or event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-80 pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:bg-white/10 focus:border-eha-red/50 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Filter Bar */}
      <section className="sticky top-20 z-40 bg-[#0a1628]/95 backdrop-blur-md border-b border-white/5 shadow-xl">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              {/* Event Filter */}
              {filters?.events && filters.events.length > 0 && (
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  style={selectStyle}
                  className="pl-4 pr-10 py-2.5 bg-[#0a1628] border border-white/10 rounded-sm text-xs font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:border-eha-red hover:bg-white/5 min-w-[180px] text-white"
                >
                  <option value="">All Events</option>
                  {filters.events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Division Filter */}
              {filters?.divisions && filters.divisions.length > 0 && (
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  style={selectStyle}
                  className="pl-4 pr-10 py-2.5 bg-[#0a1628] border border-white/10 rounded-sm text-xs font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:border-eha-red hover:bg-white/5 min-w-[140px] text-white"
                >
                  <option value="">All Divisions</option>
                  {filters.divisions.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              )}

              {/* Date Filter */}
              {filters?.dates && filters.dates.length > 0 && (
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={selectStyle}
                  className="pl-4 pr-10 py-2.5 bg-[#0a1628] border border-white/10 rounded-sm text-xs font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:border-eha-red hover:bg-white/5 min-w-[140px] text-white"
                >
                  <option value="">All Dates</option>
                  {filters.dates.map((date) => (
                    <option key={date} value={date}>
                      {format(parseISO(date), 'MMM d, yyyy')}
                    </option>
                  ))}
                </select>
              )}

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] font-bold uppercase tracking-widest text-eha-red hover:underline px-2"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-end text-sm">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={selectStyle}
                  className="pl-3 pr-8 py-2 bg-[#0a1628] border border-white/10 rounded-sm text-xs font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:border-eha-red hover:bg-white/5 text-white"
                >
                  <option value="date">Date</option>
                  <option value="division">Division</option>
                  <option value="event">Event</option>
                </select>
              </div>
              <span className="text-gray-500 font-medium">
                Showing <span className="text-white">{sortedGames.length}</span> Results
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <main className="py-8">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          ) : sortedGames.length === 0 ? (
            <div className="text-center py-20 bg-[#0a1628] border border-white/5 rounded-sm">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Results Yet</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                There are no completed or live games to display with the current filters.
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-[10px] font-bold uppercase tracking-widest text-eha-red hover:underline"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              {sortedKeys.map((groupKey) => (
                <div key={groupKey}>
                  {/* Group Header */}
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-4">
                    <Calendar className="w-4 h-4" />
                    <span>{formatGroupHeader(groupKey)}</span>
                    <span className="text-gray-600">
                      ({gamesByGroup[groupKey].length} {gamesByGroup[groupKey].length === 1 ? 'game' : 'games'})
                    </span>
                    <div className="h-px bg-white/10 flex-grow" />
                  </h2>

                  {/* Games Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesByGroup[groupKey].map((game) => (
                      <GameCard key={game.id} game={game} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
