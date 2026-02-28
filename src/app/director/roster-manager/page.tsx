'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronRight,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui'

interface RosterPlayer {
  playerId: string
  slug: string
  firstName: string
  lastName: string
  jerseyNumber: string | null
  graduationYear: number | null
  profilePhoto: string | null
  primaryPosition: string | null
}

interface Team {
  id: string
  slug: string
  name: string
  division: string | null
  coachName: string | null
  wins: number
  losses: number
  rosterCount: number
  roster: RosterPlayer[]
}

interface Program {
  id: string
  slug: string
  name: string
  logo: string | null
  city: string | null
  state: string | null
  teams: Team[]
  totalWins: number
  totalLosses: number
}

export default function RosterManagerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [program, setProgram] = useState<Program | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Selection state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [targetTeamId, setTargetTeamId] = useState('')

  // Move state
  const [isConfirming, setIsConfirming] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [recentlyMoved, setRecentlyMoved] = useState<Set<string>>(new Set())

  // Mobile collapsed teams
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/director/roster-manager')
      return
    }

    if (status === 'authenticated' && session?.user.role !== 'PROGRAM_DIRECTOR') {
      router.push('/')
      return
    }

    if (status === 'authenticated' && session?.user.role === 'PROGRAM_DIRECTOR') {
      fetchProgram()
    }
  }, [status, session, router])

  const fetchProgram = async () => {
    try {
      const res = await fetch('/api/director/program')
      const data = await res.json()

      if (res.ok) {
        if (!data.program) {
          router.push('/director/onboarding')
          return
        }
        setProgram(data.program)
      } else {
        setError(data.error || 'Failed to fetch program')
      }
    } catch (err) {
      console.error('Error fetching program:', err)
      setError('Failed to fetch program')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
    setIsConfirming(false)
  }

  const toggleTeam = (team: Team) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev)
      const teamPlayerIds = team.roster.map((p) => p.playerId)
      const allSelected = teamPlayerIds.every((id) => next.has(id))

      if (allSelected) {
        teamPlayerIds.forEach((id) => next.delete(id))
      } else {
        teamPlayerIds.forEach((id) => next.add(id))
      }
      return next
    })
    setIsConfirming(false)
  }

  const toggleCollapsed = (teamId: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedPlayerIds(new Set())
    setTargetTeamId('')
    setIsConfirming(false)
  }

  const handleMoveClick = () => {
    if (!targetTeamId || selectedPlayerIds.size === 0) return
    setIsConfirming(true)
  }

  const handleConfirmMove = async () => {
    if (!targetTeamId || selectedPlayerIds.size === 0) return

    setIsMoving(true)
    try {
      const res = await fetch('/api/director/roster-manager/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: Array.from(selectedPlayerIds),
          targetTeamId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        const targetTeam = program?.teams.find((t) => t.id === targetTeamId)
        const movedIds = new Set(selectedPlayerIds)
        setRecentlyMoved(movedIds)
        setTimeout(() => setRecentlyMoved(new Set()), 2000)

        setFeedback({
          type: 'success',
          message: `Moved ${data.moved} player${data.moved !== 1 ? 's' : ''} to ${targetTeam?.name || 'team'}${data.skipped > 0 ? ` (${data.skipped} already on roster)` : ''}`,
        })
        setTimeout(() => setFeedback(null), 3000)

        clearSelection()
        await fetchProgram()
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to move players',
        })
        setTimeout(() => setFeedback(null), 5000)
      }
    } catch (err) {
      console.error('Move error:', err)
      setFeedback({
        type: 'error',
        message: 'Failed to move players',
      })
      setTimeout(() => setFeedback(null), 5000)
    } finally {
      setIsMoving(false)
      setIsConfirming(false)
    }
  }

  // Extract age number from team name or division (e.g. "17U" → 17, "EPL 15" → 15)
  const getAgeGroup = (team: Team): number => {
    const text = `${team.division || ''} ${team.name || ''}`
    const match = text.match(/(\d{2})U?\b/i)
    return match ? parseInt(match[1], 10) : 0
  }

  const getSortedTeams = (teams: Team[]): Team[] => {
    return [...teams].sort((a, b) => {
      const ageDiff = getAgeGroup(b) - getAgeGroup(a)
      if (ageDiff !== 0) return ageDiff
      return (a.name || '').localeCompare(b.name || '')
    })
  }

  // Get target team options (exclude teams where ALL selected players are already on)
  const getTargetTeamOptions = () => {
    if (!program) return []
    return getSortedTeams(program.teams.filter((team) => {
      const teamPlayerIds = new Set(team.roster.map((p) => p.playerId))
      const allSelectedOnThisTeam = Array.from(selectedPlayerIds).every((id) =>
        teamPlayerIds.has(id)
      )
      return !allSelectedOnThisTeam
    }))
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8 relative z-10">
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-6">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!program) {
    return null
  }

  if (program.teams.length < 2) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8 relative z-10">
          <Link
            href="/director/dashboard"
            className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-surface-overlay rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ArrowLeftRight className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
              Need at Least 2 Teams
            </h3>
            <p className="text-text-muted mb-6 max-w-md mx-auto">
              Roster Manager lets you move players between teams. Create another team to get started.
            </p>
            <Link href={`/director/teams/new?programId=${program.id}`}>
              <Button className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25">
                Create a Team
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const targetTeamOptions = getTargetTeamOptions()
  const targetTeam = program.teams.find((t) => t.id === targetTeamId)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E31837] blur-[180px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 blur-[150px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-32 relative z-10">
        {/* Back Link */}
        <Link
          href="/director/dashboard"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary tracking-tight flex items-center gap-3">
            <ArrowLeftRight className="w-8 h-8 text-[#E31837]" />
            Roster Manager
          </h1>
          <p className="text-text-muted mt-2">
            Select players and move them between teams
          </p>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl border flex items-center justify-between transition-all ${
              feedback.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}
          >
            <span className="text-sm font-medium">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 hover:bg-surface-overlay rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Team Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {getSortedTeams(program.teams).map((team) => {
            const teamPlayerIds = team.roster.map((p) => p.playerId)
            const allSelected =
              teamPlayerIds.length > 0 &&
              teamPlayerIds.every((id) => selectedPlayerIds.has(id))
            const someSelected = teamPlayerIds.some((id) =>
              selectedPlayerIds.has(id)
            )
            const isCollapsed = collapsedTeams.has(team.id)

            return (
              <div
                key={team.id}
                className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl overflow-hidden"
              >
                {/* Team Header */}
                <div className="p-4 border-b border-border-default flex items-center gap-3">
                  {/* Select all checkbox */}
                  {team.roster.length > 0 && (
                    <button
                      onClick={() => toggleTeam(team)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        allSelected
                          ? 'bg-[#E31837] border-[#E31837]'
                          : someSelected
                            ? 'bg-[#E31837]/40 border-[#E31837]'
                            : 'border-border-default hover:border-white/40'
                      }`}
                    >
                      {(allSelected || someSelected) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  )}

                  {/* Team name - clickable on mobile to collapse */}
                  <button
                    onClick={() => toggleCollapsed(team.id)}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left md:cursor-default"
                  >
                    <h3 className="font-semibold text-text-primary text-sm truncate">
                      {team.name}
                    </h3>
                    <span className="text-xs text-text-muted shrink-0">
                      ({team.roster.length})
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-text-muted md:hidden shrink-0 transition-transform ${
                        isCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Player List */}
                {!isCollapsed && (
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-border-subtle">
                    {team.roster.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-text-muted">No players</p>
                      </div>
                    ) : (
                      team.roster.map((player) => {
                        const isSelected = selectedPlayerIds.has(player.playerId)
                        const isRecentlyMoved = recentlyMoved.has(player.playerId)

                        return (
                          <button
                            key={player.playerId}
                            onClick={() => togglePlayer(player.playerId)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-300 ${
                              isRecentlyMoved
                                ? 'bg-green-500/10'
                                : isSelected
                                  ? 'bg-[#E31837]/5'
                                  : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-[#E31837] border-[#E31837]'
                                  : 'border-border-default'
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {player.firstName} {player.lastName}
                                {player.jerseyNumber && (
                                  <span className="text-text-muted font-mono text-xs ml-1.5">
                                    #{player.jerseyNumber}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-text-muted truncate">
                                {[
                                  player.primaryPosition,
                                  player.graduationYear
                                    ? `Class of ${player.graduationYear}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' \u2022 ')}
                              </p>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky Action Bar */}
      {selectedPlayerIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-page-bg/95 backdrop-blur-xl border-t border-border-default z-50">
          <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-4">
            {!isConfirming ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Left: Selection info */}
                <div className="flex items-center gap-3 flex-1">
                  <span className="bg-[#E31837] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {selectedPlayerIds.size}
                  </span>
                  <span className="text-sm text-text-secondary">
                    player{selectedPlayerIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors underline"
                  >
                    Clear
                  </button>
                </div>

                {/* Right: Target dropdown + Move button */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <select
                      value={targetTeamId}
                      onChange={(e) => {
                        setTargetTeamId(e.target.value)
                        setIsConfirming(false)
                      }}
                      className="appearance-none w-full sm:w-auto bg-surface-glass border border-border-default text-text-primary pl-4 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-page-bg-alt">
                        Move to...
                      </option>
                      {targetTeamOptions.map((team) => (
                        <option
                          key={team.id}
                          value={team.id}
                          className="bg-page-bg-alt"
                        >
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                  <Button
                    onClick={handleMoveClick}
                    disabled={!targetTeamId}
                    className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Move
                  </Button>
                </div>
              </div>
            ) : (
              /* Confirmation state */
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <p className="text-sm text-text-primary flex-1">
                  Move{' '}
                  <span className="font-bold">
                    {selectedPlayerIds.size} player
                    {selectedPlayerIds.size !== 1 ? 's' : ''}
                  </span>{' '}
                  to{' '}
                  <span className="font-bold text-[#E31837]">
                    {targetTeam?.name}
                  </span>
                  ?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsConfirming(false)}
                    className="px-4 py-2.5 text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleConfirmMove}
                    disabled={isMoving}
                    isLoading={isMoving}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-lg"
                  >
                    Confirm Move
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
