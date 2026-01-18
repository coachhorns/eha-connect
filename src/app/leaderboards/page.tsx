'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp } from 'lucide-react'
import { Card, Badge, Select, Avatar } from '@/components/ui'
import { formatPosition } from '@/lib/utils'

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
    currentTeam?: { name: string; slug: string } | null
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
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStat, setSelectedStat] = useState('points')

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/leaderboards?stat=${selectedStat}&limit=25`)
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
  }, [selectedStat])

  const currentCategory = statCategories.find((c) => c.value === selectedStat)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Trophy className="w-8 h-8 text-[#FFD700]" />
          Stat Leaderboards
        </h1>
        <p className="mt-2 text-gray-400">
          Top performers across all EHA events
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {statCategories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedStat(cat.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStat === cat.value
                ? 'bg-[#FF6B00] text-white'
                : 'bg-[#1A1A2E] text-gray-400 hover:bg-[#252540] hover:text-white'
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
                <div className="w-8 h-8 bg-[#252540] rounded-full" />
                <div className="w-10 h-10 bg-[#252540] rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-[#252540] rounded w-1/3 mb-2" />
                  <div className="h-3 bg-[#252540] rounded w-1/4" />
                </div>
                <div className="w-16 h-6 bg-[#252540] rounded" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No stats recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#252540]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    GP
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Per Game
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252540]">
                {leaderboard.map((entry, index) => (
                  <tr key={entry.player.id} className="hover:bg-[#252540]/50 transition-colors">
                    <td className="px-4 py-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? 'bg-[#FFD700]/20 text-[#FFD700]'
                            : index === 1
                            ? 'bg-gray-400/20 text-gray-400'
                            : index === 2
                            ? 'bg-orange-600/20 text-orange-500'
                            : 'bg-[#252540] text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/players/${entry.player.slug}`} className="flex items-center gap-3 hover:text-[#FF6B00]">
                        <Avatar
                          src={entry.player.profilePhoto}
                          fallback={`${entry.player.firstName} ${entry.player.lastName}`}
                          size="md"
                        />
                        <div>
                          <p className="font-semibold text-white">
                            {entry.player.firstName} {entry.player.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {entry.player.primaryPosition && (
                              <span>{formatPosition(entry.player.primaryPosition)}</span>
                            )}
                            {entry.player.currentTeam && (
                              <>
                                <span>•</span>
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
                    <td className="px-4 py-4 text-center text-gray-400">
                      {entry.gamesPlayed}
                    </td>
                    <td className="px-4 py-4 text-center text-white font-medium">
                      {currentCategory
                        ? entry.totals[currentCategory.totalKey as keyof typeof entry.totals]
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xl font-bold text-[#FF6B00]">
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
