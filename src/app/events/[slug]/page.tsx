'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format, isSameDay } from 'date-fns'
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Grid3X3,
  List,
  Filter,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

interface Team {
  id: string
  slug: string
  name: string
  logo: string | null
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
}

interface EventTeam {
  id: string
  pool: string | null
  seed: number | null
  eventWins: number
  eventLosses: number
  pointsFor: number
  pointsAgainst: number
  team: {
    id: string
    slug: string
    name: string
    organization: string | null
    city: string | null
    state: string | null
    ageGroup: string | null
    logo: string | null
  }
}

interface Event {
  id: string
  slug: string
  name: string
  type: string
  description: string | null
  venue: string | null
  address: string | null
  city: string | null
  state: string | null
  startDate: string
  endDate: string
  ageGroups: string[]
  divisions: string[]
  entryFee: string | null
  bannerImage: string | null
  isPublished: boolean
  teams: EventTeam[]
  games: Game[]
  _count: {
    teams: number
    games: number
  }
}

export default function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'schedule' | 'teams' | 'bracket'>('schedule')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('')
  const [selectedDivision, setSelectedDivision] = useState<string>('')

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/public/events/${resolvedParams.slug}`)
        if (res.ok) {
          const data = await res.json()
          setEvent(data.event)
          // Set initial selected date to first game day
          if (data.event.games.length > 0) {
            setSelectedDate(format(new Date(data.event.games[0].scheduledAt), 'yyyy-MM-dd'))
          }
        } else {
          setError('Event not found')
        }
      } catch (err) {
        setError('Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [resolvedParams.slug])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
        <p className="text-gray-400 mb-6">{error || 'The event you are looking for does not exist.'}</p>
        <Link href="/events">
          <Button>Browse Events</Button>
        </Link>
      </div>
    )
  }

  const isUpcoming = new Date() < new Date(event.startDate)
  const isOngoing = new Date() >= new Date(event.startDate) && new Date() <= new Date(event.endDate)
  const isPast = new Date() > new Date(event.endDate)

  const getEventTypeBadge = (type: string) => {
    const variants: Record<string, 'orange' | 'info' | 'gold' | 'success'> = {
      TOURNAMENT: 'orange',
      LEAGUE: 'info',
      SHOWCASE: 'gold',
      CAMP: 'success',
    }
    return variants[type] || 'default'
  }

  // Group teams by pool
  const teamsByPool = event.teams.reduce((acc, et) => {
    const pool = et.pool || 'Unassigned'
    if (!acc[pool]) acc[pool] = []
    acc[pool].push(et)
    return acc
  }, {} as Record<string, EventTeam[]>)

  const sortedPools = Object.keys(teamsByPool).sort((a, b) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return a.localeCompare(b)
  })

  // Get unique game dates
  const gameDates = [...new Set(event.games.map(g => format(new Date(g.scheduledAt), 'yyyy-MM-dd')))]

  // Apply global filters to games
  const applyGameFilters = (games: Game[]) => {
    return games.filter(g => {
      if (selectedAgeGroup && g.ageGroup !== selectedAgeGroup) return false
      if (selectedDivision && g.division !== selectedDivision) return false
      return true
    })
  }

  // Filter games by selected date and global filters
  const filteredGames = applyGameFilters(
    selectedDate
      ? event.games.filter(g => format(new Date(g.scheduledAt), 'yyyy-MM-dd') === selectedDate)
      : event.games
  )

  // Filter teams by global filters
  const filteredTeams = event.teams.filter(et => {
    if (selectedAgeGroup && et.team.ageGroup !== selectedAgeGroup) return false
    // Division filtering could be applied if teams have division field
    return true
  })

  // Group filtered teams by pool
  const filteredTeamsByPool = filteredTeams.reduce((acc, et) => {
    const pool = et.pool || 'Unassigned'
    if (!acc[pool]) acc[pool] = []
    acc[pool].push(et)
    return acc
  }, {} as Record<string, EventTeam[]>)

  const filteredSortedPools = Object.keys(filteredTeamsByPool).sort((a, b) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return a.localeCompare(b)
  })

  // Group bracket games by round (with filters applied)
  const bracketGames = applyGameFilters(event.games.filter(g => g.gameType === 'BRACKET' || g.bracketRound))
  const bracketRounds = [...new Set(bracketGames.map(g => g.bracketRound).filter(Boolean))]

  const hasActiveFilters = selectedAgeGroup || selectedDivision

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
        return (
          <span className="text-sm text-gray-400">
            {format(new Date(game.scheduledAt), 'h:mm a')}
          </span>
        )
    }
  }

  const GameCard = ({ game }: { game: Game }) => (
    <Link href={`/games/${game.id}`}>
      <Card variant="hover" className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Game Info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              {game.court && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {game.court}
                </span>
              )}
              {game.ageGroup && <Badge size="sm">{game.ageGroup}</Badge>}
              {game.bracketRound && (
                <Badge size="sm" variant="gold">{game.bracketRound}</Badge>
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

          <div className="ml-4 flex flex-col items-end gap-2">
            {getStatusBadge(game)}
          </div>

          <ChevronRight className="w-5 h-5 text-gray-600 ml-2 flex-shrink-0" />
        </div>
      </Card>
    </Link>
  )

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div
        className="relative h-64 md:h-80"
        style={{
          background: !event.bannerImage
            ? 'linear-gradient(135deg, #1A1A2E 0%, #252540 100%)'
            : undefined,
        }}
      >
        {event.bannerImage && (
          <Image
            src={event.bannerImage}
            alt={`${event.name} banner`}
            fill
            priority
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F1A] via-[#0F0F1A]/60 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              All Events
            </Link>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <Badge variant={getEventTypeBadge(event.type)} size="lg">
                {event.type}
              </Badge>
              {isUpcoming && <Badge variant="info">Upcoming</Badge>}
              {isOngoing && <Badge variant="success">In Progress</Badge>}
              {isPast && <Badge variant="default">Completed</Badge>}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{event.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Info Bar */}
        <Card className="mb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Dates</div>
                <div className="text-white font-medium text-sm">
                  {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                </div>
              </div>
            </div>

            {(event.venue || event.city) && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-white font-medium text-sm">
                    {event.venue || `${event.city}, ${event.state}`}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Teams</div>
                <div className="text-white font-medium text-sm">{event._count.teams} Registered</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Games</div>
                <div className="text-white font-medium text-sm">{event._count.games} Scheduled</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-[#252540] pb-4">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'bg-[#FF6B00] text-white'
                : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'teams'
                ? 'bg-[#FF6B00] text-white'
                : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            Teams & Standings
          </button>
          {event.games.some(g => g.gameType === 'BRACKET' || g.bracketRound) && (
            <button
              onClick={() => setActiveTab('bracket')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'bracket'
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Bracket
            </button>
          )}
        </div>

        {/* Filter Bar */}
        {(event.ageGroups.length > 0 || event.divisions.length > 0) && (
          <Card className="mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filter:</span>
              </div>

              {/* Age Group Filter */}
              {event.ageGroups.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedAgeGroup}
                    onChange={(e) => setSelectedAgeGroup(e.target.value)}
                    className="appearance-none bg-[#252540] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">All Age Groups</option>
                    {event.ageGroups.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}

              {/* Division Filter */}
              {event.divisions.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="appearance-none bg-[#252540] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="">All Divisions</option>
                    {event.divisions.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAgeGroup('')
                    setSelectedDivision('')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            {/* Date Filter */}
            {gameDates.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {gameDates.map(date => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedDate === date
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
                    }`}
                  >
                    {format(new Date(date), 'EEE, MMM d')}
                  </button>
                ))}
              </div>
            )}

            {filteredGames.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">
                  {hasActiveFilters ? 'No games match the selected filters' : 'No games scheduled'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setSelectedAgeGroup('')
                      setSelectedDivision('')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredGames.map(game => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Teams & Standings Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            {filteredTeams.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">
                  {hasActiveFilters ? 'No teams match the selected filters' : 'No teams registered yet'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setSelectedAgeGroup('')
                      setSelectedDivision('')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Card>
            ) : (
              filteredSortedPools.map(pool => (
                <Card key={pool} className="overflow-hidden p-0">
                  <div className="bg-[#252540] px-4 py-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      {pool === 'Unassigned' ? (
                        <span className="text-gray-400">{pool}</span>
                      ) : (
                        <Badge variant="info">{pool}</Badge>
                      )}
                      <span className="text-gray-500 text-sm font-normal">
                        ({filteredTeamsByPool[pool].length} teams)
                      </span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#252540] text-xs text-gray-500 uppercase">
                          <th className="text-left py-3 px-4">Team</th>
                          <th className="text-center py-3 px-2">W</th>
                          <th className="text-center py-3 px-2">L</th>
                          <th className="text-center py-3 px-2">PF</th>
                          <th className="text-center py-3 px-2">PA</th>
                          <th className="text-center py-3 px-2">+/-</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeamsByPool[pool]
                          .sort((a, b) => {
                            // Sort by wins, then by point differential
                            if (b.eventWins !== a.eventWins) return b.eventWins - a.eventWins
                            return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)
                          })
                          .map((et, idx) => (
                            <tr key={et.id} className="border-b border-[#252540]/50 hover:bg-[#252540]/30">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-500 text-sm w-4">{idx + 1}</span>
                                  <div>
                                    <div className="font-medium text-white">{et.team.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {et.team.ageGroup && <span>{et.team.ageGroup}</span>}
                                      {et.team.city && et.team.state && (
                                        <span className="ml-2">{et.team.city}, {et.team.state}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center py-3 px-2 text-white font-medium">{et.eventWins}</td>
                              <td className="text-center py-3 px-2 text-white font-medium">{et.eventLosses}</td>
                              <td className="text-center py-3 px-2 text-gray-400">{et.pointsFor}</td>
                              <td className="text-center py-3 px-2 text-gray-400">{et.pointsAgainst}</td>
                              <td className={`text-center py-3 px-2 font-medium ${
                                et.pointsFor - et.pointsAgainst > 0 ? 'text-green-400' :
                                et.pointsFor - et.pointsAgainst < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {et.pointsFor - et.pointsAgainst > 0 ? '+' : ''}{et.pointsFor - et.pointsAgainst}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Bracket Tab */}
        {activeTab === 'bracket' && (
          <div className="space-y-6">
            {bracketRounds.length === 0 ? (
              <Card className="p-8 text-center">
                <Grid3X3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">
                  {hasActiveFilters ? 'No bracket games match the selected filters' : 'Bracket games not yet scheduled'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setSelectedAgeGroup('')
                      setSelectedDivision('')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bracketRounds.map(round => (
                  <div key={round}>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Badge variant="gold">{round}</Badge>
                    </h3>
                    <div className="space-y-3">
                      {bracketGames
                        .filter(g => g.bracketRound === round)
                        .map(game => (
                          <GameCard key={game.id} game={game} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Registration CTA for upcoming events */}
        {isUpcoming && (
          <Card className="mt-8 bg-gradient-to-br from-[#FF6B00]/20 to-transparent border-[#FF6B00]/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Register Your Team</h3>
                <p className="text-gray-400 text-sm">
                  Don't miss out! Registration is open for this event.
                </p>
              </div>
              <Link href={`/events/${event.slug}/register`}>
                <Button size="lg" className="flex items-center gap-2">
                  Register Now
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
