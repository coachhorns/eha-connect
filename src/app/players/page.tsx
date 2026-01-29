'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, ChevronDown } from 'lucide-react'
import { Input, Select, Button, Card } from '@/components/ui'
import { PlayerCard } from '@/components/players/PlayerCard'
import { positions, states, ageGroups } from '@/lib/constants'

interface Player {
  id: string
  slug: string
  firstName: string
  lastName: string
  profilePhoto?: string | null
  primaryPosition?: string | null
  heightFeet?: number | null
  heightInches?: number | null
  school?: string | null
  city?: string | null
  state?: string | null
  graduationYear?: number | null
  isVerified: boolean
  userId?: string | null
  guardians?: { id: string }[]
  achievements?: { type: string }[]
  ageGroup?: string | null
  teamRosters?: { team: { name: string; ageGroup?: string | null; division?: string | null } }[]
  careerStats?: {
    gamesPlayed: number
    ppg: number
    rpg: number
    apg: number
  } | null
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [state, setState] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [division, setDivision] = useState('')
  const [program, setProgram] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const currentYear = new Date().getFullYear()
  const gradYears = Array.from({ length: 8 }, (_, i) => ({
    value: String(currentYear + i),
    label: String(currentYear + i),
  }))

  const divisionOptions = [
    { value: '', label: 'All Divisions' },
    { value: 'EPL', label: 'EPL' },
    { value: 'Gold', label: 'Gold' },
    { value: 'Silver', label: 'Silver' },
  ]

  const fetchPlayers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (position) params.set('position', position)
      if (state) params.set('state', state)
      if (gradYear) params.set('gradYear', gradYear)
      if (division) params.set('division', division)
      if (program) params.set('program', program)
      params.set('page', String(page))

      const res = await fetch(`/api/players?${params}`)
      const data = await res.json()

      setPlayers(data.players)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [page, position, state, gradYear, division])

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1)
      fetchPlayers()
    }, 300)
    return () => clearTimeout(debounce)
  }, [search, program])

  const clearFilters = () => {
    setSearch('')
    setPosition('')
    setState('')
    setGradYear('')
    setDivision('')
    setProgram('')
    setPage(1)
  }

  const hasFilters = search || position || state || gradYear || division || program

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Player Directory</h1>
        <p className="mt-2 text-gray-400">
          Browse and discover EHA Connect athletes
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8 p-4">
        <div className="space-y-4">
          {/* Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or school..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a3a6e] border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
              />
            </div>
            <input
              type="text"
              placeholder="Search by program name..."
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a3a6e] border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select
              options={[{ value: '', label: 'All Positions' }, ...positions]}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full"
            />
            <Select
              options={[{ value: '', label: 'All States' }, ...states]}
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full"
            />
            <Select
              options={[{ value: '', label: 'Grad Year' }, ...gradYears]}
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              className="w-full"
            />
            <Select
              options={divisionOptions}
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white/5 rounded-xl overflow-hidden">
                <div className="h-48 bg-[#1a3a6e]" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-[#1a3a6e] rounded w-3/4" />
                  <div className="h-4 bg-[#1a3a6e] rounded w-1/2" />
                  <div className="h-4 bg-[#1a3a6e] rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : players.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-400 text-lg">No players found</p>
          <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-gray-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
