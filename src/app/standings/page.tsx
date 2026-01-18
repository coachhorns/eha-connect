'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Trophy,
  Filter,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

interface TeamStanding {
  teamId: string
  teamSlug: string
  teamName: string
  teamLogo: string | null
  ageGroup?: string | null
  division?: string | null
  city: string | null
  state: string | null
  wins: number
  losses: number
  winPct?: string
  pointsFor?: number
  pointsAgainst?: number
  pointDiff?: number
  seed?: number | null
}

interface EventFilter {
  id: string
  name: string
  slug: string
}

interface Filters {
  ageGroups: string[]
  divisions: string[]
  events: EventFilter[]
}

export default function StandingsPage() {
  const [standings, setStandings] = useState<Record<string, TeamStanding[]>>({})
  const [filters, setFilters] = useState<Filters | null>(null)
  const [standingsType, setStandingsType] = useState<'overall' | 'event'>('overall')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<string>('')

  useEffect(() => {
    const fetchStandings = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedEvent) {
          params.append('eventId', selectedEvent)
        } else {
          if (selectedAgeGroup) params.append('ageGroup', selectedAgeGroup)
          if (selectedDivision) params.append('division', selectedDivision)
        }

        const res = await fetch(`/api/public/standings?${params}`)
        if (res.ok) {
          const data = await res.json()
          setStandings(data.standings)
          setStandingsType(data.type)
          if (data.filters) {
            setFilters(data.filters)
          }
        }
      } catch (error) {
        console.error('Error fetching standings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStandings()
  }, [selectedAgeGroup, selectedDivision, selectedEvent])

  const sortedGroups = Object.keys(standings).sort((a, b) => {
    if (a === 'Other' || a === 'Overall') return 1
    if (b === 'Other' || b === 'Overall') return -1
    return a.localeCompare(b)
  })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Standings</h1>
          </div>
          <p className="text-gray-400">Team rankings and records</p>
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
                  onChange={(e) => {
                    setSelectedEvent(e.target.value)
                    if (e.target.value) {
                      setSelectedAgeGroup('')
                      setSelectedDivision('')
                    }
                  }}
                  className="appearance-none bg-[#1a3a6e] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eha-red"
                >
                  <option value="">All Events (Overall)</option>
                  {filters.events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Age Group Filter (only for overall standings) */}
            {!selectedEvent && filters?.ageGroups && filters.ageGroups.length > 0 && (
              <div className="relative">
                <select
                  value={selectedAgeGroup}
                  onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  className="appearance-none bg-[#1a3a6e] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eha-red"
                >
                  <option value="">All Age Groups</option>
                  {filters.ageGroups.map(ag => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Division Filter (only for overall standings) */}
            {!selectedEvent && filters?.divisions && filters.divisions.length > 0 && (
              <div className="relative">
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="appearance-none bg-[#1a3a6e] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eha-red"
                >
                  <option value="">All Divisions</option>
                  {filters.divisions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {(selectedAgeGroup || selectedDivision || selectedEvent) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedAgeGroup('')
                  setSelectedDivision('')
                  setSelectedEvent('')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Standings Tables */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
          </div>
        ) : sortedGroups.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Standings Available</h3>
            <p className="text-gray-500">There are no team records to display yet.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedGroups.map(group => (
              <Card key={group} className="overflow-hidden p-0">
                <div className="bg-[#1a3a6e] px-4 py-3 border-b border-[#1A1A2E]">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <Badge variant={standingsType === 'event' ? 'info' : 'orange'}>{group}</Badge>
                    <span className="text-gray-500 text-sm font-normal">
                      ({standings[group].length} teams)
                    </span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1a3a6e] text-xs text-gray-500 uppercase">
                        <th className="text-left py-3 px-4 w-12">#</th>
                        <th className="text-left py-3 px-4">Team</th>
                        <th className="text-center py-3 px-3">W</th>
                        <th className="text-center py-3 px-3">L</th>
                        {standingsType === 'overall' && (
                          <th className="text-center py-3 px-3">PCT</th>
                        )}
                        {standingsType === 'event' && (
                          <>
                            <th className="text-center py-3 px-3">PF</th>
                            <th className="text-center py-3 px-3">PA</th>
                            <th className="text-center py-3 px-3">+/-</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {standings[group].map((team, idx) => (
                        <tr
                          key={team.teamId}
                          className="border-b border-[#1a3a6e]/50 hover:bg-[#1a3a6e]/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className={`font-bold ${
                              idx === 0 ? 'text-white' :
                              idx === 1 ? 'text-gray-300' :
                              idx === 2 ? 'text-amber-600' : 'text-gray-500'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {team.teamLogo ? (
                                <Image
                                  src={team.teamLogo}
                                  alt={`${team.teamName} logo`}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-[#1a3a6e] rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-gray-400">
                                    {team.teamName.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white">{team.teamName}</div>
                                <div className="text-xs text-gray-500">
                                  {team.city && team.state && `${team.city}, ${team.state}`}
                                  {team.division && standingsType === 'overall' && (
                                    <span className="ml-2 text-gray-600">• {team.division}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-3">
                            <span className="text-green-400 font-medium">{team.wins}</span>
                          </td>
                          <td className="text-center py-3 px-3">
                            <span className="text-red-400 font-medium">{team.losses}</span>
                          </td>
                          {standingsType === 'overall' && (
                            <td className="text-center py-3 px-3">
                              <span className="text-white font-medium">{team.winPct}</span>
                            </td>
                          )}
                          {standingsType === 'event' && (
                            <>
                              <td className="text-center py-3 px-3 text-gray-400">{team.pointsFor}</td>
                              <td className="text-center py-3 px-3 text-gray-400">{team.pointsAgainst}</td>
                              <td className="text-center py-3 px-3">
                                <span className={`font-medium flex items-center justify-center gap-1 ${
                                  (team.pointDiff || 0) > 0 ? 'text-green-400' :
                                  (team.pointDiff || 0) < 0 ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                  {(team.pointDiff || 0) > 0 ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : (team.pointDiff || 0) < 0 ? (
                                    <TrendingDown className="w-3 h-3" />
                                  ) : (
                                    <Minus className="w-3 h-3" />
                                  )}
                                  {(team.pointDiff || 0) > 0 ? '+' : ''}{team.pointDiff || 0}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
