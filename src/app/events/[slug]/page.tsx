'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { safeParseDate } from '@/lib/timezone'
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
  Check,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import RecruitingPacketModal from '@/components/recruiting/RecruitingPacketModal'
import CollegesAttending from '@/components/events/CollegesAttending'
import { GraduationCap } from 'lucide-react'

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
  division: string | null
  gameType: string
  bracketRound: string | null
  homeTeamLabel: string | null
  awayTeamLabel: string | null
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
  divisions: string[]
  entryFee: string | null
  bannerImage: string | null
  isPublished: boolean
  isNcaaCertified: boolean
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
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [showBlockingModal, setShowBlockingModal] = useState(false)
  const [showPacketModal, setShowPacketModal] = useState(false)
  const [isCheckingDirector, setIsCheckingDirector] = useState(false)
  const [notifyConfirmed, setNotifyConfirmed] = useState(false)
  const searchParams = useSearchParams()

  // Auto-open packet modal if ?packet=open
  useEffect(() => {
    if (searchParams.get('packet') === 'open' && event?.isNcaaCertified) {
      setShowPacketModal(true)
    }
  }, [searchParams, event?.isNcaaCertified])

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
    // Not logged in - redirect to director get-started page
    if (sessionStatus !== 'authenticated' || !session) {
      const returnUrl = `/events/${resolvedParams.slug}/register`
      router.push(`/director/get-started?returnUrl=${encodeURIComponent(returnUrl)}`)
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
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 py-32 text-center relative z-10">
          <div className="w-20 h-20 bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-text-muted" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-text-primary mb-3">Event Not Found</h1>
          <p className="text-text-muted mb-8">{error || 'The event you are looking for does not exist.'}</p>
          <Link href="/events">
            <Button className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]">
              Browse Events
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isUpcoming = new Date() < safeParseDate(event.startDate)
  const isOngoing = new Date() >= safeParseDate(event.startDate) && new Date() <= safeParseDate(event.endDate)
  const isPast = new Date() > safeParseDate(event.endDate)

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
  const filteredTeams = event.teams

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

  // Group bracket games by division, then by round (with filters applied)
  const bracketGames = applyGameFilters(
    event.games.filter(g => g.gameType !== 'POOL' || g.bracketRound)
  )
  const bracketRounds = [...new Set(bracketGames.map(g => g.bracketRound).filter(Boolean))]
  const bracketDivisions = [...new Set(bracketGames.map(g => g.division).filter(Boolean))]

  const hasActiveFilters = selectedDivision

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
          <span className="text-sm text-text-muted">
            {format(new Date(game.scheduledAt), 'h:mm a')}
          </span>
        )
    }
  }

  const GameCard = ({ game }: { game: Game }) => (
    <Link href={`/games/${game.id}`}>
      <div className="bg-surface-glass backdrop-blur-sm border border-border-default rounded-xl p-4 hover:bg-surface-overlay hover:border-border-default transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Game Info */}
            <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
              {game.court && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {game.court}
                </span>
              )}
              {game.bracketRound && (
                <Badge size="sm" variant="gold">{game.bracketRound}</Badge>
              )}
            </div>

            {/* Teams & Scores */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary truncate pr-2">{game.awayTeam.name}</span>
                {(game.status === 'IN_PROGRESS' || game.status === 'FINAL' || game.status === 'HALFTIME') && (
                  <span className={`text-xl font-bold font-mono ${game.status === 'FINAL' && game.awayScore > game.homeScore ? 'text-[#E31837]' : 'text-text-primary'}`}>
                    {game.awayScore}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary truncate pr-2">{game.homeTeam.name}</span>
                {(game.status === 'IN_PROGRESS' || game.status === 'FINAL' || game.status === 'HALFTIME') && (
                  <span className={`text-xl font-bold font-mono ${game.status === 'FINAL' && game.homeScore > game.awayScore ? 'text-[#E31837]' : 'text-text-primary'}`}>
                    {game.homeScore}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="ml-4 flex flex-col items-end gap-2">
            {getStatusBadge(game)}
          </div>

          <ChevronRight className="w-5 h-5 text-text-muted ml-2 flex-shrink-0" />
        </div>
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E31837] blur-[180px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 blur-[150px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      {/* Hero Section */}
      <div className="relative pt-32 pb-8">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          {/* Back Link */}
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All Events
          </Link>

          {/* Banner */}
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl overflow-hidden mb-8">
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
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-30">
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
                  {event.isNcaaCertified && (
                    <Badge variant="gold" className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      NCAA Certified
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-text-primary tracking-tight">
                  {event.name}
                </h1>
                {/* Description moved to Event Details sidebar */}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Dates Card */}
            <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-5 hover:bg-surface-overlay transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Dates</div>
                  <div className="text-text-primary font-semibold">
                    {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'd, yyyy')}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-5 hover:bg-surface-overlay transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Location</div>
                  <div className="text-text-primary font-semibold">
                    {event.venue || (event.city && event.state ? `${event.city}, ${event.state}` : 'TBA')}
                  </div>
                </div>
              </div>
            </div>

            {/* Teams Card */}
            <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-5 hover:bg-surface-overlay transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Teams</div>
                  <div className="text-text-primary font-semibold">
                    <span className="text-2xl font-mono">{event._count.teams}</span>
                    <span className="text-text-muted text-sm ml-1">Registered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Games Card */}
            <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-5 hover:bg-surface-overlay transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Games</div>
                  <div className="text-text-primary font-semibold">
                    <span className="text-2xl font-mono">{event._count.games}</span>
                    <span className="text-text-muted text-sm ml-1">Scheduled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration + Recruiting Packet Banner */}
          {(isUpcoming || isOngoing) && (
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {isUpcoming && (
                <div className="flex-1 bg-gradient-to-r from-[#E31837]/20 to-transparent border border-[#E31837]/30 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[#E31837]/20 rounded-lg flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-[#E31837]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-white text-sm">Register Your Team</h3>
                      <p className="text-gray-400 text-xs truncate">Secure your spot — Registration is open!</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleRegisterClick}
                    disabled={isCheckingDirector}
                    size="sm"
                    className="shrink-0 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25"
                  >
                    {isCheckingDirector && (
                      <div className="w-3 h-3 mr-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Register Now
                    <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              )}
              {event.isNcaaCertified && (
                <div className="flex-1 bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-500/30 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-white text-sm">College Recruiting Packet</h3>
                      <p className="text-gray-400 text-xs truncate">Rosters, player info, coach emails &amp; live stats</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowPacketModal(true)}
                    size="sm"
                    className="shrink-0 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-600/25"
                  >
                    Purchase Packet
                    <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-1.5 flex gap-1">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'schedule'
                      ? 'bg-gradient-to-r from-[#E31837] to-[#a01128] text-white shadow-lg shadow-[#E31837]/25'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-glass'
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
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-glass'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Teams & Standings
                </button>
                {event.games.some(g => g.gameType !== 'POOL' || g.bracketRound) && (
                  <button
                    onClick={() => setActiveTab('bracket')}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeTab === 'bracket'
                        ? 'bg-gradient-to-r from-[#E31837] to-[#a01128] text-white shadow-lg shadow-[#E31837]/25'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-glass'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Bracket
                  </button>
                )}
              </div>

              {/* Filter Bar */}
              {event.divisions.length > 0 && (
                <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-text-muted">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium uppercase tracking-wider">Filter</span>
                    </div>

                    {/* Division Filter */}
                    {event.divisions.length > 0 && (
                      <div className="relative">
                        <select
                          value={selectedDivision}
                          onChange={(e) => setSelectedDivision(e.target.value)}
                          className="appearance-none bg-page-bg-alt border border-border-default text-text-primary px-4 py-2 pr-10 rounded-lg text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all"
                        >
                          <option value="">All Divisions</option>
                          {event.divisions.map(div => (
                            <option key={div} value={div}>{div}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                      </div>
                    )}

                    <div className="flex-1" />

                    {/* Export/Print Buttons */}
                    <div className="flex gap-2">
                      <button className="p-2 bg-surface-glass border border-border-default rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-surface-glass border border-border-default rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors">
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>

                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          setSelectedDivision('')
                        }}
                        className="text-[#E31837] hover:text-text-primary text-sm font-medium transition-colors"
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
                              : 'bg-surface-glass border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-overlay'
                          }`}
                        >
                          {format(new Date(date), 'EEE, MMM d')}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredGames.length === 0 ? (
                    <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-12 text-center">
                      <div className="w-20 h-20 bg-surface-glass rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-text-muted" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
                        {hasActiveFilters ? 'No Matching Games' : 'Schedule Not Released'}
                      </h3>
                      <p className="text-text-muted mb-6 max-w-md mx-auto">
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
                            <Button
                              variant="outline"
                              className={notifyConfirmed
                                ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                : 'border-border-default text-text-secondary hover:bg-surface-glass'
                              }
                              onClick={() => setNotifyConfirmed(true)}
                              disabled={notifyConfirmed}
                            >
                              {notifyConfirmed ? (
                                <><Check className="w-4 h-4 mr-2" />You&apos;ll be notified</>
                              ) : (
                                <><Bell className="w-4 h-4 mr-2" />Notify Me</>
                              )}
                            </Button>
                          </>
                        )}
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            className="border-border-default text-text-secondary hover:bg-surface-glass"
                            onClick={() => {
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
                    <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-12 text-center">
                      <div className="w-20 h-20 bg-surface-glass rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-text-muted" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
                        {hasActiveFilters ? 'No Matching Teams' : 'No Teams Registered'}
                      </h3>
                      <p className="text-text-muted mb-6">
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
                      <div key={pool} className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl overflow-hidden">
                        <div className="bg-page-bg-alt px-5 py-4 border-b border-border-default">
                          <h3 className="font-semibold text-text-primary flex items-center gap-3">
                            {pool === 'Unassigned' ? (
                              <span className="text-text-muted">{pool}</span>
                            ) : (
                              <Badge variant="info" className="text-sm">{pool}</Badge>
                            )}
                            <span className="text-text-muted text-sm font-normal">
                              {filteredTeamsByPool[pool].length} teams
                            </span>
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border-default text-xs text-text-muted uppercase tracking-wider">
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
                                  <tr key={et.id} className="border-b border-border-subtle hover:bg-surface-glass transition-colors">
                                    <td className="py-4 px-5">
                                      <div className="flex items-center gap-4">
                                        <span className="text-text-muted text-sm font-mono w-5">{idx + 1}</span>
                                        <div>
                                          <div className="font-medium text-text-primary">{et.team.name}</div>
                                          <div className="text-xs text-text-muted flex items-center gap-2">
                                            {et.team.city && et.team.state && (
                                              <span>{et.team.city}, {et.team.state}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="text-center py-4 px-3 text-text-primary font-semibold font-mono">{et.eventWins}</td>
                                    <td className="text-center py-4 px-3 text-text-primary font-semibold font-mono">{et.eventLosses}</td>
                                    <td className="text-center py-4 px-3 text-text-muted font-mono">{et.pointsFor}</td>
                                    <td className="text-center py-4 px-3 text-text-muted font-mono">{et.pointsAgainst}</td>
                                    <td className={`text-center py-4 px-3 font-semibold font-mono ${
                                      et.pointsFor - et.pointsAgainst > 0 ? 'text-green-400' :
                                      et.pointsFor - et.pointsAgainst < 0 ? 'text-red-400' : 'text-text-muted'
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
                <div className="space-y-8">
                  {bracketGames.length === 0 ? (
                    <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-12 text-center">
                      <div className="w-20 h-20 bg-surface-glass rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Grid3X3 className="w-10 h-10 text-text-muted" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
                        {hasActiveFilters ? 'No Matching Bracket Games' : 'Bracket Not Released'}
                      </h3>
                      <p className="text-text-muted mb-6">
                        {hasActiveFilters
                          ? 'No bracket games match the selected filters.'
                          : 'The bracket for this event has not been released yet.'}
                      </p>
                    </div>
                  ) : (
                    (bracketDivisions.length > 0 ? bracketDivisions : [null]).map(division => {
                      const divGames = division
                        ? bracketGames.filter(g => g.division === division)
                        : bracketGames
                      const divRounds = [...new Set(divGames.map(g => g.bracketRound).filter(Boolean))].sort()

                      return (
                        <div key={division || 'all'}>
                          {/* Division Header */}
                          {division && bracketDivisions.length > 1 && (
                            <div className="flex items-center gap-3 mb-4">
                              <Trophy className="w-5 h-5 text-amber-400" />
                              <h3 className="text-lg font-heading font-bold text-text-primary">{division} Bracket</h3>
                            </div>
                          )}

                          <div className="overflow-x-auto pb-4">
                            <div className="flex gap-0 min-w-fit items-start">
                              {divRounds.map((round, roundIdx) => {
                                const roundGames = divGames
                                  .filter(g => g.bracketRound === round)
                                  .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                                const isLastRound = roundIdx === divRounds.length - 1
                                const isChampionship = round?.toLowerCase().includes('championship') && isLastRound

                                // Determine round display label
                                let roundLabel = round || 'Round'
                                if (round?.match(/^Championship Round \d+$/)) {
                                  const rNum = parseInt(round.replace('Championship Round ', ''))
                                  if (isLastRound) {
                                    roundLabel = 'Championship'
                                  } else {
                                    roundLabel = rNum === 1 ? 'Semifinal' : `Round ${rNum}`
                                  }
                                }

                                return (
                                  <div key={round} className="flex">
                                    <div className="flex flex-col">
                                      {/* Round Header */}
                                      <div className="text-center mb-4 px-2">
                                        <Badge variant={isChampionship ? 'gold' : 'default'} className="text-sm">
                                          {roundLabel}
                                        </Badge>
                                      </div>

                                      {/* Games in this round */}
                                      <div className="flex flex-col justify-around flex-1 gap-4">
                                        {roundGames.map(game => {
                                          const isFinalStatus = game.status === 'FINAL'
                                          const isLiveStatus = game.status === 'IN_PROGRESS' || game.status === 'HALFTIME'
                                          const homeWins = isFinalStatus && game.homeScore > game.awayScore
                                          const awayWins = isFinalStatus && game.awayScore > game.homeScore
                                          const isTbdHome = game.homeTeam.name === 'TBD'
                                          const isTbdAway = game.awayTeam.name === 'TBD'
                                          const isConsolation = game.gameType === 'CONSOLATION'

                                          return (
                                            <Link key={game.id} href={`/games/${game.id}`}>
                                              <div className={`w-72 border rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                                                isLiveStatus
                                                  ? 'border-green-500/50 bg-green-500/5'
                                                  : isChampionship
                                                    ? 'border-amber-500/30 bg-amber-500/5'
                                                    : isConsolation
                                                      ? 'border-blue-500/20 bg-blue-500/5'
                                                      : 'border-border-default bg-surface-glass'
                                              } hover:bg-surface-overlay`}>
                                                {/* Game meta bar */}
                                                <div className="px-3 py-1.5 border-b border-border-subtle flex items-center justify-between">
                                                  <div className="flex items-center gap-2 text-xs text-text-muted">
                                                    {isConsolation && (
                                                      <Badge size="sm" variant="info">Consolation</Badge>
                                                    )}
                                                    {game.court && (
                                                      <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {game.court}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div>
                                                    {isLiveStatus ? (
                                                      <Badge variant="success" size="sm" className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                                        LIVE
                                                      </Badge>
                                                    ) : isFinalStatus ? (
                                                      <span className="text-xs text-text-muted font-medium">FINAL</span>
                                                    ) : (
                                                      <span className="text-xs text-text-muted">
                                                        {format(new Date(game.scheduledAt), 'EEE h:mm a')}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Away team row */}
                                                <div className={`flex items-center justify-between px-3 py-2.5 ${
                                                  awayWins ? 'bg-surface-glass' : ''
                                                }`}>
                                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    {awayWins && <span className="w-1 h-4 bg-[#E31837] rounded-full flex-shrink-0" />}
                                                    <div className="min-w-0 flex-1">
                                                      <span className={`text-sm truncate block ${
                                                        isTbdAway ? 'text-text-muted italic' :
                                                        awayWins ? 'text-text-primary font-semibold' :
                                                        isFinalStatus && !awayWins ? 'text-text-muted' : 'text-text-primary'
                                                      }`}>
                                                        {isTbdAway && game.awayTeamLabel
                                                          ? game.awayTeamLabel
                                                          : game.awayTeam.name}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  {(isFinalStatus || isLiveStatus) && (
                                                    <span className={`text-sm font-bold font-mono ml-2 ${
                                                      awayWins ? 'text-text-primary' : 'text-text-muted'
                                                    }`}>
                                                      {game.awayScore}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Divider */}
                                                <div className="border-t border-border-subtle" />

                                                {/* Home team row */}
                                                <div className={`flex items-center justify-between px-3 py-2.5 ${
                                                  homeWins ? 'bg-surface-glass' : ''
                                                }`}>
                                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    {homeWins && <span className="w-1 h-4 bg-[#E31837] rounded-full flex-shrink-0" />}
                                                    <div className="min-w-0 flex-1">
                                                      <span className={`text-sm truncate block ${
                                                        isTbdHome ? 'text-text-muted italic' :
                                                        homeWins ? 'text-text-primary font-semibold' :
                                                        isFinalStatus && !homeWins ? 'text-text-muted' : 'text-text-primary'
                                                      }`}>
                                                        {isTbdHome && game.homeTeamLabel
                                                          ? game.homeTeamLabel
                                                          : game.homeTeam.name}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  {(isFinalStatus || isLiveStatus) && (
                                                    <span className={`text-sm font-bold font-mono ml-2 ${
                                                      homeWins ? 'text-text-primary' : 'text-text-muted'
                                                    }`}>
                                                      {game.homeScore}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </Link>
                                          )
                                        })}
                                      </div>
                                    </div>

                                    {/* Connector lines between rounds */}
                                    {!isLastRound && roundGames.length > 0 && (
                                      <div className="flex items-center px-3 self-stretch" style={{ marginTop: '2rem' }}>
                                        <svg
                                          width="32"
                                          className="text-white/20 flex-shrink-0"
                                          style={{ height: '100%', minHeight: `${roundGames.length * 96}px` }}
                                          viewBox={`0 0 32 ${roundGames.length * 96}`}
                                          fill="none"
                                          preserveAspectRatio="none"
                                        >
                                          {Array.from({ length: Math.ceil(roundGames.length / 2) }).map((_, pairIdx) => {
                                            const totalHeight = roundGames.length * 96
                                            const pairSpacing = totalHeight / Math.ceil(roundGames.length / 2)
                                            const topY = pairIdx * pairSpacing + pairSpacing * 0.25
                                            const bottomY = pairIdx * pairSpacing + pairSpacing * 0.75
                                            const midY = (topY + bottomY) / 2

                                            return (
                                              <g key={pairIdx}>
                                                <line x1="0" y1={topY} x2="16" y2={topY} stroke="currentColor" strokeWidth="2" />
                                                <line x1="16" y1={topY} x2="16" y2={midY} stroke="currentColor" strokeWidth="2" />
                                                <line x1="0" y1={bottomY} x2="16" y2={bottomY} stroke="currentColor" strokeWidth="2" />
                                                <line x1="16" y1={bottomY} x2="16" y2={midY} stroke="currentColor" strokeWidth="2" />
                                                <line x1="16" y1={midY} x2="32" y2={midY} stroke="currentColor" strokeWidth="2" />
                                              </g>
                                            )
                                          })}
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Event Details Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="font-heading font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-text-muted" />
                    Event Details
                  </h3>
                </div>
                <div className="p-5 space-y-4">
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
                      <div className="text-white font-semibold text-lg">${event.entryFee}</div>
                    </div>
                  )}
                  {event.description && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">About</div>
                      <p className="text-text-secondary text-sm leading-relaxed">{event.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Venue Information Card */}
              {(event.venue || event.address || event.city) && (
                <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border-default">
                    <h3 className="font-heading font-bold text-text-primary flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-text-muted" />
                      Venue Information
                    </h3>
                  </div>

                  {/* Google Maps Embed */}
                  <div className="h-40 bg-page-bg-alt relative">
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent([event.venue, event.address, event.city, event.state].filter(Boolean).join(', '))}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      className="w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>

                  <div className="p-5 space-y-4">
                    {event.venue && (
                      <div>
                        <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Venue</div>
                        <div className="text-text-primary font-medium">{event.venue}</div>
                      </div>
                    )}
                    {event.address && (
                      <div>
                        <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Address</div>
                        <div className="text-text-secondary text-sm">{event.address}</div>
                      </div>
                    )}
                    {event.city && event.state && (
                      <div>
                        <div className="text-xs text-text-muted uppercase tracking-wider mb-1">City</div>
                        <div className="text-text-secondary text-sm">{event.city}, {event.state}</div>
                      </div>
                    )}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent([event.venue, event.address, event.city, event.state].filter(Boolean).join(', '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2.5 bg-surface-glass border border-border-default rounded-lg text-center text-sm text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              )}

              {/* Colleges Attending */}
              {event.isNcaaCertified && (isUpcoming || isOngoing) && (
                <CollegesAttending eventId={event.id} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recruiting Packet Modal */}
      {showPacketModal && event && (
        <RecruitingPacketModal
          isOpen={showPacketModal}
          onClose={() => setShowPacketModal(false)}
          eventId={event.id}
          eventSlug={event.slug}
          eventName={event.name}
        />
      )}

      {/* Blocking Modal for Parents/Players */}
      {showBlockingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBlockingModal(false)}
          />
          <div className="relative bg-page-bg border border-border-default rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <button
              onClick={() => setShowBlockingModal(false)}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-8 h-8 text-amber-400" />
              </div>

              <h2 className="text-2xl font-heading font-bold text-text-primary mb-3">
                Director Account Required
              </h2>

              <p className="text-text-muted mb-6">
                Only Program Directors can register teams for events.
              </p>

              <div className="bg-surface-glass border border-border-default rounded-xl p-4 mb-6 text-left">
                <h3 className="text-sm font-semibold text-text-primary mb-2">Are you a coach or club director?</h3>
                <p className="text-sm text-text-muted mb-3">
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
                <h3 className="text-sm font-semibold text-text-primary mb-2">Are you a parent or player?</h3>
                <p className="text-sm text-text-muted">
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
