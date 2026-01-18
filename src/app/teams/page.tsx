'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Users, MapPin, Trophy } from 'lucide-react'
import { Card, Badge, Select, Button } from '@/components/ui'
import { ageGroups, states } from '@/lib/constants'

interface Team {
  id: string
  slug: string
  name: string
  organization?: string | null
  logo?: string | null
  city?: string | null
  state?: string | null
  ageGroup?: string | null
  division?: string | null
  wins: number
  losses: number
  _count: {
    roster: number
  }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [state, setState] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTeams = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (ageGroup) params.set('ageGroup', ageGroup)
      if (state) params.set('state', state)
      params.set('page', String(page))

      const res = await fetch(`/api/teams?${params}`)
      const data = await res.json()

      setTeams(data.teams)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [page, ageGroup, state])

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1)
      fetchTeams()
    }, 300)
    return () => clearTimeout(debounce)
  }, [search])

  const clearFilters = () => {
    setSearch('')
    setAgeGroup('')
    setState('')
    setPage(1)
  }

  const hasFilters = search || ageGroup || state

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 uppercase tracking-wider">
          <Users className="w-8 h-8 text-white" />
          Team Directory
        </h1>
        <p className="mt-2 text-gray-400">
          Browse teams competing in EHA events
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a3a6e] border border-[#1a3a6e] rounded-lg text-white placeholder-gray-500 focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              options={[
                { value: '', label: 'All Age Groups' },
                ...ageGroups.map((ag) => ({ value: ag, label: ag })),
              ]}
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-36"
            />
            <Select
              options={[{ value: '', label: 'All States' }, ...states]}
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-44"
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white/5 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-[#1a3a6e] rounded-lg" />
                  <div className="flex-1">
                    <div className="h-5 bg-[#1a3a6e] rounded w-3/4 mb-2" />
                    <div className="h-4 bg-[#1a3a6e] rounded w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-400 text-lg">No teams found</p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.slug}`}>
                <Card variant="hover" className="p-6 h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-[#1a3a6e] rounded-lg flex items-center justify-center flex-shrink-0">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Users className="w-8 h-8 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{team.name}</h3>
                      {team.organization && (
                        <p className="text-sm text-gray-500 truncate">{team.organization}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {team.ageGroup && (
                          <Badge size="sm">{team.ageGroup}</Badge>
                        )}
                        {team.division && (
                          <Badge variant="orange" size="sm">{team.division}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#1a3a6e] flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      {(team.city || team.state) && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {[team.city, team.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">
                        <Users className="w-4 h-4 inline mr-1" />
                        {team._count.roster}
                      </span>
                      <span className="font-semibold">
                        <span className="text-green-400">{team.wins}</span>
                        <span className="text-gray-500">-</span>
                        <span className="text-red-400">{team.losses}</span>
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
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
