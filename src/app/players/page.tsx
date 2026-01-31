'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
  SlidersHorizontal,
  X,
  Users,
} from 'lucide-react'
import { Button, Badge, Avatar, VerifiedBadge } from '@/components/ui'
import { cn } from '@/lib/utils'
import { positions, states } from '@/lib/constants'

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
  ageGroup?: string | null
  teamRosters?: { team: { name: string; ageGroup?: string | null; division?: string | null } }[]
  careerStats?: {
    gamesPlayed: number
    ppg: number
    rpg: number
    apg: number
  } | null
}

interface Filters {
  position: string
  year: string
  state: string
  division: string
}

// Player Card Component
const PlayerCard = ({ player, rank }: { player: Player; rank: number }) => {
  const router = useRouter()

  const height = player.heightFeet && player.heightInches !== null
    ? `${player.heightFeet}'${player.heightInches}"`
    : '-'

  const initials = `${player.firstName?.charAt(0) || ''}${player.lastName?.charAt(0) || ''}`

  return (
    <div className="bg-[#0a1628] border border-white/10 rounded-sm overflow-hidden group transition-all hover:shadow-xl hover:shadow-eha-red/10 hover:-translate-y-1 hover:border-white/20">
      {/* Image Section */}
      <div className="relative h-56 bg-[#153361] overflow-hidden">
        {player.profilePhoto ? (
          <img
            src={player.profilePhoto}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            alt={`${player.firstName} ${player.lastName}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#153361] to-[#0a1628]">
            <span className="text-5xl font-bold text-white/20">{initials}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="bg-eha-red text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest">
            #{String(rank).padStart(2, '0')}
          </span>
          {player.primaryPosition && (
            <span className="bg-[#0A1D37] text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest">
              {player.primaryPosition}
            </span>
          )}
        </div>

        {/* Verified Badge */}
        {player.isVerified && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 flex items-center gap-1 rounded-sm">
            <Star className="w-3 h-3 text-eha-red fill-eha-red" />
            <span className="text-[10px] font-black text-[#0A1D37]">Verified</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white leading-tight font-heading">
              {player.firstName} {player.lastName}
            </h3>
            {player.isVerified && <VerifiedBadge size="sm" />}
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {player.school || 'School TBD'} {player.graduationYear ? `| Class of ${player.graduationYear}` : ''}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
          <div>
            <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest">PPG</span>
            <span className="text-sm font-black text-white font-stats">
              {player.careerStats?.ppg?.toFixed(1) || '-'}
            </span>
          </div>
          <div>
            <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest">RPG</span>
            <span className="text-sm font-black text-white font-stats">
              {player.careerStats?.rpg?.toFixed(1) || '-'}
            </span>
          </div>
          <div>
            <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest">HT</span>
            <span className="text-sm font-black text-white font-stats">{height}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => router.push(`/players/${player.slug}`)}
            className="flex-1 bg-[#153361] text-white text-[10px] font-black uppercase tracking-widest py-3 hover:bg-eha-red transition-colors rounded-sm"
          >
            View Profile
          </button>
          <button className="w-11 border border-white/10 flex items-center justify-center hover:bg-white/5 rounded-sm transition-colors">
            <Plus className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Filter Sidebar Component
const FilterSidebar = ({
  filters,
  setFilters,
  onReset,
  onClose,
  isMobile = false
}: {
  filters: Filters
  setFilters: (filters: Filters) => void
  onReset: () => void
  onClose?: () => void
  isMobile?: boolean
}) => {
  const currentYear = new Date().getFullYear()
  // Generate 12 years starting from next year (covers 17U down to 8U age groups)
  const gradYears = Array.from({ length: 12 }, (_, i) => currentYear + 1 + i)

  const divisionOptions = [
    { value: '', label: 'All Divisions' },
    { value: 'EPL', label: 'EPL' },
    { value: 'Gold', label: 'Gold' },
    { value: 'Silver', label: 'Silver' },
  ]

  return (
    <div className={cn(
      "bg-[#0a1628] border border-white/10 p-6 rounded-sm",
      isMobile ? "relative" : "sticky top-28"
    )}>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Refine Results</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="text-[10px] font-bold text-eha-red uppercase tracking-widest hover:underline"
          >
            Reset
          </button>
          {isMobile && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Position */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Position
          </label>
          <select
            value={filters.position}
            onChange={(e) => setFilters({ ...filters, position: e.target.value })}
            className="w-full text-sm font-semibold border border-white/10 bg-[#153361] text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-eha-red focus:border-eha-red outline-none appearance-none"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1rem'
            }}
          >
            <option value="">All Positions</option>
            {positions.map((pos) => (
              <option key={pos.value} value={pos.value}>{pos.label}</option>
            ))}
          </select>
        </div>

        {/* Class Year */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Class Year
          </label>
          <div className="grid grid-cols-2 gap-2">
            {gradYears.map((year) => (
              <button
                key={year}
                onClick={() => setFilters({ ...filters, year: filters.year === String(year) ? '' : String(year) })}
                className={cn(
                  "px-3 py-2 border text-xs font-bold rounded-sm transition-colors",
                  filters.year === String(year)
                    ? "border-eha-red bg-eha-red text-white"
                    : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* State */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            State
          </label>
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="w-full text-sm font-semibold border border-white/10 bg-[#153361] text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-eha-red focus:border-eha-red outline-none appearance-none"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1rem'
            }}
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Division */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Division
          </label>
          <select
            value={filters.division}
            onChange={(e) => setFilters({ ...filters, division: e.target.value })}
            className="w-full text-sm font-semibold border border-white/10 bg-[#153361] text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-eha-red focus:border-eha-red outline-none appearance-none"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1rem'
            }}
          >
            {divisionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('priority')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    position: '',
    year: '',
    state: '',
    division: '',
  })

  const fetchPlayers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filters.position) params.set('position', filters.position)
      if (filters.state) params.set('state', filters.state)
      if (filters.year) params.set('gradYear', filters.year)
      if (filters.division) params.set('division', filters.division)
      params.set('page', String(page))
      params.set('sort', sortBy)

      const res = await fetch(`/api/players?${params}`)
      const data = await res.json()

      setPlayers(data.players || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalCount(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching players:', error)
      setPlayers([])
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, filters, page, sortBy])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (page !== 1) setPage(1)
      else fetchPlayers()
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleResetFilters = () => {
    setFilters({
      position: '',
      year: '',
      state: '',
      division: '',
    })
    setSearchQuery('')
    setPage(1)
  }

  const hasActiveFilters = filters.position || filters.year || filters.state || filters.division || searchQuery

  // Generate pagination array
  const getPaginationArray = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', page, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <div className="min-h-screen bg-[#0A1D37]">
      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-[#0a1628] border-b border-white/5 relative overflow-hidden">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="w-12 h-[2px] bg-eha-red" />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/60">
                Talent Database
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-heading font-bold tracking-tighter text-white">
              Players Directory
            </h1>

            {/* Search Bar */}
            <div className="relative max-w-2xl mt-4">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by player name, school, or state..."
                className="w-full bg-white/10 border border-white/20 rounded-full py-4 pl-14 pr-8 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-eha-red/50 focus:border-eha-red/50 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar - Desktop */}
            <div className="hidden lg:block col-span-3 space-y-6">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                onReset={handleResetFilters}
              />
            </div>

            {/* Main Grid */}
            <div className="col-span-12 lg:col-span-9">
              {/* Top Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <span className="text-sm font-bold text-gray-400">
                  Showing <span className="text-white">{totalCount.toLocaleString()}</span> Players
                </span>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {/* Mobile Filter Toggle */}
                  <button
                    onClick={() => setShowMobileFilters(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 bg-[#153361] border border-white/10 rounded-sm text-white text-xs font-bold uppercase tracking-widest"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {hasActiveFilters && (
                      <span className="w-2 h-2 rounded-full bg-eha-red" />
                    )}
                  </button>

                  {/* Sort */}
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden sm:block">
                      Sort By
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value)
                        setPage(1)
                      }}
                      className="text-xs font-bold border-none bg-transparent text-white focus:ring-0 cursor-pointer"
                    >
                      <option value="priority">Verified + EPL First</option>
                      <option value="name">Name: A to Z</option>
                      <option value="gradYear">Class Year</option>
                      <option value="recent">Recently Added</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-[#0a1628] border border-white/5 rounded-sm overflow-hidden">
                        <div className="h-56 bg-[#153361]" />
                        <div className="p-5 space-y-4">
                          <div className="h-5 bg-[#153361] rounded w-3/4" />
                          <div className="h-3 bg-[#153361] rounded w-1/2" />
                          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                            <div className="h-8 bg-[#153361] rounded" />
                            <div className="h-8 bg-[#153361] rounded" />
                            <div className="h-8 bg-[#153361] rounded" />
                          </div>
                          <div className="h-10 bg-[#153361] rounded mt-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : players.length === 0 ? (
                /* Empty State */
                <div className="text-center py-20 bg-[#0a1628] border border-white/5 rounded-sm">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Players Found</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    {hasActiveFilters
                      ? 'No players match your current filters. Try adjusting your search criteria.'
                      : 'There are no players in the directory yet.'}
                  </p>
                  {hasActiveFilters && (
                    <Button onClick={handleResetFilters} variant="secondary">
                      Clear All Filters
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Player Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {players.map((player, index) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        rank={(page - 1) * 20 + index + 1}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12 flex justify-center items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="w-10 h-10 flex items-center justify-center border border-white/10 text-white hover:bg-eha-red hover:border-eha-red transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-white/10 rounded-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {getPaginationArray().map((p, i) => (
                        typeof p === 'number' ? (
                          <button
                            key={i}
                            onClick={() => setPage(p)}
                            className={cn(
                              "w-10 h-10 flex items-center justify-center font-bold text-sm rounded-sm transition-colors",
                              page === p
                                ? "bg-eha-red text-white"
                                : "border border-white/10 text-white hover:bg-white/5"
                            )}
                          >
                            {p}
                          </button>
                        ) : (
                          <span key={i} className="mx-1 text-gray-500 font-bold">...</span>
                        )
                      ))}

                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="w-10 h-10 flex items-center justify-center border border-white/10 text-white hover:bg-eha-red hover:border-eha-red transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-white/10 rounded-sm"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-[#0A1D37] overflow-y-auto">
            <div className="p-4">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                onReset={handleResetFilters}
                onClose={() => setShowMobileFilters(false)}
                isMobile
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
