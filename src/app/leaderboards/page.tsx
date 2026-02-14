'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  User,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Activity,
  Download
} from 'lucide-react'
import { Button, Badge, Avatar, VerifiedBadge } from '@/components/ui'
import { cn } from '@/lib/utils'

export default function LeaderboardsPage() {
  const [division, setDivision] = useState('All Divisions')
  const [category, setCategory] = useState('Points Per Game')
  const [activePosition, setActivePosition] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)

  const router = useRouter()

  const [players, setPlayers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/leaderboard?division=${division}`)
        const data = await res.json()
        if (data.players) {
          setPlayers(data.players)
        } else {
          setPlayers([])
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
        setPlayers([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchLeaderboard()
  }, [division])

  // Filter Logic
  const filteredPlayers = players.filter(p =>
    activePosition === 'All' || p.position === activePosition
  )

  const getValue = (p: any, cat: string) => {
    switch (cat) {
      case 'Points Per Game': return p.ppg
      case 'Rebounds Per Game': return p.rpg
      case 'Assists Per Game': return p.apg
      case 'Steals Per Game':
        return p.gamesPlayed > 0 ? Number((p.totalSteals / p.gamesPlayed).toFixed(1)) : 0
      case 'Blocks Per Game':
        return p.gamesPlayed > 0 ? Number((p.totalBlocks / p.gamesPlayed).toFixed(1)) : 0
      case 'Field Goal %':
        return p.fgAttempted > 0 ? Number(((p.fgMade / p.fgAttempted) * 100).toFixed(1)) : 0
      case '3PT %':
        return p.fg3Attempted > 0 ? Number(((p.fg3Made / p.fg3Attempted) * 100).toFixed(1)) : 0
      case 'Free Throw %':
        return p.ftAttempted > 0 ? Number(((p.ftMade / p.ftAttempted) * 100).toFixed(1)) : 0
      case 'Turnovers':
        return p.gamesPlayed > 0 ? Number((p.totalTurnovers / p.gamesPlayed).toFixed(1)) : 0
      case 'Plus/Minus':
        return p.plusMinus
      case 'Player Efficiency (PER)': return p.per
      default: return p.ppg
    }
  }

  // Sort based on category
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const valA = getValue(a, category)
    const valB = getValue(b, category)
    return valB - valA
  })

  // Re-assign ranks based on sort
  sortedPlayers.forEach((p, i) => p.rank = i + 1)

  // Top Leaders logic
  const topScorer = players.length > 0 ? [...players].sort((a, b) => b.ppg - a.ppg)[0] : null
  const topAssister = players.length > 0 ? [...players].sort((a, b) => b.apg - a.apg)[0] : null
  const topBlocker = players.length > 0 ? [...players].sort((a, b) => (b.totalBlocks || 0) - (a.totalBlocks || 0))[0] : null

  const getCategoryLabel = (cat: string) => {
    if (cat === 'Points Per Game') return 'PPG'
    if (cat === 'Rebounds Per Game') return 'RPG'
    if (cat === 'Assists Per Game') return 'APG'
    if (cat === 'Steals Per Game') return 'SPG'
    if (cat === 'Blocks Per Game') return 'BPG'
    if (cat === 'Field Goal %') return 'FG%'
    if (cat === '3PT %') return '3PT%'
    if (cat === 'Free Throw %') return 'FT%'
    if (cat === 'Turnovers') return 'TO'
    if (cat === 'Plus/Minus') return '+/-'
    if (cat === 'Player Efficiency (PER)') return 'PER'
    return 'Value'
  }

  return (
    <div className="min-h-screen bg-page-bg">
      {/* Header / Hero */}
      <header className="pt-32 pb-12 bg-page-bg-alt border-b border-border-subtle relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-eha-red/10 border border-eha-red/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-eha-red animate-pulse"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-eha-red">Live Updates: 2024 Circuit</span>
              </div>
              <h1 className="text-5xl lg:text-6xl text-text-primary font-heading font-bold tracking-tighter">Leaderboards</h1>
              <p className="text-text-muted max-w-xl font-light">Filter through the top performers across the association. Data verified by independent on-site statisticians.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-5 py-3 bg-page-bg-alt border border-border-default rounded-sm font-bold text-xs uppercase tracking-widest text-text-primary hover:bg-surface-raised transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button className="flex items-center gap-2 px-5 py-3 bg-eha-navy text-white border border-border-default rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-eha-red hover:border-eha-red transition-all shadow-lg">
                <Filter className="w-4 h-4" /> Advanced Filter
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Filters */}
      <section className="py-10 bg-page-bg sticky top-20 z-40 border-b border-border-subtle backdrop-blur-md bg-opacity-90 shadow-xl">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="flex flex-wrap items-center gap-8">
            <FilterSelect
              label="Division"
              options={['All Divisions', 'EPL', 'Gold', 'Silver']}
              value={division}
              onChange={(e: any) => setDivision(e.target.value)}
            />
            <FilterSelect
              label="Category"
              options={[
                'Points Per Game',
                'Rebounds Per Game',
                'Assists Per Game',
                'Steals Per Game',
                'Blocks Per Game',
                'Field Goal %',
                '3PT %',
                'Free Throw %',
                'Turnovers',
                'Plus/Minus',
                'Player Efficiency (PER)'
              ]}
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
            />
            {/* Region Filter Removed */}
            <PositionFilter
              activePosition={activePosition}
              onPositionChange={setActivePosition}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="py-20">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">

          {isLoading ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-eha-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-text-muted">Loading stats...</p>
            </div>
          ) : sortedPlayers.length === 0 ? (
            <div className="text-center py-32 bg-page-bg-alt border border-border-subtle rounded-sm">
              <Trophy className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-text-primary mb-2">No Stats Recorded Yet</h3>
              <p className="text-text-muted max-w-md mx-auto">There are no players matching your criteria, or no games have been played yet for this season.</p>
            </div>
          ) : (
            <>
              {/* Top Leaders Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                {/* Always show Top Scorer if available */}
                {topScorer && topScorer.ppg >= 0 && (
                  <LeaderCard
                    title="Top Scorer"
                    playerName={topScorer.name}
                    teamName={topScorer.team}
                    stat={topScorer.ppg}
                    statLabel="PPG"
                    icon={Target}
                    onClick={() => router.push(`/players/${topScorer.slug}`)}
                  />
                )}
                {/* Only show others if they are meaningful */}
                {topAssister && (topAssister.apg > 0 ? (
                  <LeaderCard
                    title="Assists Leader"
                    playerName={topAssister.name}
                    teamName={topAssister.team}
                    stat={topAssister.apg}
                    statLabel="APG"
                    icon={Activity}
                    onClick={() => router.push(`/players/${topAssister.slug}`)}
                  />
                ) : (
                  <LeaderCard
                    title="Efficiency Leader"
                    playerName={topScorer?.name}
                    teamName={topScorer?.team}
                    stat={topScorer?.per}
                    statLabel="PER"
                    icon={Activity}
                    onClick={() => topScorer && router.push(`/players/${topScorer.slug}`)}
                  />
                ))}

                {topBlocker && (topBlocker.totalBlocks || 0) > 0 ? (
                  <LeaderCard
                    title="Rim Protector"
                    playerName={topBlocker.name}
                    teamName={topBlocker.team}
                    stat={topBlocker.totalBlocks}
                    statLabel="Blocks"
                    icon={TrendingUp}
                    onClick={() => router.push(`/players/${topBlocker.slug}`)}
                  />
                ) : (
                  <LeaderCard
                    title="Top Rebounder"
                    playerName={players.sort((a, b) => b.rpg - a.rpg)[0]?.name}
                    teamName={players.sort((a, b) => b.rpg - a.rpg)[0]?.team}
                    stat={players.sort((a, b) => b.rpg - a.rpg)[0]?.rpg}
                    statLabel="RPG"
                    icon={TrendingUp}
                    onClick={() => {
                      const rebounder = players.sort((a, b) => b.rpg - a.rpg)[0]
                      if (rebounder) router.push(`/players/${rebounder.slug}`)
                    }}
                  />
                )}
              </div>

              {/* Leaderboard Table */}
              <div className="bg-page-bg-alt border border-border-default rounded-sm overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-raised border-b border-border-subtle">
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-muted uppercase tracking-widest">Rank</th>
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-muted uppercase tracking-widest">Player</th>
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-muted uppercase tracking-widest">Team</th>
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-muted uppercase tracking-widest text-center">Pos</th>
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-muted uppercase tracking-widest text-center">GP</th>
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-primary uppercase tracking-widest text-right bg-surface-glass">
                          {getCategoryLabel(category)}
                        </th>
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-muted uppercase tracking-widest text-right">RPG</th>
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-muted uppercase tracking-widest text-right">APG</th>
                        <th className="px-8 py-5 text-[10px] font-extrabold text-text-muted uppercase tracking-widest text-right">PER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers.map((player) => (
                        <LeaderboardRow
                          key={player.id}
                          rank={player.rank}
                          player={player}
                          categoryValue={getValue(player, category)}
                          onClick={() => router.push(`/players/${player.slug}`)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-6 bg-page-bg-alt border-t border-border-subtle flex items-center justify-between">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                    Showing {sortedPlayers.length} Players
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}

function FilterSelect({ label, options, value, onChange }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className="appearance-none bg-page-bg-alt border border-border-default rounded-sm text-sm font-bold text-text-primary px-4 py-2.5 pr-10 min-w-[180px] focus:outline-none focus:border-eha-red focus:ring-1 focus:ring-eha-red transition-all"
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  )
}

function PositionFilter({ activePosition, onPositionChange }: any) {
  const positions = ['All', 'PG', 'SG', 'SF', 'PF', 'C']
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest">Position</label>
      <div className="flex bg-page-bg-alt border border-border-default rounded-sm p-1">
        {positions.map(pos => (
          <button
            key={pos}
            onClick={() => onPositionChange(pos)}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-sm transition-all",
              activePosition === pos
                ? "bg-eha-red text-white shadow-lg"
                : "text-text-muted hover:text-text-primary hover:bg-surface-glass"
            )}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  )
}

function LeaderCard({ title, playerName, teamName, stat, statLabel, icon: Icon, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-sm transition-transform hover:-translate-y-1 duration-300 group cursor-pointer bg-page-bg-alt border border-border-default hover:border-eha-red/50"
    >
      <div className="p-8 relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-surface-glass">
              <Icon className="w-5 h-5 text-eha-red" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-text-muted">
              {title}
            </span>
          </div>
          <Badge className="border-0 bg-eha-red/10 text-eha-red">
            #1 Rank
          </Badge>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-bold font-heading mb-1 text-text-primary group-hover:text-eha-red transition-colors">
            {playerName}
          </h3>
          <p className="text-sm font-medium text-text-muted">{teamName}</p>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-5xl font-black font-stats tracking-tighter text-text-primary">{stat}</span>
          <span className="text-sm font-bold uppercase tracking-widest mb-2 text-text-muted">
            {statLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

const LeaderboardRow = ({ rank, player, onClick, categoryValue }: any) => {
  return (
    <tr
      className="border-b border-border-subtle transition-colors cursor-pointer hover:bg-surface-glass group"
      onClick={onClick}
    >
      <td className="px-8 py-6 font-black text-text-primary text-lg font-heading">{rank}</td>
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <Avatar
            src={player.headshot}
            fallback={player.name}
            className="w-10 h-10 border border-border-default group-hover:border-eha-red/50 transition-colors"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <div className="font-bold text-text-primary font-heading">{player.name}</div>
              {player.isVerified && <VerifiedBadge size="sm" />}
            </div>
            <div className="text-[10px] font-bold text-eha-red uppercase tracking-widest">{player.class}</div>
          </div>
        </div>
      </td>
      <td className="px-8 py-6 text-sm font-semibold text-text-muted">{player.team}</td>
      <td className="px-8 py-6 text-sm font-bold text-text-primary text-center font-heading">{player.position}</td>
      <td className="px-8 py-6 text-sm font-semibold text-text-muted text-center">{player.gamesPlayed}</td>
      <td className="px-8 py-6 font-bold text-text-primary text-right bg-surface-glass">
        {categoryValue}
      </td>
      <td className="px-8 py-6 text-sm font-semibold text-text-muted text-right">{player.rpg}</td>
      <td className="px-8 py-6 text-sm font-semibold text-text-muted text-right">{player.apg}</td>
      <td className="px-8 py-6 text-sm font-bold text-green-400 text-right font-stats">{player.per}</td>
    </tr>
  )
}
