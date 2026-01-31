'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Calendar, UsersRound } from 'lucide-react'
import { Badge, VerifiedBadge } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface GameStat {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
}

interface Player {
  id: string
  slug: string
  firstName: string
  lastName: string
  profilePhoto: string | null
  primaryPosition: string | null
  jerseyNumber: string | null
  heightFeet: number | null
  heightInches: number | null
  graduationYear: number | null
  school: string | null
  isVerified: boolean
  userId: string | null
  guardians: { id: string }[]
  gameStats: GameStat[]
}

interface RosterEntry {
  id: string
  jerseyNumber: string | null
  player: Player
}

interface Team {
  id: string
  name: string
  slug: string
}

interface Game {
  id: string
  scheduledAt: Date | string
  status: string
  homeScore: number
  awayScore: number
  homeTeam: Team
  awayTeam: Team
  event: { id: string; name: string } | null
}

interface TeamTabsProps {
  roster: RosterEntry[]
  games: Game[]
  teamId: string
  teamName: string
}

// ============================================================================
// PLAYER CARD WITH RECRUITING PULSE
// ============================================================================

function PlayerCard({ entry }: { entry: RosterEntry }) {
  const [isHovered, setIsHovered] = useState(false)
  const player = entry.player

  const jerseyNumber = entry.jerseyNumber || player.jerseyNumber
  const height = player.heightFeet && player.heightInches !== null
    ? `${player.heightFeet}'${player.heightInches}"`
    : null
  const initials = `${player.firstName?.charAt(0) || ''}${player.lastName?.charAt(0) || ''}`

  // Calculate career stats
  const stats = player.gameStats || []
  const gamesPlayed = stats.length
  const ppg = gamesPlayed > 0 ? (stats.reduce((sum, s) => sum + s.points, 0) / gamesPlayed).toFixed(1) : '0.0'
  const rpg = gamesPlayed > 0 ? (stats.reduce((sum, s) => sum + s.rebounds, 0) / gamesPlayed).toFixed(1) : '0.0'
  const apg = gamesPlayed > 0 ? (stats.reduce((sum, s) => sum + s.assists, 0) / gamesPlayed).toFixed(1) : '0.0'

  const isConnected = player.guardians?.length > 0 || player.userId

  return (
    <div
      className="bg-[#0a1628] border border-white/10 group relative overflow-hidden rounded-sm hover:border-white/20 transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="aspect-[4/5] bg-[#153361] overflow-hidden relative">
        {player.profilePhoto ? (
          <Image
            src={player.profilePhoto}
            alt={`${player.firstName} ${player.lastName}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#153361] to-[#0a1628]">
            <span className="text-5xl font-bold text-white/20 font-heading">{initials}</span>
          </div>
        )}

        {/* Jersey Number Badge */}
        {jerseyNumber && (
          <div className="absolute top-4 left-4 bg-eha-red text-white px-3 py-1 text-lg font-black">
            #{jerseyNumber}
          </div>
        )}

        {/* Recruiting Pulse Hover Overlay */}
        <div
          className={cn(
            "absolute inset-0 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          style={{ backgroundColor: 'rgba(10, 29, 55, 0.85)' }}
        >
          <span className="text-eha-red text-[10px] font-black uppercase tracking-widest mb-4">
            Player Profile
          </span>

          {/* Stats Preview */}
          <div className="flex gap-4 mb-6">
            <div className="text-center">
              <span className="block text-2xl font-black text-white font-stats">{ppg}</span>
              <span className="text-[8px] font-bold text-white/60 uppercase">PPG</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-white font-stats">{rpg}</span>
              <span className="text-[8px] font-bold text-white/60 uppercase">RPG</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-white font-stats">{apg}</span>
              <span className="text-[8px] font-bold text-white/60 uppercase">APG</span>
            </div>
          </div>

          <Link
            href={`/players/${player.slug}`}
            className="px-6 py-3 text-[10px] font-black tracking-widest uppercase transition-all w-full bg-white text-[#0A1D37] hover:bg-eha-red hover:text-white"
          >
            View Full Profile
          </Link>
        </div>
      </div>

      {/* Player Info */}
      <div className={cn("p-5", isConnected && "border-t-4 border-eha-red")}>
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-black text-lg uppercase leading-tight text-white font-heading">
              {player.firstName} {player.lastName}
            </h3>
            {isConnected && <VerifiedBadge size="sm" />}
          </div>
          {player.primaryPosition && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {player.primaryPosition}
            </span>
          )}
        </div>

        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
          {player.graduationYear ? `Class of ${player.graduationYear}` : 'Class TBD'}
          {height && ` • ${height}`}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
          <div className="text-center">
            <span className="block text-xs font-black text-white font-stats">{ppg}</span>
            <span className="block text-[8px] font-bold text-gray-500 uppercase">PPG</span>
          </div>
          <div className="text-center">
            <span className="block text-xs font-black text-white font-stats">{rpg}</span>
            <span className="block text-[8px] font-bold text-gray-500 uppercase">RPG</span>
          </div>
          <div className="text-center">
            <span className="block text-xs font-black text-white font-stats">{apg}</span>
            <span className="block text-[8px] font-bold text-gray-500 uppercase">APG</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// POSITION FILTER
// ============================================================================

function PositionFilter({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  const positions = [
    { value: 'all', label: 'All Players' },
    { value: 'guards', label: 'Guards' },
    { value: 'forwards', label: 'Forwards' },
    { value: 'centers', label: 'Centers' },
  ]

  return (
    <div className="flex gap-3 flex-wrap">
      {positions.map((pos) => (
        <button
          key={pos.value}
          onClick={() => onChange(pos.value)}
          className={cn(
            "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all",
            active === pos.value
              ? "bg-white text-[#0A1D37]"
              : "bg-[#0a1628] border border-white/10 text-white hover:bg-white/5"
          )}
        >
          {pos.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamTabs({ roster, games, teamId, teamName }: TeamTabsProps) {
  const [positionFilter, setPositionFilter] = useState('all')
  const [sortBy, setSortBy] = useState('jersey')

  // Filter roster by position
  const filteredRoster = roster.filter((entry) => {
    if (positionFilter === 'all') return true
    const pos = entry.player.primaryPosition?.toUpperCase() || ''
    if (positionFilter === 'guards') return pos === 'PG' || pos === 'SG'
    if (positionFilter === 'forwards') return pos === 'SF' || pos === 'PF'
    if (positionFilter === 'centers') return pos === 'C'
    return true
  })

  // Sort roster
  const sortedRoster = [...filteredRoster].sort((a, b) => {
    if (sortBy === 'jersey') {
      const numA = parseInt(a.jerseyNumber || a.player.jerseyNumber || '99') || 99
      const numB = parseInt(b.jerseyNumber || b.player.jerseyNumber || '99') || 99
      return numA - numB
    }
    if (sortBy === 'name') {
      return (a.player.lastName || '').localeCompare(b.player.lastName || '')
    }
    if (sortBy === 'class') {
      return (a.player.graduationYear || 9999) - (b.player.graduationYear || 9999)
    }
    return 0
  })

  return (
    <Tabs defaultValue="roster">
      <TabsList className="bg-[#0a1628] border border-white/10">
        <TabsTrigger value="roster" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0A1D37]">
          <Users className="w-4 h-4" />
          Roster
        </TabsTrigger>
        <TabsTrigger value="schedule" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0A1D37]">
          <Calendar className="w-4 h-4" />
          Schedule
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roster" className="mt-8">
        {roster.length === 0 ? (
          <div className="text-center py-20 bg-[#0a1628] border border-white/5 rounded-sm">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Players on Roster</h3>
            <p className="text-gray-400">This team hasn't added any players yet.</p>
          </div>
        ) : (
          <>
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <PositionFilter active={positionFilter} onChange={setPositionFilter} />

              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sort By:</span>
                <select
                  className="text-xs font-bold border border-white/10 bg-[#0a1628] text-white px-4 py-2 rounded-sm focus:ring-1 focus:ring-eha-red outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="jersey">Jersey Number</option>
                  <option value="name">Name</option>
                  <option value="class">Class Year</option>
                </select>
              </div>
            </div>

            {/* Player Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedRoster.map((entry) => (
                <PlayerCard key={entry.id} entry={entry} />
              ))}

              {/* Roster Info Card */}
              <div className="flex flex-col items-center justify-center p-8 text-center bg-[#0a1628] border border-white/10 rounded-sm">
                <UsersRound className="w-12 h-12 text-eha-red mb-6" />
                <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-white font-heading">
                  Team Roster
                </h3>
                <p className="text-xs text-gray-400 mb-6">
                  {roster.length} players registered for {teamName}.
                </p>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {filteredRoster.length} shown with current filters
                </div>
              </div>
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="schedule" className="mt-8">
        {games.length === 0 ? (
          <div className="text-center py-20 bg-[#0a1628] border border-white/5 rounded-sm">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Games Scheduled</h3>
            <p className="text-gray-400">This team hasn't been scheduled for any games yet.</p>
          </div>
        ) : (
          <div className="bg-[#0a1628] border border-white/10 rounded-sm overflow-hidden">
            <div className="divide-y divide-white/5">
              {games.map((game) => {
                const isHome = game.homeTeam.id === teamId
                const opponent = isHome ? game.awayTeam : game.homeTeam
                const prefix = isHome ? 'vs' : '@'
                const isFinal = game.status === 'FINAL'
                const teamScore = isHome ? game.homeScore : game.awayScore
                const opponentScore = isHome ? game.awayScore : game.homeScore
                const didWin = teamScore > opponentScore

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-gray-500 text-sm font-bold w-8">{prefix}</span>
                        <Link
                          href={`/teams/${opponent.slug}`}
                          className="text-white font-bold hover:text-eha-red transition-colors"
                        >
                          {opponent.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 ml-11">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(game.scheduledAt)}</span>
                        {game.event && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span>{game.event.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {isFinal ? (
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={didWin ? 'success' : 'error'}
                            size="sm"
                          >
                            {didWin ? 'W' : 'L'}
                          </Badge>
                          <span className="text-white font-stats font-bold text-lg">
                            {teamScore}-{opponentScore}
                          </span>
                        </div>
                      ) : (
                        <Badge
                          variant={game.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                          size="sm"
                        >
                          {game.status === 'IN_PROGRESS'
                            ? 'LIVE'
                            : game.status === 'SCHEDULED'
                            ? 'Upcoming'
                            : game.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
