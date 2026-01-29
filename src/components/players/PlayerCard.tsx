'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, GraduationCap, Trophy, Users } from 'lucide-react'
import { Badge, VerifiedBadge } from '@/components/ui'
import { formatHeight, formatPosition } from '@/lib/utils'

interface PlayerCardProps {
  player: {
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
    ageGroup?: string | null
    isVerified: boolean
    userId?: string | null
    guardians?: { id: string }[]
    achievements?: { type: string }[]
    teamRosters?: { team: { name: string; ageGroup?: string | null; division?: string | null } }[]
    careerStats?: {
      gamesPlayed: number
      ppg: number
      rpg: number
      apg: number
    } | null
  }
}

export function PlayerCard({ player }: PlayerCardProps) {
  const currentTeam = player.teamRosters?.[0]?.team
  const teamName = currentTeam?.name
  const ageGroup = player.ageGroup || currentTeam?.ageGroup

  // Get division - prioritize EPL team if player is on multiple teams
  const division = player.teamRosters?.find(
    (r) => r.team?.division === 'EPL' || r.team?.division === 'EHA Premier League'
  )?.team?.division || currentTeam?.division

  // Verified = has guardians or userId
  const isVerified = (player.guardians && player.guardians.length > 0) || !!player.userId

  return (
    <Link href={`/players/${player.slug}`}>
      <div className="player-card group cursor-pointer">
        {/* Player Photo */}
        <div className="relative h-48 bg-gradient-to-b from-eha-red/20 to-transparent">
          {player.profilePhoto ? (
            <Image
              src={player.profilePhoto}
              alt={`${player.firstName} ${player.lastName}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[#1a3a6e] flex items-center justify-center text-3xl font-bold text-gray-500">
                {player.firstName[0]}{player.lastName[0]}
              </div>
            </div>
          )}

          {/* Verification Badge */}
          {isVerified && (
            <div className="absolute top-3 right-3">
              <VerifiedBadge size="md" />
            </div>
          )}

          {/* Position Badge */}
          {player.primaryPosition && (
            <div className="absolute top-3 left-3">
              <Badge variant="default" size="sm" className="bg-[#153361]/90 text-white border-white/20">
                {player.primaryPosition}
              </Badge>
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-white group-hover:text-eha-red transition-colors flex items-center gap-1.5">
            {player.firstName} {player.lastName}
            {isVerified && <VerifiedBadge size="sm" />}
          </h3>

          {/* Team & Age Group - Prominent Display */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-3.5 h-3.5 text-white" />
              <span className={teamName ? 'text-white font-medium' : 'text-gray-500 italic'}>
                {teamName || 'Unassigned'}
              </span>
            </div>
            {ageGroup && (
              <Badge variant="info" size="sm">{ageGroup}</Badge>
            )}
            {division && (
              <Badge variant="orange" size="sm">{division}</Badge>
            )}
          </div>

          <div className="mt-2 space-y-1.5 text-sm text-gray-400">
            {player.heightFeet && (
              <p>
                {formatHeight(player.heightFeet, player.heightInches)} | {formatPosition(player.primaryPosition)}
              </p>
            )}

            {player.school && (
              <p className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                {player.school}
              </p>
            )}

            {(player.city || player.state) && (
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {[player.city, player.state].filter(Boolean).join(', ')}
              </p>
            )}

            {player.graduationYear && (
              <p className="text-eha-red font-medium">
                Class of {player.graduationYear}
              </p>
            )}
          </div>

          {/* Stats Preview */}
          {player.careerStats && player.careerStats.gamesPlayed > 0 && (
            <div className="mt-4 pt-4 border-t border-[#1a3a6e]">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-white">
                    {player.careerStats.ppg.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">PPG</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {player.careerStats.rpg.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">RPG</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {player.careerStats.apg.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">APG</p>
                </div>
              </div>
            </div>
          )}

          {/* Achievements */}
          {player.achievements && player.achievements.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {player.achievements.slice(0, 3).map((achievement, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-[#FFD700]/20 flex items-center justify-center"
                  title={achievement.type}
                >
                  <Trophy className="w-3 h-3 text-[#FFD700]" />
                </div>
              ))}
              {player.achievements.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{player.achievements.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
