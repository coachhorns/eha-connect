'use client'

import { Modal, Avatar, Badge } from '@/components/ui'
import { formatPosition } from '@/lib/utils'

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
  graduationYear?: number | null
  isVerified: boolean
  teamRosters?: { team: { name: string; division?: string | null } }[]
  careerStats?: {
    gamesPlayed: number
    ppg: number
    rpg: number
    apg: number
    spg?: number
    bpg?: number
    threePM?: number
  } | null
}

interface CompareModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
}

function getBestIndex(values: (number | null)[]): number | null {
  let bestIdx: number | null = null
  let bestVal = -Infinity
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v !== null && v > bestVal) {
      bestVal = v
      bestIdx = i
    }
  }
  return bestVal > 0 ? bestIdx : null
}

function StatRow({ label, values, format = 'number' }: {
  label: string
  values: (number | null)[]
  format?: 'number' | 'height'
}) {
  const bestIdx = getBestIndex(values)

  return (
    <div className="grid items-center border-b border-border-subtle" style={{ gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}>
      <div className="px-4 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-widest">
        {label}
      </div>
      {values.map((val, i) => (
        <div
          key={i}
          className={`px-4 py-3.5 text-center font-stats text-sm font-bold ${
            bestIdx === i ? 'text-eha-red' : 'text-text-primary'
          }`}
        >
          {val !== null && val !== undefined
            ? format === 'height'
              ? `${Math.floor(val / 12)}'${val % 12}"`
              : val % 1 === 0
                ? val
                : val.toFixed(1)
            : '—'}
        </div>
      ))}
    </div>
  )
}

export function CompareModal({ isOpen, onClose, players }: CompareModalProps) {
  if (players.length < 2) return null

  const heightInInches = (p: Player): number | null => {
    if (p.heightFeet == null) return null
    return p.heightFeet * 12 + (p.heightInches || 0)
  }

  const stats: { label: string; values: (number | null)[]; format?: 'number' | 'height' }[] = [
    { label: 'Games Played', values: players.map(p => p.careerStats?.gamesPlayed ?? null) },
    { label: 'PPG', values: players.map(p => p.careerStats?.ppg ?? null) },
    { label: 'RPG', values: players.map(p => p.careerStats?.rpg ?? null) },
    { label: 'APG', values: players.map(p => p.careerStats?.apg ?? null) },
    { label: 'SPG', values: players.map(p => p.careerStats?.spg ?? null) },
    { label: 'BPG', values: players.map(p => p.careerStats?.bpg ?? null) },
    { label: '3PM (Total)', values: players.map(p => p.careerStats?.threePM ?? null) },
    { label: 'Height', values: players.map(p => heightInInches(p)), format: 'height' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare Players" size="xl">
      <div className="overflow-x-auto -mx-6 px-6">
        {/* Player Headers */}
        <div
          className="grid items-start border-b border-border-default pb-6 mb-2"
          style={{ gridTemplateColumns: `140px repeat(${players.length}, 1fr)` }}
        >
          <div />
          {players.map(p => (
            <div key={p.id} className="flex flex-col items-center text-center px-2">
              <Avatar
                src={p.profilePhoto}
                fallback={`${p.firstName} ${p.lastName}`}
                size="lg"
              />
              <h3 className="mt-3 text-sm font-bold text-text-primary font-heading leading-tight">
                {p.firstName} {p.lastName}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                {p.primaryPosition && (
                  <Badge variant="default" size="sm">
                    {formatPosition(p.primaryPosition)}
                  </Badge>
                )}
                {p.graduationYear && (
                  <span className="text-[10px] font-bold text-text-muted">{p.graduationYear}</span>
                )}
              </div>
              <p className="text-[10px] text-text-muted mt-1 leading-tight">
                {p.school || 'School TBD'}
              </p>
              {p.teamRosters?.[0]?.team && (
                <p className="text-[10px] text-text-muted mt-0.5">
                  {p.teamRosters[0].team.name}
                  {p.teamRosters[0].team.division ? ` (${p.teamRosters[0].team.division})` : ''}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Stat Rows */}
        <div>
          {stats.map(stat => (
            <StatRow
              key={stat.label}
              label={stat.label}
              values={stat.values}
              format={stat.format}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}
