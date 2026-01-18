'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Trophy,
  Clock,
  User,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

interface Player {
  id: string
  slug: string
  firstName: string
  lastName: string
  jerseyNumber: string | null
  profilePhoto: string | null
}

interface PlayerStats {
  id: string
  playerId: string
  teamId: string
  player: Player
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
  minutes: number
  offRebounds: number
  defRebounds: number
}

interface TeamTotals {
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
}

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
  startedAt: string | null
  endedAt: string | null
  status: string
  court: string | null
  currentPeriod: number
  ageGroup: string | null
  division: string | null
  gameType: string
  bracketRound: string | null
  periodScores: Record<string, { home: number; away: number }> | null
  event: Event | null
  homeStats: PlayerStats[]
  awayStats: PlayerStats[]
  homeTotals: TeamTotals
  awayTotals: TeamTotals
}

export default function GameBoxScorePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [game, setGame] = useState<Game | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<'away' | 'home'>('away')

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/public/games/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          setGame(data.game)
        } else {
          setError('Game not found')
        }
      } catch (err) {
        setError('Failed to load game')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGame()
  }, [resolvedParams.id])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Game Not Found</h1>
        <p className="text-gray-400 mb-6">{error || 'The game you are looking for does not exist.'}</p>
        <Link href="/standings">
          <Button>View Standings</Button>
        </Link>
      </div>
    )
  }

  const isLive = game.status === 'IN_PROGRESS' || game.status === 'HALFTIME'
  const isFinal = game.status === 'FINAL'
  const homeWon = isFinal && game.homeScore > game.awayScore
  const awayWon = isFinal && game.awayScore > game.homeScore

  const getStatusDisplay = () => {
    switch (game.status) {
      case 'IN_PROGRESS':
        return (
          <Badge variant="success" size="lg" className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Q{game.currentPeriod} - Live
          </Badge>
        )
      case 'FINAL':
        return <Badge size="lg">FINAL</Badge>
      case 'HALFTIME':
        return <Badge variant="warning" size="lg">HALFTIME</Badge>
      case 'POSTPONED':
        return <Badge variant="error" size="lg">POSTPONED</Badge>
      case 'CANCELED':
        return <Badge variant="error" size="lg">CANCELED</Badge>
      default:
        return (
          <div className="text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {format(new Date(game.scheduledAt), 'h:mm a')}
          </div>
        )
    }
  }

  const formatPercentage = (made: number, attempted: number): string => {
    if (attempted === 0) return '-'
    return ((made / attempted) * 100).toFixed(1) + '%'
  }

  const currentStats = selectedTeam === 'home' ? game.homeStats : game.awayStats
  const currentTotals = selectedTeam === 'home' ? game.homeTotals : game.awayTotals
  const currentTeam = selectedTeam === 'home' ? game.homeTeam : game.awayTeam

  return (
    <div className="min-h-screen bg-[#0F0F1A]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1A1A2E] to-[#0F0F1A] border-b border-[#252540]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Link */}
          {game.event && (
            <Link
              href={`/events/${game.event.slug}`}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {game.event.name}
            </Link>
          )}

          {/* Game Info */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {getStatusDisplay()}
            {game.ageGroup && <Badge>{game.ageGroup}</Badge>}
            {game.bracketRound && <Badge variant="gold">{game.bracketRound}</Badge>}
          </div>

          {/* Scoreboard */}
          <div className="flex items-center justify-center gap-6 py-6">
            {/* Away Team */}
            <div className={`text-center flex-1 max-w-xs ${awayWon ? 'opacity-100' : isFinal ? 'opacity-60' : ''}`}>
              <div className="text-lg font-semibold text-white mb-2">{game.awayTeam.name}</div>
              <div className={`text-5xl md:text-6xl font-bold ${awayWon ? 'text-white' : 'text-white'}`}>
                {game.homeScore > 0 || game.awayScore > 0 || isLive || isFinal ? game.awayScore : '-'}
              </div>
            </div>

            {/* VS */}
            <div className="text-2xl font-bold text-gray-600 px-4">
              {isFinal || isLive ? '-' : 'VS'}
            </div>

            {/* Home Team */}
            <div className={`text-center flex-1 max-w-xs ${homeWon ? 'opacity-100' : isFinal ? 'opacity-60' : ''}`}>
              <div className="text-lg font-semibold text-white mb-2">{game.homeTeam.name}</div>
              <div className={`text-5xl md:text-6xl font-bold ${homeWon ? 'text-white' : 'text-white'}`}>
                {game.homeScore > 0 || game.awayScore > 0 || isLive || isFinal ? game.homeScore : '-'}
              </div>
            </div>
          </div>

          {/* Game Details */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(game.scheduledAt), 'EEEE, MMMM d, yyyy')}
            </div>
            {game.court && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {game.court}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Box Score Section */}
        {(game.homeStats.length > 0 || game.awayStats.length > 0) ? (
          <>
            {/* Team Selector */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSelectedTeam('away')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedTeam === 'away'
                    ? 'bg-eha-red text-white'
                    : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
                }`}
              >
                {game.awayTeam.name}
                {awayWon && <span className="ml-2 text-xs">(W)</span>}
              </button>
              <button
                onClick={() => setSelectedTeam('home')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedTeam === 'home'
                    ? 'bg-eha-red text-white'
                    : 'bg-[#1A1A2E] text-gray-400 hover:text-white'
                }`}
              >
                {game.homeTeam.name}
                {homeWon && <span className="ml-2 text-xs">(W)</span>}
              </button>
            </div>

            {/* Box Score Table */}
            <Card className="overflow-hidden p-0 mb-6">
              <div className="bg-[#252540] px-4 py-3 border-b border-[#1A1A2E]">
                <h2 className="font-semibold text-white">{currentTeam.name} Box Score</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#252540] text-xs text-gray-500 uppercase">
                      <th className="text-left py-3 px-4 sticky left-0 bg-[#1A1A2E]">Player</th>
                      <th className="text-center py-3 px-2 min-w-[40px]">MIN</th>
                      <th className="text-center py-3 px-2 min-w-[40px] bg-[#252540]/30">PTS</th>
                      <th className="text-center py-3 px-2 min-w-[40px]">REB</th>
                      <th className="text-center py-3 px-2 min-w-[40px]">AST</th>
                      <th className="text-center py-3 px-2 min-w-[40px]">STL</th>
                      <th className="text-center py-3 px-2 min-w-[40px]">BLK</th>
                      <th className="text-center py-3 px-2 min-w-[40px]">TO</th>
                      <th className="text-center py-3 px-2 min-w-[40px]">PF</th>
                      <th className="text-center py-3 px-2 min-w-[60px]">FG</th>
                      <th className="text-center py-3 px-2 min-w-[60px]">3PT</th>
                      <th className="text-center py-3 px-2 min-w-[60px]">FT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStats
                      .sort((a, b) => b.points - a.points)
                      .map(stat => (
                        <tr key={stat.id} className="border-b border-[#252540]/50 hover:bg-[#252540]/30">
                          <td className="py-3 px-4 sticky left-0 bg-[#1A1A2E]">
                            <Link
                              href={`/players/${stat.player.slug}`}
                              className="flex items-center gap-2 hover:text-white transition-colors"
                            >
                              {stat.player.profilePhoto ? (
                                <Image
                                  src={stat.player.profilePhoto}
                                  alt={`${stat.player.firstName} ${stat.player.lastName} profile photo`}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-[#252540] rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white whitespace-nowrap">
                                  {stat.player.jerseyNumber && (
                                    <span className="text-white mr-1">#{stat.player.jerseyNumber}</span>
                                  )}
                                  {stat.player.firstName[0]}. {stat.player.lastName}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="text-center py-3 px-2 text-gray-400">{stat.minutes || '-'}</td>
                          <td className="text-center py-3 px-2 text-white font-bold bg-[#252540]/30">{stat.points}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{stat.rebounds}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{stat.assists}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{stat.steals}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{stat.blocks}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{stat.turnovers}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{stat.fouls}</td>
                          <td className="text-center py-3 px-2 text-gray-400">
                            {stat.fgMade}-{stat.fgAttempted}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-400">
                            {stat.fg3Made}-{stat.fg3Attempted}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-400">
                            {stat.ftMade}-{stat.ftAttempted}
                          </td>
                        </tr>
                      ))}
                    {/* Totals Row */}
                    <tr className="bg-[#252540] font-semibold">
                      <td className="py-3 px-4 sticky left-0 bg-[#252540] text-white">TOTALS</td>
                      <td className="text-center py-3 px-2 text-gray-400">-</td>
                      <td className="text-center py-3 px-2 text-white">{currentTotals.points}</td>
                      <td className="text-center py-3 px-2 text-gray-300">{currentTotals.rebounds}</td>
                      <td className="text-center py-3 px-2 text-gray-300">{currentTotals.assists}</td>
                      <td className="text-center py-3 px-2 text-gray-300">{currentTotals.steals}</td>
                      <td className="text-center py-3 px-2 text-gray-300">{currentTotals.blocks}</td>
                      <td className="text-center py-3 px-2 text-gray-300">{currentTotals.turnovers}</td>
                      <td className="text-center py-3 px-2 text-gray-300">{currentTotals.fouls}</td>
                      <td className="text-center py-3 px-2 text-gray-400">
                        {currentTotals.fgMade}-{currentTotals.fgAttempted}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-400">
                        {currentTotals.fg3Made}-{currentTotals.fg3Attempted}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-400">
                        {currentTotals.ftMade}-{currentTotals.ftAttempted}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Shooting Percentages */}
            <Card className="mb-6">
              <h3 className="font-semibold text-white mb-4">{currentTeam.name} Shooting</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {formatPercentage(currentTotals.fgMade, currentTotals.fgAttempted)}
                  </div>
                  <div className="text-sm text-gray-500">FG%</div>
                  <div className="text-xs text-gray-600">
                    {currentTotals.fgMade}/{currentTotals.fgAttempted}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {formatPercentage(currentTotals.fg3Made, currentTotals.fg3Attempted)}
                  </div>
                  <div className="text-sm text-gray-500">3PT%</div>
                  <div className="text-xs text-gray-600">
                    {currentTotals.fg3Made}/{currentTotals.fg3Attempted}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {formatPercentage(currentTotals.ftMade, currentTotals.ftAttempted)}
                  </div>
                  <div className="text-sm text-gray-500">FT%</div>
                  <div className="text-xs text-gray-600">
                    {currentTotals.ftMade}/{currentTotals.ftAttempted}
                  </div>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-8 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Stats Available</h3>
            <p className="text-gray-500">
              {game.status === 'SCHEDULED'
                ? 'Stats will be available once the game starts.'
                : 'No player statistics have been recorded for this game.'}
            </p>
          </Card>
        )}

        {/* Team Comparison */}
        {(game.homeStats.length > 0 || game.awayStats.length > 0) && (
          <Card>
            <h3 className="font-semibold text-white mb-4">Team Comparison</h3>
            <div className="space-y-4">
              {[
                { label: 'Points', home: game.homeTotals.points, away: game.awayTotals.points },
                { label: 'Rebounds', home: game.homeTotals.rebounds, away: game.awayTotals.rebounds },
                { label: 'Assists', home: game.homeTotals.assists, away: game.awayTotals.assists },
                { label: 'Steals', home: game.homeTotals.steals, away: game.awayTotals.steals },
                { label: 'Blocks', home: game.homeTotals.blocks, away: game.awayTotals.blocks },
                { label: 'Turnovers', home: game.homeTotals.turnovers, away: game.awayTotals.turnovers },
              ].map(stat => {
                const total = stat.home + stat.away
                const homePercent = total > 0 ? (stat.home / total) * 100 : 50
                return (
                  <div key={stat.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-medium ${stat.home > stat.away ? 'text-white' : 'text-gray-400'}`}>
                        {stat.home}
                      </span>
                      <span className="text-gray-500">{stat.label}</span>
                      <span className={`font-medium ${stat.away > stat.home ? 'text-white' : 'text-gray-400'}`}>
                        {stat.away}
                      </span>
                    </div>
                    <div className="h-2 bg-[#252540] rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${stat.home > stat.away ? 'bg-eha-red' : 'bg-gray-600'}`}
                        style={{ width: `${homePercent}%` }}
                      />
                      <div
                        className={`h-full ${stat.away > stat.home ? 'bg-eha-red' : 'bg-gray-600'}`}
                        style={{ width: `${100 - homePercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-4">
              <span>{game.homeTeam.name}</span>
              <span>{game.awayTeam.name}</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
