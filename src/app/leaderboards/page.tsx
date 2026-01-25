'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp, Filter, ChevronDown } from 'lucide-react'
import { Card, Badge, Select, Avatar, Button } from '@/components/ui'
import { formatPosition } from '@/lib/utils'
import { ageGroups, divisions } from '@/lib/constants'

interface EventOption {
  id: string
  name: string
}

interface LeaderboardEntry {
  player: {
    id: string
    slug: string
    firstName: string
    lastName: string
    profilePhoto?: string | null
    primaryPosition?: string | null
    school?: string | null
    graduationYear?: number | null
    currentTeam?: { name: string; slug: string; ageGroup?: string | null; logo?: string | null; program?: { logo?: string | null } } | null
  }
  gamesPlayed: number
  totals: {
    points: number
    rebounds: number
    assists: number
    steals: number
    blocks: number
    fg3Made: number
  }
  averages: {
    ppg: number
    rpg: number
    apg: number
    spg: number
    bpg: number
    fg3pg: number
  }
}

const statCategories = [
  { value: 'points', label: 'Points', avgKey: 'ppg', totalKey: 'points' },
  { value: 'rebounds', label: 'Rebounds', avgKey: 'rpg', totalKey: 'rebounds' },
  { value: 'assists', label: 'Assists', avgKey: 'apg', totalKey: 'assists' },
  { value: 'steals', label: 'Steals', avgKey: 'spg', totalKey: 'steals' },
  { value: 'blocks', label: 'Blocks', avgKey: 'bpg', totalKey: 'blocks' },
  { value: 'fg3Made', label: '3-Pointers', avgKey: 'fg3pg', totalKey: 'fg3Made' },
]

export default function LeaderboardsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [events, setEvents] = useState<EventOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStat, setSelectedStat] = useState('points')
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')

  // Fetch events list on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events?limit=50')
        const data = await res.json()
        setEvents(data.events?.map((e: any) => ({ id: e.id, name: e.name })) || [])
      } catch (error) {
        console.error('Error fetching events:', error)
      }
    }
    fetchEvents()
  }, [])

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('stat', selectedStat)
      params.set('limit', '25')
      if (selectedEvent) params.set('eventId', selectedEvent)
      if (selectedAgeGroup) params.set('ageGroup', selectedAgeGroup)
      if (selectedDivision) params.set('division', selectedDivision)

      const res = await fetch(`/api/leaderboards?${params}`)
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [selectedStat, selectedEvent, selectedAgeGroup, selectedDivision])

  const hasActiveFilters = selectedEvent || selectedAgeGroup || selectedDivision

  const currentCategory = statCategories.find((c) => c.value === selectedStat)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 uppercase tracking-wider">
          <Trophy className="w-8 h-8 text-white" />
          Stat Leaderboards
        </h1>
        <p className="mt-2 text-gray-400">
          Top performers across all EHA events
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter by:</span>
          </div>

          {/* Event Filter */}
          {events.length > 0 && (
            <div className="relative">
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="appearance-none bg-dark-surface border border-eha-silver/20 text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eha-red max-w-[200px]"
              >
                <option value="">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Age Group Filter */}
          <div className="relative">
            <select
              value={selectedAgeGroup}
              onChange={(e) => setSelectedAgeGroup(e.target.value)}
              className="appearance-none bg-dark-surface border border-eha-silver/20 text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eha-red"
            >
              <option value="">All Age Groups</option>
              {ageGroups.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Division Filter */}
          <div className="relative">
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="appearance-none bg-dark-surface border border-eha-silver/20 text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eha-red"
            >
              <option value="">All Divisions</option>
              {divisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedEvent('')
                setSelectedAgeGroup('')
                setSelectedDivision('')
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Category Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {statCategories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedStat(cat.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedStat === cat.value
                ? 'bg-eha-red text-white'
                : 'bg-dark-surface text-gray-400 hover:bg-eha-navy/50 hover:text-white'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <Card>
        {isLoading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 bg-eha-navy/50 rounded-full" />
                <div className="w-10 h-10 bg-eha-navy/50 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-eha-navy/50 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-eha-navy/50 rounded w-1/4" />
                </div>
                <div className="w-16 h-6 bg-eha-navy/50 rounded" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {hasActiveFilters ? 'No stats match the selected filters' : 'No stats recorded yet'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSelectedEvent('')
                  setSelectedAgeGroup('')
                  setSelectedDivision('')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-eha-navy">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    GP
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Per Game
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={entry.player.id} className={`hover:bg-eha-navy/30 transition-colors ${index % 2 === 0 ? 'bg-dark-surface' : 'bg-eha-navy/5'}`}>
                    <td className="px-4 py-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-stats text-sm ${index === 0
                            ? 'bg-[#FFD700]/20 text-[#FFD700]'
                            : index === 1
                              ? 'bg-gray-400/20 text-gray-400'
                              : index === 2
                                ? 'bg-orange-600/20 text-orange-500'
                                : 'bg-eha-silver/20 text-gray-500'
                          }`}
                      >
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/players/${entry.player.slug}`} className="flex items-center gap-3 hover:text-eha-red">
                        <Avatar
                          src={entry.player.profilePhoto}
                          fallback={`${entry.player.firstName} ${entry.player.lastName}`}
                          size="md"
                        />
                        <div>
                          <p className="font-semibold text-white">
                            {entry.player.firstName} {entry.player.lastName}
                            {entry.player.currentTeam?.ageGroup && (
                              <span className="ml-2 text-sm font-normal text-gray-400">
                                ({entry.player.currentTeam.ageGroup})
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {entry.player.primaryPosition && (
                              <span>{formatPosition(entry.player.primaryPosition)}</span>
                            )}
                            {entry.player.currentTeam && (
                              <>
                                <span>•</span>
                                {(entry.player.currentTeam.logo || entry.player.currentTeam.program?.logo) && (
                                  <Avatar
                                    src={entry.player.currentTeam.logo || entry.player.currentTeam.program?.logo}
                                    fallback={entry.player.currentTeam.name}
                                    size="sm"
                                    className="w-4 h-4 ml-1"
                                  />
                                )}
                                <span>{entry.player.currentTeam.name}</span>
                              </>
                            )}
                            {entry.player.graduationYear && (
                              <>
                                <span>•</span>
                                <Badge size="sm">&apos;{String(entry.player.graduationYear).slice(-2)}</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-400 font-stats">
                      {entry.gamesPlayed}
                    </td>
                    <td className="px-4 py-4 text-center text-white font-medium font-stats">
                      {currentCategory
                        ? entry.totals[currentCategory.totalKey as keyof typeof entry.totals]
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xl font-bold font-stats text-eha-red">
                        {currentCategory
                          ? entry.averages[currentCategory.avgKey as keyof typeof entry.averages].toFixed(1)
                          : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
