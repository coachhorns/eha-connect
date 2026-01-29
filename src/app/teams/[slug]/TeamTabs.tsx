'use client'

import Link from 'next/link'
import { Users, Calendar } from 'lucide-react'
import { Card, Badge, Avatar, VerifiedBadge } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { formatDate, formatPositionShort } from '@/lib/utils'

interface Player {
  id: string
  slug: string
  firstName: string
  lastName: string
  profilePhoto: string | null
  primaryPosition: string | null
  jerseyNumber: string | null
  userId: string | null
  guardians: { id: string }[]
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
}

export function TeamTabs({ roster, games, teamId }: TeamTabsProps) {
  return (
    <Tabs defaultValue="roster">
      <TabsList>
        <TabsTrigger value="roster" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Roster
        </TabsTrigger>
        <TabsTrigger value="schedule" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Schedule
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roster">
        <Card>
          {roster.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No players on roster</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {roster.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/players/${entry.player.slug}`}
                  className="group"
                >
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-[#1a3a6e]/30 border border-white/5 hover:border-white/20 hover:bg-[#1a3a6e]/50 transition-all duration-200">
                    <div className="relative">
                      <Avatar
                        src={entry.player.profilePhoto}
                        fallback={`${entry.player.firstName} ${entry.player.lastName}`}
                        size="lg"
                      />
                      {(entry.jerseyNumber || entry.player.jerseyNumber) && (
                        <div className="absolute -bottom-1 -right-1 bg-eha-red text-white text-xs font-bold px-1.5 py-0.5 rounded">
                          #{entry.jerseyNumber || entry.player.jerseyNumber}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate group-hover:text-eha-red transition-colors flex items-center gap-1.5">
                        {entry.player.firstName} {entry.player.lastName}
                        {(entry.player.guardians?.length > 0 || entry.player.userId) && (
                          <VerifiedBadge size="sm" />
                        )}
                      </p>
                      {entry.player.primaryPosition && (
                        <p className="text-sm text-gray-400">
                          {formatPositionShort(entry.player.primaryPosition)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="schedule">
        <Card>
          {games.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No games scheduled</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a3a6e]">
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
                    className="flex items-center justify-between p-4 hover:bg-[#1a3a6e]/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-500 text-sm w-8">{prefix}</span>
                        <Link
                          href={`/teams/${opponent.slug}`}
                          className="text-white font-medium hover:text-eha-red transition-colors"
                        >
                          {opponent.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
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
                          <span className="text-white font-mono font-bold text-lg">
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
          )}
        </Card>
      </TabsContent>
    </Tabs>
  )
}
