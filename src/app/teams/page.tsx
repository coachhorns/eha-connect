'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Users, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import { ageGroups, states, divisions } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface Team {
  id: string
  slug: string
  name: string
  logo?: string | null
  city?: string | null
  state?: string | null
  ageGroup?: string | null
  division?: string | null
  wins: number
  losses: number
  program?: {
    id: string
    name: string
    slug: string
    logo?: string | null
  } | null
  _count: {
    roster: number
  }
}

// ============================================================================
// FILTER SIDEBAR
// ============================================================================

interface FilterSidebarProps {
  filters: {
    division: string
    ageGroup: string
    state: string
    performanceTier: string[]
  }
  setFilters: React.Dispatch<React.SetStateAction<FilterSidebarProps['filters']>>
  onReset: () => void
  onClose?: () => void
  isMobile?: boolean
}

function FilterSidebar({ filters, setFilters, onReset, onClose, isMobile = false }: FilterSidebarProps) {
  const handleCheckboxChange = (tier: string) => {
    setFilters(prev => ({
      ...prev,
      performanceTier: prev.performanceTier.includes(tier)
        ? prev.performanceTier.filter(t => t !== tier)
        : [...prev.performanceTier, tier]
    }))
  }

  const selectStyle = {
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    backgroundSize: '1rem'
  }

  return (
    <div className={cn(
      "bg-[#0a1628] border border-white/10 p-6 rounded-sm",
      isMobile ? "relative" : "sticky top-28"
    )}>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Team Filters</h3>
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
        {/* Division Filter */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Division</label>
          <select
            className="w-full text-sm font-semibold border border-white/10 bg-[#153361] text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-eha-red focus:border-eha-red outline-none transition-all"
            style={selectStyle}
            value={filters.division}
            onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
          >
            <option value="">All Divisions</option>
            {divisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        {/* Age Group Filter */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Age Group</label>
          <select
            className="w-full text-sm font-semibold border border-white/10 bg-[#153361] text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-eha-red focus:border-eha-red outline-none transition-all"
            style={selectStyle}
            value={filters.ageGroup}
            onChange={(e) => setFilters(prev => ({ ...prev, ageGroup: e.target.value }))}
          >
            <option value="">All Age Groups</option>
            {ageGroups.map(ag => (
              <option key={ag} value={ag}>{ag}</option>
            ))}
          </select>
        </div>

        {/* Region/State Filter */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Region / State</label>
          <select
            className="w-full text-sm font-semibold border border-white/10 bg-[#153361] text-white px-4 py-3 rounded-sm focus:ring-1 focus:ring-eha-red focus:border-eha-red outline-none transition-all"
            style={selectStyle}
            value={filters.state}
            onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
          >
            <option value="">All States</option>
            {states.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Performance Tier Filter */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Performance Tier</label>
          <div className="space-y-2">
            {['Undefeated', 'Winning Record (> .500)', 'Has Roster'].map(tier => (
              <label key={tier} className="flex items-center gap-3 text-sm font-medium cursor-pointer text-gray-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/20 bg-[#153361] accent-eha-red"
                  checked={filters.performanceTier.includes(tier)}
                  onChange={() => handleCheckboxChange(tier)}
                />
                {tier}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TEAM CARD
// ============================================================================

interface TeamCardProps {
  team: Team
}

function TeamCard({ team }: TeamCardProps) {
  const record = `${team.wins}-${team.losses}`
  const location = [team.city, team.state].filter(Boolean).join(', ')
  const programName = team.program?.name || team.ageGroup || 'EHA Team'
  const logoUrl = team.logo || team.program?.logo

  return (
    <Link href={`/teams/${team.slug}`}>
      <div className="bg-[#0a1628] border border-white/10 rounded-sm overflow-hidden group transition-all hover:shadow-xl hover:shadow-eha-red/10 hover:-translate-y-1 hover:border-white/20">
        {/* Image Header */}
        <div className="relative h-48 bg-[#153361] overflow-hidden">
          {/* Radial pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          {/* Team logo as background if available */}
          {logoUrl ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src={logoUrl}
                alt=""
                width={200}
                height={200}
                className="object-contain grayscale opacity-30 group-hover:opacity-50 group-hover:grayscale-0 transition-all duration-500"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="w-20 h-20 text-white/10" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {team.division && (
              <span className="text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest bg-[#0A1D37]">
                {team.division}
              </span>
            )}
            {team.ageGroup && (
              <span className="text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest bg-eha-red">
                {team.ageGroup}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Circular Logo */}
          <div className="flex justify-end -mt-8 mb-2">
            <div className="w-16 h-16 bg-white rounded-full p-1 border-2 border-white/20 shadow-lg flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform overflow-hidden">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={team.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <Users className="w-8 h-8 text-[#0A1D37]" />
              )}
            </div>
          </div>

          {/* Team Info */}
          <div className="mb-4">
            <h3 className="font-heading text-xl font-bold leading-tight text-white group-hover:text-eha-red transition-colors">
              {team.name}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {programName} {location && `| ${location}`}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest">Record</span>
              <span className="text-sm font-black text-white font-stats">{record}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest">Roster</span>
              <span className="text-sm font-black text-white font-stats">{team._count.roster}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest">Win %</span>
              <span className={`text-sm font-black font-stats ${
                team.wins + team.losses > 0
                  ? (team.wins / (team.wins + team.losses)) >= 0.5
                    ? 'text-green-400'
                    : 'text-gray-400'
                  : 'text-gray-500'
              }`}>
                {team.wins + team.losses > 0
                  ? `${Math.round((team.wins / (team.wins + team.losses)) * 100)}%`
                  : '—'}
              </span>
            </div>
          </div>

          {/* View Team Button */}
          <div className="mt-5 flex gap-2">
            <span className="flex-1 text-center text-white text-[10px] font-black uppercase tracking-widest py-3 bg-[#153361] group-hover:bg-eha-red transition-colors rounded-sm">
              View Team
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TeamCardSkeleton() {
  return (
    <div className="bg-[#0a1628] border border-white/5 rounded-sm overflow-hidden animate-pulse">
      <div className="h-48 bg-[#153361]" />
      <div className="px-6 pb-6 pt-0 relative">
        <div className="flex justify-end -mt-8 mb-2">
          <div className="w-16 h-16 bg-[#153361] rounded-full" />
        </div>
        <div className="mb-4 space-y-2">
          <div className="h-6 bg-[#153361] rounded w-3/4" />
          <div className="h-3 bg-[#153361] rounded w-1/2" />
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
          <div className="h-8 bg-[#153361] rounded" />
          <div className="h-8 bg-[#153361] rounded" />
          <div className="h-8 bg-[#153361] rounded" />
        </div>
        <div className="mt-5 h-10 bg-[#153361] rounded" />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('priority')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const [filters, setFilters] = useState({
    division: '',
    ageGroup: '',
    state: '',
    performanceTier: [] as string[]
  })

  const fetchTeams = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filters.ageGroup) params.set('ageGroup', filters.ageGroup)
      if (filters.division) params.set('division', filters.division)
      if (filters.state) params.set('state', filters.state)
      if (sortBy && sortBy !== 'priority') params.set('sort', sortBy)
      params.set('page', String(page))

      const res = await fetch(`/api/teams?${params}`)
      const data = await res.json()

      let filteredTeams = data.teams || []

      // Apply performance tier filters client-side
      if (filters.performanceTier.includes('Undefeated')) {
        filteredTeams = filteredTeams.filter((t: Team) => t.wins > 0 && t.losses === 0)
      }
      if (filters.performanceTier.includes('Winning Record (> .500)')) {
        filteredTeams = filteredTeams.filter((t: Team) => t.wins > t.losses)
      }
      if (filters.performanceTier.includes('Has Roster')) {
        filteredTeams = filteredTeams.filter((t: Team) => t._count.roster > 0)
      }

      setTeams(filteredTeams)
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalCount(data.pagination?.total || filteredTeams.length)
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [page, filters.ageGroup, filters.division, filters.state, sortBy])

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1)
      fetchTeams()
    }, 300)
    return () => clearTimeout(debounce)
  }, [search, filters.performanceTier])

  const clearFilters = () => {
    setSearch('')
    setFilters({
      division: '',
      ageGroup: '',
      state: '',
      performanceTier: []
    })
    setSortBy('priority')
    setPage(1)
  }

  const hasActiveFilters = filters.division || filters.ageGroup || filters.state || filters.performanceTier.length > 0 || search

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="min-h-screen bg-[#0A1D37]">
      {/* ========== HERO HEADER ========== */}
      <section className="pt-32 pb-12 bg-[#0a1628] border-b border-white/5 relative overflow-hidden">
        {/* Radial Dot Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
          <div className="flex flex-col gap-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3">
              <span className="w-12 h-[2px] bg-eha-red" />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/60">
                League Database
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl lg:text-5xl font-heading font-bold tracking-tighter text-white">
              Team Directory
            </h1>

            {/* Search Bar */}
            <div className="relative max-w-2xl mt-4">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by team name, program, or location..."
                className="w-full bg-white/10 border border-white/20 rounded-full py-4 pl-14 pr-8 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-eha-red/50 focus:border-eha-red/50 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========== MAIN CONTENT ========== */}
      <section className="py-8">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar Filters - Desktop */}
            <div className="hidden lg:block col-span-3 space-y-6">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                onReset={clearFilters}
              />
            </div>

            {/* Team Grid */}
            <div className="col-span-12 lg:col-span-9">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <span className="text-sm font-bold text-gray-400">
                  Showing <span className="text-white">{totalCount.toLocaleString()}</span> Registered Teams
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
                      className="text-xs font-bold border-none bg-transparent text-white focus:ring-0 cursor-pointer"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="priority">Default (Priority)</option>
                      <option value="name">Alphabetical</option>
                      <option value="wins">Most Wins</option>
                      <option value="program">By Program</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Team Cards Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TeamCardSkeleton key={i} />
                  ))}
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-20 bg-[#0a1628] border border-white/5 rounded-sm">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Teams Found</h3>
                  <p className="text-gray-400 text-sm mb-4">Try adjusting your filters</p>
                  <button
                    onClick={clearFilters}
                    className="text-[10px] font-bold uppercase tracking-widest text-eha-red hover:underline"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {teams.map(team => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && !isLoading && teams.length > 0 && (
                <div className="mt-12 flex justify-center items-center gap-2">
                  <button
                    className="w-10 h-10 flex items-center justify-center border border-white/10 text-white hover:bg-eha-red hover:border-eha-red transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getPageNumbers().map((p, idx) => (
                    typeof p === 'number' ? (
                      <button
                        key={idx}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center font-bold transition-all rounded-sm",
                          page === p
                            ? 'bg-eha-red text-white border border-eha-red'
                            : 'border border-white/10 text-white hover:bg-white/5'
                        )}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={idx} className="mx-2 text-gray-500 font-bold">...</span>
                    )
                  ))}

                  <button
                    className="w-10 h-10 flex items-center justify-center border border-white/10 text-white hover:bg-eha-red hover:border-eha-red transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-[#0A1D37] overflow-y-auto">
            <div className="p-6">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                onReset={clearFilters}
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
