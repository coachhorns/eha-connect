'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
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
  Bell,
  Download,
  Printer,
  User,
  Mail,
  Phone,
  CalendarDays,
  AlertTriangle,
  X,
  ShieldAlert,
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
    city: string | null
    state: string | null
    ageGroup: string | null
    logo: string | null
    program?: {
      id: string
      name: string
      slug: string
    } | null
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
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'schedule' | 'teams' | 'bracket'>('schedule')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [showBlockingModal, setShowBlockingModal] = useState(false)
  const [isCheckingDirector, setIsCheckingDirector] = useState(false)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/public/events/${resolvedParams.slug}`)
        if (res.ok) {
          const data = await res.json()
          setEvent(data.event)
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

  // Smart registration handler
  const handleRegisterClick = async () => {
    // Not logged in - redirect to signin with director role hint
    if (sessionStatus !== 'authenticated' || !session) {
      const callbackUrl = `/events/${resolvedParams.slug}/register`
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&role=PROGRAM_DIRECTOR`)
      return
    }

    const role = session.user?.role

    // PARENT or PLAYER - show blocking modal
    if (role === 'PARENT' || role === 'PLAYER') {
      setShowBlockingModal(true)
      return
    }

    // PROGRAM_DIRECTOR - check if they have a program
    if (role === 'PROGRAM_DIRECTOR') {
      setIsCheckingDirector(true)
      try {
        const res = await fetch('/api/director/program')
        const data = await res.json()

        if (!data.program) {
          // No program - redirect to onboarding with callback
          const callbackUrl = `/events/${resolvedParams.slug}/register/director`
          router.push(`/director/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
        } else if (data.program.teams.length === 0) {
          // Has program but no teams - redirect to onboarding
          const callbackUrl = `/events/${resolvedParams.slug}/register/director`
          router.push(`/director/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
        } else {
          // Has program with teams - go to director registration
          router.push(`/events/${resolvedParams.slug}/register/director`)
        }
      } catch (err) {
        console.error('Error checking director program:', err)
        // Fallback to regular registration page
        router.push(`/events/${resolvedParams.slug}/register`)
      } finally {
        setIsCheckingDirector(false)
      }
      return
    }

    // ADMIN or other roles - go to regular registration
    router.push(`/events/${resolvedParams.slug}/register`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1D37] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#0A1D37] relative overflow-hidden">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="max-w-2xl mx-auto px-4 py-32 text-center relative z-10">
          <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white mb-3">Event Not Found</h1>
          <p className="text-gray-400 mb-8">{error || 'The event you are looking for does not exist.'}</p>
          <Link href="/events">
            <Button className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]">
              Browse Events
            </Button>
          </Link>
        </div>
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
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5">
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
                  <span className={`text-xl font-bold font-mono ${game.status === 'FINAL' && game.awayScore > game.homeScore ? 'text-[#E31837]' : 'text-white'}`}>
                    {game.awayScore}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-white truncate pr-2">{game.homeTeam.name}</span>
                {(game.status === 'IN_PROGRESS' || game.status === 'FINAL' || game.status === 'HALFTIME') && (
                  <span className={`text-xl font-bold font-mono ${game.status === 'FINAL' && game.homeScore > game.awayScore ? 'text-[#E31837]' : 'text-white'}`}>
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
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen bg-[#0A1D37] relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E31837] blur-[180px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 blur-[150px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      {/* Hero Section */}
      <div className="relative pt-32 pb-8">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          {/* Back Link */}
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All Events
          </Link>

          {/* Banner */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden mb-8">
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-[#0a1628] to-[#1a3a6e]/50">
              {event.bannerImage ? (
                <>
                  {/* Blurred background image */}
                  <Image
                    src={event.bannerImage}
                    alt=""
                    fill
                    className="object-cover scale-110 blur-2xl opacity-40"
                    sizes="(max-width: 1920px) 100vw, 1920px"
                    aria-hidden="true"
                  />
                  {/* Main image */}
                  <Image
                    src={event.bannerImage}
                    alt={event.name}
                    fill
                    className="object-contain object-center relative z-10"
                    sizes="(max-width: 1920px) 100vw, 1920px"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Trophy className="w-24 h-24 text-white/10" />
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1D37] via-[#0A1D37]/30 to-transparent z-20" />

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge variant={getEventTypeBadge(event.type)} size="lg" className="uppercase tracking-wider">
                    {event.type}
                  </Badge>
                  {isUpcoming && (
                    <Badge variant="info" className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Upcoming
                    </Badge>
                  )}
                  {isOngoing && (
                    <Badge variant="success" className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      In Progress
                    </Badge>
                  )}
                  {isPast && <Badge variant="default">Completed</Badge>}
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white tracking-tight">
                  {event.name}
                </h1>
                {event.description && (
                  <p className="text-gray-300 mt-3 max-w-3xl text-sm md:text-base leading-relaxed">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Dates Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#E31837]/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#E31837]" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dates</div>
                  <div className="text-white font-semibold">
                    {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'd, yyyy')}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</div>
                  <div className="text-white font-semibold">
                    {event.venue || (event.city && event.state ? `${event.city}, ${event.state}` : 'TBA')}
                  </div>
                </div>
              </div>
            </div>

            {/* Teams Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Teams</div>
                  <div className="text-white font-semibold">
                    <span className="text-2xl font-mono">{event._count.teams}</span>
                    <span className="text-gray-400 text-sm ml-1">Registered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Games Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Games</div>
                  <div className="text-white font-semibold">
                    <span className="text-2xl font-mono">{event._count.games}</span>
                    <span className="text-gray-400 text-sm ml-1">Scheduled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 flex gap-1">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'schedule'
                      ? 'bg-gradient-to-r from-[#E31837] to-[#a01128] text-white shadow-lg shadow-[#E31837]/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Schedule
                </button>
                <button
                  onClick={() => setActiveTab('teams')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'teams'
                      ? 'bg-gradient-to-r from-[#E31837] to-[#a01128] text-white shadow-lg shadow-[#E31837]/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Teams & Standings
                </button>
                {event.games.some(g => g.gameType === 'BRACKET' || g.bracketRound) && (
                  <button
                    onClick={() => setActiveTab('bracket')}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeTab === 'bracket'
                        ? 'bg-gradient-to-r from-[#E31837] to-[#a01128] text-white shadow-lg shadow-[#E31837]/25'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Bracket
                  </button>
                )}
              </div>

              {/* Filter Bar */}
              {(event.ageGroups.length > 0 || event.divisions.length > 0) && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium uppercase tracking-wider">Filter</span>
                    </div>

                    {/* Age Group Filter */}
                    {event.ageGroups.length > 0 && (
                      <div className="relative">
                        <select
                          value={selectedAgeGroup}
                          onChange={(e) => setSelectedAgeGroup(e.target.value)}
                          className="appearance-none bg-[#0a1628] border border-white/10 text-white px-4 py-2 pr-10 rounded-lg text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all"
                        >
                          <option value="">All Age Groups</option>
                          {event.ageGroups.map(ag => (
                            <option key={ag} value={ag}>{ag}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    )}

                    {/* Division Filter */}
                    {event.divisions.length > 0 && (
                      <div className="relative">
                        <select
                          value={selectedDivision}
                          onChange={(e) => setSelectedDivision(e.target.value)}
                          className="appearance-none bg-[#0a1628] border border-white/10 text-white px-4 py-2 pr-10 rounded-lg text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all"
                        >
                          <option value="">All Divisions</option>
                          {event.divisions.map(div => (
                            <option key={div} value={div}>{div}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    )}

                    <div className="flex-1" />

                    {/* Export/Print Buttons */}
                    <div className="flex gap-2">
                      <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>

                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          setSelectedAgeGroup('')
                          setSelectedDivision('')
                        }}
                        className="text-[#E31837] hover:text-white text-sm font-medium transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div className="space-y-4">
                  {/* Date Selector */}
                  {gameDates.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {gameDates.map(date => (
                        <button
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-300 ${
                            selectedDate === date
                              ? 'bg-gradient-to-r from-[#E31837] to-[#a01128] text-white shadow-lg shadow-[#E31837]/25'
                              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {format(new Date(date), 'EEE, MMM d')}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredGames.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-white mb-2">
                        {hasActiveFilters ? 'No Matching Games' : 'Schedule Not Released'}
                      </h3>
                      <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        {hasActiveFilters
                          ? 'No games match the selected filters. Try adjusting your criteria.'
                          : 'The game schedule for this event has not been released yet. Check back soon or enable notifications.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {isUpcoming && (
                          <>
                            <Button
                              onClick={handleRegisterClick}
                              disabled={isCheckingDirector}
                              className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25"
                            >
                              {isCheckingDirector ? (
                                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Users className="w-4 h-4 mr-2" />
                              )}
                              Register Team
                            </Button>
                            <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/5">
                              <Bell className="w-4 h-4 mr-2" />
                              Notify Me
                            </Button>
                          </>
                        )}
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            className="border-white/20 text-gray-300 hover:bg-white/5"
                            onClick={() => {
                              setSelectedAgeGroup('')
                              setSelectedDivision('')
                            }}
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </div>
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
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-white mb-2">
                        {hasActiveFilters ? 'No Matching Teams' : 'No Teams Registered'}
                      </h3>
                      <p className="text-gray-400 mb-6">
                        {hasActiveFilters
                          ? 'No teams match the selected filters.'
                          : 'Be the first to register your team for this event!'}
                      </p>
                      {isUpcoming && !hasActiveFilters && (
                        <Button
                          onClick={handleRegisterClick}
                          disabled={isCheckingDirector}
                          className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
                        >
                          {isCheckingDirector ? (
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Users className="w-4 h-4 mr-2" />
                          )}
                          Register Team
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredSortedPools.map(pool => (
                      <div key={pool} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                        <div className="bg-[#0a1628] px-5 py-4 border-b border-white/10">
                          <h3 className="font-semibold text-white flex items-center gap-3">
                            {pool === 'Unassigned' ? (
                              <span className="text-gray-400">{pool}</span>
                            ) : (
                              <Badge variant="info" className="text-sm">{pool}</Badge>
                            )}
                            <span className="text-gray-500 text-sm font-normal">
                              {filteredTeamsByPool[pool].length} teams
                            </span>
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
                                <th className="text-left py-4 px-5">Team</th>
                                <th className="text-center py-4 px-3 w-12">W</th>
                                <th className="text-center py-4 px-3 w-12">L</th>
                                <th className="text-center py-4 px-3 w-12">PF</th>
                                <th className="text-center py-4 px-3 w-12">PA</th>
                                <th className="text-center py-4 px-3 w-16">+/-</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTeamsByPool[pool]
                                .sort((a, b) => {
                                  if (b.eventWins !== a.eventWins) return b.eventWins - a.eventWins
                                  return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)
                                })
                                .map((et, idx) => (
                                  <tr key={et.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-5">
                                      <div className="flex items-center gap-4">
                                        <span className="text-gray-500 text-sm font-mono w-5">{idx + 1}</span>
                                        <div>
                                          <div className="font-medium text-white">{et.team.name}</div>
                                          <div className="text-xs text-gray-500 flex items-center gap-2">
                                            {et.team.ageGroup && <span>{et.team.ageGroup}</span>}
                                            {et.team.city && et.team.state && (
                                              <>
                                                <span className="text-gray-600">•</span>
                                                <span>{et.team.city}, {et.team.state}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="text-center py-4 px-3 text-white font-semibold font-mono">{et.eventWins}</td>
                                    <td className="text-center py-4 px-3 text-white font-semibold font-mono">{et.eventLosses}</td>
                                    <td className="text-center py-4 px-3 text-gray-400 font-mono">{et.pointsFor}</td>
                                    <td className="text-center py-4 px-3 text-gray-400 font-mono">{et.pointsAgainst}</td>
                                    <td className={`text-center py-4 px-3 font-semibold font-mono ${
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
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Bracket Tab */}
              {activeTab === 'bracket' && (
                <div className="space-y-6">
                  {bracketRounds.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Grid3X3 className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-white mb-2">
                        {hasActiveFilters ? 'No Matching Bracket Games' : 'Bracket Not Released'}
                      </h3>
                      <p className="text-gray-400 mb-6">
                        {hasActiveFilters
                          ? 'No bracket games match the selected filters.'
                          : 'The bracket for this event has not been released yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {bracketRounds.map(round => (
                        <div key={round}>
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                            <Badge variant="gold" className="text-sm">{round}</Badge>
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
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Venue Information Card */}
              {(event.venue || event.address || event.city) && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/10">
                    <h3 className="font-heading font-bold text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#E31837]" />
                      Venue Information
                    </h3>
                  </div>

                  {/* Map Placeholder */}
                  <div className="h-40 bg-[#0a1628] relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <span className="text-gray-500 text-sm">Map View</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {event.venue && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Venue</div>
                        <div className="text-white font-medium">{event.venue}</div>
                      </div>
                    )}
                    {event.address && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</div>
                        <div className="text-gray-300 text-sm">{event.address}</div>
                      </div>
                    )}
                    {event.city && event.state && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">City</div>
                        <div className="text-gray-300 text-sm">{event.city}, {event.state}</div>
                      </div>
                    )}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent([event.venue, event.address, event.city, event.state].filter(Boolean).join(', '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2.5 bg-white/5 border border-white/10 rounded-lg text-center text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              )}

              {/* Event Details Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="font-heading font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#E31837]" />
                    Event Details
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  {event.ageGroups.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Age Groups</div>
                      <div className="flex flex-wrap gap-2">
                        {event.ageGroups.map(ag => (
                          <Badge key={ag} variant="default" size="sm">{ag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {event.divisions.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Divisions</div>
                      <div className="flex flex-wrap gap-2">
                        {event.divisions.map(div => (
                          <Badge key={div} variant="default" size="sm">{div}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {event.entryFee && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entry Fee</div>
                      <div className="text-white font-semibold text-lg">{event.entryFee}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Registration CTA */}
              {isUpcoming && (
                <div className="bg-gradient-to-br from-[#E31837]/20 to-transparent border border-[#E31837]/30 rounded-2xl p-6">
                  <h3 className="font-heading font-bold text-white mb-2">Register Your Team</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Secure your spot in this event. Registration is open!
                  </p>
                  <Button
                    onClick={handleRegisterClick}
                    disabled={isCheckingDirector}
                    className="w-full bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25"
                  >
                    {isCheckingDirector ? (
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    Register Now
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Blocking Modal for Parents/Players */}
      {showBlockingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBlockingModal(false)}
          />
          <div className="relative bg-[#0A1D37] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <button
              onClick={() => setShowBlockingModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-8 h-8 text-amber-400" />
              </div>

              <h2 className="text-2xl font-heading font-bold text-white mb-3">
                Director Account Required
              </h2>

              <p className="text-gray-400 mb-6">
                Only Program Directors can register teams for events.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left">
                <h3 className="text-sm font-semibold text-white mb-2">Are you a coach or club director?</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Create a Director Account to manage your program and register teams for events.
                </p>
                <Link href="/auth/signup?role=PROGRAM_DIRECTOR">
                  <Button className="w-full bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]">
                    Create Director Account
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </Button>
                </Link>
              </div>

              <div className="text-left">
                <h3 className="text-sm font-semibold text-white mb-2">Are you a parent or player?</h3>
                <p className="text-sm text-gray-400">
                  Contact your team's director to register for this event.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
