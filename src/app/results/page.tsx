'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import {
  Trophy,
  Filter,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

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
  ageGroup: string | null
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
  ageGroups: string[]
  dates: string[]
}

export default function ResultsPage() {
  const [games, setGames] = useState<Game[]>([])
  const [filters, setFilters] = useState<Filters | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedEvent) params.append('eventId', selectedEvent)
        if (selectedAgeGroup) params.append('ageGroup', selectedAgeGroup)
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
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [selectedEvent, selectedAgeGroup, selectedDate])

  // Group games by date
  const gamesByDate = games.reduce((acc, game) => {
    const date = format(new Date(game.scheduledAt), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(game)
    return acc
  }, {} as Record<string, Game[]>)

  const sortedDates = Object.keys(gamesByDate).sort((a, b) => b.localeCompare(a))

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d, yyyy')
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
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1A1A2E] to-[#0F0F1A] border-b border-[#252540]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[#FF6B00]" />
            <h1 className="text-3xl font-bold text-white">Results</h1>
          </div>
          <p className="text-gray-400">Recent game scores and results</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter by:</span>
            </div>

            {/* Event Filter */}
            {filters?.events && filters.events.length > 0 && (
              <div className="relative">
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="appearance-none bg-[#252540] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">All Events</option>
                  {filters.events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Age Group Filter */}
            {filters?.ageGroups && filters.ageGroups.length > 0 && (
              <div className="relative">
                <select
                  value={selectedAgeGroup}
                  onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  className="appearance-none bg-[#252540] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">All Age Groups</option>
                  {filters.ageGroups.map(ag => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Date Filter */}
            {filters?.dates && filters.dates.length > 0 && (
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="appearance-none bg-[#252540] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">All Dates</option>
                  {filters.dates.map(date => (
                    <option key={date} value={date}>
                      {format(parseISO(date), 'MMM d, yyyy')}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {(selectedEvent || selectedAgeGroup || selectedDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedEvent('')
                  setSelectedAgeGroup('')
                  setSelectedDate('')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
          </div>
        ) : games.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Results Yet</h3>
            <p className="text-gray-500">There are no completed or live games to display.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            {sortedDates.map(date => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-[#FF6B00]" />
                  <h2 className="text-lg font-semibold text-white">
                    {formatDateHeader(date)}
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({gamesByDate[date].length} {gamesByDate[date].length === 1 ? 'game' : 'games'})
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {gamesByDate[date].map(game => {
                    const homeWon = game.status === 'FINAL' && game.homeScore > game.awayScore
                    const awayWon = game.status === 'FINAL' && game.awayScore > game.homeScore

                    return (
                      <Link key={game.id} href={`/games/${game.id}`}>
                        <Card variant="hover" className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getStatusBadge(game)}
                              {game.ageGroup && <Badge size="sm">{game.ageGroup}</Badge>}
                              {game.bracketRound && (
                                <Badge size="sm" variant="gold">{game.bracketRound}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {format(new Date(game.scheduledAt), 'h:mm a')}
                            </div>
                          </div>

                          {/* Teams & Scores */}
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {game.awayTeam.logo ? (
                                  <Image
                                    src={game.awayTeam.logo}
                                    alt={game.awayTeam.name}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-[#252540] rounded-full flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-gray-400">
                                      {game.awayTeam.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <span className={`font-medium truncate ${awayWon ? 'text-white' : 'text-gray-400'}`}>
                                  {game.awayTeam.name}
                                </span>
                                {awayWon && (
                                  <span className="text-[10px] text-[#FF6B00] font-bold ml-1">W</span>
                                )}
                              </div>
                              <span className={`text-xl font-bold ml-4 ${awayWon ? 'text-[#FF6B00]' : 'text-white'}`}>
                                {game.awayScore}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {game.homeTeam.logo ? (
                                  <Image
                                    src={game.homeTeam.logo}
                                    alt={game.homeTeam.name}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-[#252540] rounded-full flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-gray-400">
                                      {game.homeTeam.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <span className={`font-medium truncate ${homeWon ? 'text-white' : 'text-gray-400'}`}>
                                  {game.homeTeam.name}
                                </span>
                                {homeWon && (
                                  <span className="text-[10px] text-[#FF6B00] font-bold ml-1">W</span>
                                )}
                              </div>
                              <span className={`text-xl font-bold ml-4 ${homeWon ? 'text-[#FF6B00]' : 'text-white'}`}>
                                {game.homeScore}
                              </span>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#252540]">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {game.event && (
                                <span className="truncate max-w-[200px]">{game.event.name}</span>
                              )}
                              {game.court && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {game.court}
                                  </span>
                                </>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
