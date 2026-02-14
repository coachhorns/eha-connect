'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Undo2,
  Play,
  CheckCircle,
  AlertCircle,
  Users,
  ClipboardList,
} from 'lucide-react'
import { Button, Badge, Modal } from '@/components/ui'
import { useGameSync } from '@/hooks/useGameSync'

interface Player {
  id: string
  firstName: string
  lastName: string
  jerseyNumber?: string
  isActive?: boolean
}

interface Team {
  id: string
  name: string
  players: Player[]
}

interface Game {
  id: string
  homeTeam: Team
  awayTeam: Team
  homeScore: number
  awayScore: number
  status: string
  currentPeriod: number
  division?: string
  event?: { name: string }
  court?: string
}

interface StatAction {
  id: string
  statLogId?: string
  playerId: string
  playerName: string
  playerNumber: string
  teamId: string
  teamName: string
  statType: string
  value: number
  timestamp: Date
  synced: boolean
}

interface PlayerGameStats {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number
  fgMade: number
  fgAttempted: number
  fg3Made: number
  fg3Attempted: number
  ftMade: number
  ftAttempted: number
}

interface StatLogEntry {
  id: string
  playerId: string
  teamId: string
  statType: string
  value: number
  period: number
  createdAt: string
}

interface QueuedStat {
  localId: string
  gameId: string
  playerId: string
  teamId: string
  statType: string
  value: number
  period: number
}

const scoringButtons = [
  { type: 'PTS_2', label: '2PT', subLabel: 'Made', value: 2, color: 'bg-green-600 hover:bg-green-500 active:bg-green-700' },
  { type: 'PTS_3', label: '3PT', subLabel: 'Made', value: 3, color: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700' },
  { type: 'PTS_FT', label: 'FT', subLabel: 'Made', value: 1, color: 'bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700' },
  { type: 'FG_MISS', label: '2PT', subLabel: 'Miss', value: 0, color: 'bg-green-900 hover:bg-green-800 active:bg-green-950' },
  { type: 'FG3_MISS', label: '3PT', subLabel: 'Miss', value: 0, color: 'bg-blue-900 hover:bg-blue-800 active:bg-blue-950' },
  { type: 'FT_MISS', label: 'FT', subLabel: 'Miss', value: 0, color: 'bg-yellow-900 hover:bg-yellow-800 active:bg-yellow-950' },
]

const otherStatButtons = [
  { type: 'OREB', label: 'OREB', value: 1, color: 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700' },
  { type: 'DREB', label: 'DREB', value: 1, color: 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700' },
  { type: 'AST', label: 'AST', value: 1, color: 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700' },
  { type: 'STL', label: 'STL', value: 1, color: 'bg-teal-600 hover:bg-teal-500 active:bg-teal-700' },
  { type: 'BLK', label: 'BLK', value: 1, color: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700' },
  { type: 'TO', label: 'TO', value: 1, color: 'bg-orange-600 hover:bg-orange-500 active:bg-orange-700' },
  { type: 'FOUL', label: 'FOUL', value: 1, color: 'bg-red-700 hover:bg-red-600 active:bg-red-800' },
]


const AUTH_KEY = 'scorekeeper_auth'


export default function ScorekeeperGamePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const gameId = resolvedParams.id
  const router = useRouter()
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  const {
    game: syncedGame,
    stats: syncedStats,
    statLogs: syncedLogs,
    mutateStat,
    isOnline,
    isSyncing,
    isLoading: syncLoading
  } = useGameSync(gameId)

  // Keep local state for optimistic UI, but initialize from sync
  const [game, setGame] = useState<Game | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null)
  const [actionLog, setActionLog] = useState<StatAction[]>([])
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerGameStats>>({})
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [currentPeriod, setCurrentPeriod] = useState(1)
  const [gameStatus, setGameStatus] = useState('SCHEDULED')
  const [showBoxScore, setShowBoxScore] = useState(false)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'scoring' | 'stats'>('scoring')

  // Initialize/Update local state when hook data loads
  useEffect(() => {
    if (syncedGame) {
      setGame(syncedGame)
      setHomeScore(syncedGame.homeScore)
      setAwayScore(syncedGame.awayScore)
      setCurrentPeriod(syncedGame.currentPeriod || 1)
      setGameStatus(syncedGame.status)
    }
  }, [syncedGame])

  useEffect(() => {
    if (syncedStats) setPlayerStats(syncedStats)
  }, [syncedStats])

  useEffect(() => {
    if (syncedLogs && syncedGame) {
      // Convert stat logs to action log format
      const actions: StatAction[] = syncedLogs.map((log: any) => {
        const team = log.teamId === syncedGame.homeTeam.id ? syncedGame.homeTeam : syncedGame.awayTeam
        const player = team.players.find((p: Player) => p.id === log.playerId)
        return {
          id: `server-${log.id}`,
          statLogId: log.id,
          playerId: log.playerId,
          playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
          playerNumber: player?.jerseyNumber || '?',
          teamId: log.teamId,
          teamName: team.name,
          statType: log.statType,
          value: log.value,
          timestamp: new Date(log.createdAt),
          synced: true,
        }
      })
      setActionLog(actions)
    }
  }, [syncedLogs, syncedGame])

  // Stat-first workflow state
  const [pendingStat, setPendingStat] = useState<{
    statType: string
    value: number
    teamId: string
    teamSide: 'home' | 'away'
  } | null>(null)
  const [showPlayerSelectModal, setShowPlayerSelectModal] = useState(false)

  // Check sessionStorage auth and redirect if not authenticated
  useEffect(() => {
    const storedAuth = sessionStorage.getItem(AUTH_KEY)
    if (storedAuth !== 'true') {
      router.push('/scorekeeper')
    } else {
      setIsAuthChecked(true)
    }
  }, [router])

  const getPlayerStats = (playerId: string): PlayerGameStats => {
    return playerStats[playerId] || {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
      turnovers: 0, fouls: 0, fgMade: 0, fgAttempted: 0,
      fg3Made: 0, fg3Attempted: 0, ftMade: 0, ftAttempted: 0,
    }
  }

  const updatePlayerStats = (playerId: string, statType: string) => {
    setPlayerStats(prev => {
      const current = prev[playerId] || {
        points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
        turnovers: 0, fouls: 0, fgMade: 0, fgAttempted: 0,
        fg3Made: 0, fg3Attempted: 0, ftMade: 0, ftAttempted: 0,
      }

      const updated = { ...current }

      switch (statType) {
        case 'PTS_2':
          updated.points += 2
          updated.fgMade += 1
          updated.fgAttempted += 1
          break
        case 'PTS_3':
          updated.points += 3
          updated.fgMade += 1
          updated.fgAttempted += 1
          updated.fg3Made += 1
          updated.fg3Attempted += 1
          break
        case 'PTS_FT':
          updated.points += 1
          updated.ftMade += 1
          updated.ftAttempted += 1
          break
        case 'FG_MISS':
          updated.fgAttempted += 1
          break
        case 'FG3_MISS':
          updated.fgAttempted += 1
          updated.fg3Attempted += 1
          break
        case 'FT_MISS':
          updated.ftAttempted += 1
          break
        case 'OREB':
        case 'DREB':
          updated.rebounds += 1
          break
        case 'AST':
          updated.assists += 1
          break
        case 'STL':
          updated.steals += 1
          break
        case 'BLK':
          updated.blocks += 1
          break
        case 'TO':
          updated.turnovers += 1
          break
        case 'FOUL':
          updated.fouls += 1
          break
      }

      return { ...prev, [playerId]: updated }
    })
  }

  // Handle stat-first workflow: record stat with optimistic score update
  const handleStatFirstClick = useCallback((statType: string, value: number) => {
    if (!selectedTeam || !game) return

    const teamId = selectedTeam === 'home' ? game.homeTeam.id : game.awayTeam.id

    // Optimistically update score for point-based stats
    if (statType === 'PTS_2') {
      if (selectedTeam === 'home') setHomeScore(prev => prev + 2)
      else setAwayScore(prev => prev + 2)
    } else if (statType === 'PTS_3') {
      if (selectedTeam === 'home') setHomeScore(prev => prev + 3)
      else setAwayScore(prev => prev + 3)
    } else if (statType === 'PTS_FT') {
      if (selectedTeam === 'home') setHomeScore(prev => prev + 1)
      else setAwayScore(prev => prev + 1)
    }

    // Store pending stat and show player selection modal
    setPendingStat({
      statType,
      value,
      teamId,
      teamSide: selectedTeam,
    })
    setShowPlayerSelectModal(true)
  }, [selectedTeam, game])

  // Confirm stat with selected player (or null for team stat)
  const confirmStatWithPlayer = useCallback(async (playerId: string | null) => {
    if (!pendingStat || !game) return

    const teamName = pendingStat.teamSide === 'home' ? game.homeTeam.name : game.awayTeam.name
    const team = pendingStat.teamSide === 'home' ? game.homeTeam : game.awayTeam
    const player = playerId ? team.players.find(p => p.id === playerId) : null

    // Update local player stats if player selected
    if (playerId) {
      updatePlayerStats(playerId, pendingStat.statType)
    }

    // Create local action
    const action: StatAction = {
      id: `local-${Date.now()}`,
      playerId: playerId || 'team',
      playerName: player ? `${player.firstName} ${player.lastName}` : 'Team Stat',
      playerNumber: player?.jerseyNumber || '-',
      teamId: pendingStat.teamId,
      teamName,
      statType: pendingStat.statType,
      value: pendingStat.value,
      timestamp: new Date(),
      synced: false,
    }

    setActionLog(prev => [action, ...prev])

    // Close modal and clear pending stat
    setShowPlayerSelectModal(false)
    setPendingStat(null)

    // Use the hook's mutateStat for offline-first sync
    await mutateStat(pendingStat.statType, {
      gameId,
      playerId: playerId || null,
      teamId: pendingStat.teamId,
      statType: pendingStat.statType,
      value: pendingStat.value,
      period: currentPeriod,
    })
  }, [pendingStat, game, gameId, currentPeriod, mutateStat])

  // Cancel pending stat and revert score
  const cancelPendingStat = useCallback(() => {
    if (!pendingStat) return

    // Revert the optimistic score update
    if (pendingStat.statType === 'PTS_2') {
      if (pendingStat.teamSide === 'home') setHomeScore(prev => Math.max(0, prev - 2))
      else setAwayScore(prev => Math.max(0, prev - 2))
    } else if (pendingStat.statType === 'PTS_3') {
      if (pendingStat.teamSide === 'home') setHomeScore(prev => Math.max(0, prev - 3))
      else setAwayScore(prev => Math.max(0, prev - 3))
    } else if (pendingStat.statType === 'PTS_FT') {
      if (pendingStat.teamSide === 'home') setHomeScore(prev => Math.max(0, prev - 1))
      else setAwayScore(prev => Math.max(0, prev - 1))
    }

    setShowPlayerSelectModal(false)
    setPendingStat(null)
  }, [pendingStat])

  const recordStat = useCallback(async (statType: string, value: number) => {
    if (!selectedTeam || !game) return

    // If no player selected, use stat-first workflow
    if (!selectedPlayer) {
      handleStatFirstClick(statType, value)
      return
    }

    const teamId = selectedTeam === 'home' ? game.homeTeam.id : game.awayTeam.id
    const teamName = selectedTeam === 'home' ? game.homeTeam.name : game.awayTeam.name

    // Update local score immediately for points
    if (statType === 'PTS_2') {
      if (selectedTeam === 'home') setHomeScore(prev => prev + 2)
      else setAwayScore(prev => prev + 2)
    } else if (statType === 'PTS_3') {
      if (selectedTeam === 'home') setHomeScore(prev => prev + 3)
      else setAwayScore(prev => prev + 3)
    } else if (statType === 'PTS_FT') {
      if (selectedTeam === 'home') setHomeScore(prev => prev + 1)
      else setAwayScore(prev => prev + 1)
    }

    // Update local player stats
    updatePlayerStats(selectedPlayer.id, statType)

    // Create local action
    const action: StatAction = {
      id: `local-${Date.now()}`,
      playerId: selectedPlayer.id,
      playerName: `${selectedPlayer.firstName} ${selectedPlayer.lastName}`,
      playerNumber: selectedPlayer.jerseyNumber || '?',
      teamId,
      teamName,
      statType,
      value,
      timestamp: new Date(),
      synced: false,
    }

    setActionLog(prev => [action, ...prev])

    // Use the hook's mutateStat for offline-first sync
    await mutateStat(statType, {
      gameId,
      playerId: selectedPlayer.id,
      teamId,
      statType,
      value,
      period: currentPeriod,
    })
  }, [selectedPlayer, selectedTeam, game, gameId, currentPeriod, handleStatFirstClick, mutateStat])

  const reversePlayerStats = (playerId: string, statType: string) => {
    setPlayerStats(prev => {
      const current = prev[playerId]
      if (!current) return prev

      const updated = { ...current }

      switch (statType) {
        case 'PTS_2':
          updated.points = Math.max(0, updated.points - 2)
          updated.fgMade = Math.max(0, updated.fgMade - 1)
          updated.fgAttempted = Math.max(0, updated.fgAttempted - 1)
          break
        case 'PTS_3':
          updated.points = Math.max(0, updated.points - 3)
          updated.fgMade = Math.max(0, updated.fgMade - 1)
          updated.fgAttempted = Math.max(0, updated.fgAttempted - 1)
          updated.fg3Made = Math.max(0, updated.fg3Made - 1)
          updated.fg3Attempted = Math.max(0, updated.fg3Attempted - 1)
          break
        case 'PTS_FT':
          updated.points = Math.max(0, updated.points - 1)
          updated.ftMade = Math.max(0, updated.ftMade - 1)
          updated.ftAttempted = Math.max(0, updated.ftAttempted - 1)
          break
        case 'FG_MISS':
          updated.fgAttempted = Math.max(0, updated.fgAttempted - 1)
          break
        case 'FG3_MISS':
          updated.fgAttempted = Math.max(0, updated.fgAttempted - 1)
          updated.fg3Attempted = Math.max(0, updated.fg3Attempted - 1)
          break
        case 'FT_MISS':
          updated.ftAttempted = Math.max(0, updated.ftAttempted - 1)
          break
        case 'OREB':
        case 'DREB':
          updated.rebounds = Math.max(0, updated.rebounds - 1)
          break
        case 'AST':
          updated.assists = Math.max(0, updated.assists - 1)
          break
        case 'STL':
          updated.steals = Math.max(0, updated.steals - 1)
          break
        case 'BLK':
          updated.blocks = Math.max(0, updated.blocks - 1)
          break
        case 'TO':
          updated.turnovers = Math.max(0, updated.turnovers - 1)
          break
        case 'FOUL':
          updated.fouls = Math.max(0, updated.fouls - 1)
          break
      }

      return { ...prev, [playerId]: updated }
    })
  }

  const undoLastAction = useCallback(async () => {
    if (actionLog.length === 0) return

    const lastAction = actionLog[0]

    // Reverse local score for points
    if (lastAction.statType === 'PTS_2') {
      if (lastAction.teamId === game?.homeTeam.id) setHomeScore(prev => Math.max(0, prev - 2))
      else setAwayScore(prev => Math.max(0, prev - 2))
    } else if (lastAction.statType === 'PTS_3') {
      if (lastAction.teamId === game?.homeTeam.id) setHomeScore(prev => Math.max(0, prev - 3))
      else setAwayScore(prev => Math.max(0, prev - 3))
    } else if (lastAction.statType === 'PTS_FT') {
      if (lastAction.teamId === game?.homeTeam.id) setHomeScore(prev => Math.max(0, prev - 1))
      else setAwayScore(prev => Math.max(0, prev - 1))
    }

    // Reverse player stats locally
    reversePlayerStats(lastAction.playerId, lastAction.statType)

    setActionLog(prev => prev.slice(1))

    // Sync undo to server if we have a statLogId
    if (isOnline && lastAction.statLogId) {
      try {
        await fetch('/api/scorekeeper/stats/undo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statLogId: lastAction.statLogId,
            gameId,
          }),
        })
      } catch (error) {
        console.error('Error syncing undo:', error)
      }
    }
  }, [actionLog, game, gameId, isOnline])

  const updateGameStatus = async (status: string) => {
    setGameStatus(status)
    if (isOnline) {
      await fetch(`/api/scorekeeper/games/${gameId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, homeScore, awayScore }),
      })
    }
  }

  const startGame = () => updateGameStatus('IN_PROGRESS')

  const advancePeriod = async () => {
    const nextPeriod = currentPeriod + 1
    setCurrentPeriod(nextPeriod)
    if (isOnline) {
      await fetch(`/api/scorekeeper/games/${gameId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPeriod: nextPeriod }),
      })
    }
  }

  const endGame = async () => {
    await updateGameStatus('FINAL')
    setShowEndGameModal(false)
  }

  const getStatLabel = (type: string): string => {
    const labels: Record<string, string> = {
      PTS_2: '+2 PTS',
      PTS_3: '+3 PTS',
      PTS_FT: '+1 FT',
      FG_MISS: '2PT Miss',
      FG3_MISS: '3PT Miss',
      FT_MISS: 'FT Miss',
      OREB: 'O-Reb',
      DREB: 'D-Reb',
      AST: 'Assist',
      STL: 'Steal',
      BLK: 'Block',
      TO: 'Turnover',
      FOUL: 'Foul',
    }
    return labels[type] || type
  }

  if (!isAuthChecked || syncLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-3 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-muted text-lg mb-4">Game not found</p>
          <Link href="/scorekeeper">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const renderPlayerButton = (player: Player, team: 'home' | 'away') => {
    const isSelected = selectedPlayer?.id === player.id && selectedTeam === team
    const stats = getPlayerStats(player.id)

    return (
      <button
        key={player.id}
        onClick={() => {
          setSelectedPlayer(player)
          setSelectedTeam(team)
        }}
        className={`relative p-4 min-h-20 rounded-xl text-left transition-all touch-manipulation ${isSelected
            ? 'bg-eha-red text-white ring-2 ring-eha-red ring-offset-2 ring-offset-dark-base'
            : 'bg-input-bg border border-eha-silver/20 text-text-secondary hover:border-eha-silver/40 active:bg-eha-navy/30'
          }`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-eha-red'}`}>
            #{player.jerseyNumber || '?'}
          </span>
          <span className="font-medium text-lg truncate">
            {player.firstName[0]}. {player.lastName}
          </span>
        </div>
        {stats.points > 0 && (
          <div className={`text-xs mt-1 font-stats ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
            {stats.points} pts
            {stats.rebounds > 0 && ` • ${stats.rebounds} reb`}
            {stats.assists > 0 && ` • ${stats.assists} ast`}
          </div>
        )}
        {stats.fouls > 0 && (
          <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${stats.fouls >= 5 ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
            }`}>
            {stats.fouls}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="min-h-screen select-none">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-eha-navy/95 backdrop-blur-md border-b border-border-default">
        <div className="max-w-[1600px] mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/scorekeeper">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <p className="text-xs text-text-muted">
                  {game.event?.name} {game.court && `• ${game.court}`}
                </p>
                <div className="flex items-center gap-2">
                  {gameStatus === 'IN_PROGRESS' ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Q{currentPeriod}
                    </Badge>
                  ) : gameStatus === 'FINAL' ? (
                    <Badge>FINAL</Badge>
                  ) : (
                    <Badge variant="warning">NOT STARTED</Badge>
                  )}
                  {!isOnline && (
                    <Badge variant="error" className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      OFFLINE
                    </Badge>
                  )}
                  {isSyncing && (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                      SYNCING...
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBoxScore(true)}
                className="flex items-center gap-1"
              >
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Box Score</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={undoLastAction}
                disabled={actionLog.length === 0}
                className="flex items-center gap-1"
              >
                <Undo2 className="w-4 h-4" />
                <span className="hidden sm:inline">Undo</span>
              </Button>
              {gameStatus === 'SCHEDULED' && (
                <Button size="sm" onClick={startGame}>
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </Button>
              )}
              {gameStatus === 'IN_PROGRESS' && (
                <>
                  <Button variant="secondary" size="sm" onClick={advancePeriod}>
                    End Q{currentPeriod}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setShowEndGameModal(true)}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Final
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-4">
        {/* Scoreboard */}
        <div className="flex items-stretch justify-center gap-4 mb-6">
          {/* Away Team Score */}
          <div
            onClick={() => {
              setSelectedTeam('away')
              setSelectedPlayer(null)
            }}
            className={`flex-1 max-w-xs cursor-pointer rounded-2xl p-4 transition-all ${selectedTeam === 'away'
                ? 'bg-gradient-to-br from-eha-red/30 to-eha-red/10 ring-2 ring-eha-red'
                : 'bg-input-bg border border-eha-silver/20 hover:border-eha-silver/40'
              }`}
          >
            <p className="text-base font-medium text-text-muted text-center truncate">{game.awayTeam.name}</p>
            <p className="text-8xl font-bold font-stats text-text-primary text-center mt-2">{awayScore}</p>
          </div>

          {/* VS / Period */}
          <div className="flex flex-col items-center justify-center px-4">
            <p className="text-2xl font-bold text-gray-600">VS</p>
            {game.division && <Badge className="mt-2">{game.division}</Badge>}
          </div>

          {/* Home Team Score */}
          <div
            onClick={() => {
              setSelectedTeam('home')
              setSelectedPlayer(null)
            }}
            className={`flex-1 max-w-xs cursor-pointer rounded-2xl p-4 transition-all ${selectedTeam === 'home'
                ? 'bg-gradient-to-br from-eha-red/30 to-eha-red/10 ring-2 ring-eha-red'
                : 'bg-input-bg border border-eha-silver/20 hover:border-eha-silver/40'
              }`}
          >
            <p className="text-base font-medium text-text-muted text-center truncate">{game.homeTeam.name}</p>
            <p className="text-8xl font-bold font-stats text-text-primary text-center mt-2">{homeScore}</p>
          </div>
        </div>

        {/* Main Interface Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Away Team Roster */}
          <div className="col-span-3">
            <div className="bg-input-bg rounded-xl p-3 border border-eha-silver/20">
              <h3 className="font-semibold text-text-primary mb-3 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                {game.awayTeam.name}
              </h3>
              <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
                {game.awayTeam.players.map(player => renderPlayerButton(player, 'away'))}
                {game.awayTeam.players.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-4">No players on roster</p>
                )}
              </div>
            </div>
          </div>

          {/* Stat Buttons - Center */}
          <div className="col-span-6">
            <div className="bg-input-bg rounded-xl p-4 border border-eha-silver/20">
              {/* Selected Player Display */}
              <div className="text-center mb-4">
                {selectedPlayer ? (
                  <div className="bg-eha-red/20 rounded-lg py-2 px-4 inline-block">
                    <span className="text-eha-red font-bold text-lg">
                      #{selectedPlayer.jerseyNumber || '?'} {selectedPlayer.firstName} {selectedPlayer.lastName}
                    </span>
                    <span className="text-text-muted ml-2">
                      ({selectedTeam === 'home' ? game.homeTeam.name : game.awayTeam.name})
                    </span>
                  </div>
                ) : selectedTeam ? (
                  <div className="bg-eha-navy/50 rounded-lg py-2 px-4 inline-block">
                    <span className="text-text-secondary font-medium">
                      {selectedTeam === 'home' ? game.homeTeam.name : game.awayTeam.name}
                    </span>
                    <span className="text-text-muted ml-2 text-sm">
                      (tap stat to assign player)
                    </span>
                  </div>
                ) : (
                  <p className="text-text-muted">Select a team to record stats</p>
                )}
              </div>

              {/* Tab Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('scoring')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'scoring'
                      ? 'bg-eha-red text-white'
                      : 'bg-eha-navy/50 text-text-muted hover:text-text-primary'
                    }`}
                >
                  Scoring
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'stats'
                      ? 'bg-eha-red text-white'
                      : 'bg-eha-navy/50 text-text-muted hover:text-text-primary'
                    }`}
                >
                  Other Stats
                </button>
              </div>

              {/* Stat Buttons - Large touch targets for tablet */}
              {activeTab === 'scoring' ? (
                <div className="grid grid-cols-3 gap-3">
                  {scoringButtons.map(btn => (
                    <button
                      key={btn.type}
                      onClick={() => recordStat(btn.type, btn.value)}
                      disabled={!selectedTeam || gameStatus !== 'IN_PROGRESS'}
                      className={`${btn.color} text-white rounded-xl min-h-24 p-4 transition-all touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed active:scale-95`}
                    >
                      <div className="text-3xl font-bold">{btn.label}</div>
                      <div className="text-base opacity-80">{btn.subLabel}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {otherStatButtons.map(btn => (
                    <button
                      key={btn.type}
                      onClick={() => recordStat(btn.type, btn.value)}
                      disabled={!selectedTeam || gameStatus !== 'IN_PROGRESS'}
                      className={`${btn.color} text-white rounded-xl min-h-20 min-w-[72px] p-4 transition-all touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed active:scale-95`}
                    >
                      <div className="text-2xl font-bold">{btn.label}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Actions */}
              <div className="mt-4 pt-4 border-t border-eha-silver/20">
                <p className="text-xs text-text-muted mb-2">Recent Actions</p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {actionLog.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-2">No actions yet</p>
                  ) : (
                    actionLog.slice(0, 5).map(action => (
                      <div
                        key={action.id}
                        className="flex items-center justify-between text-sm p-2 bg-eha-navy/30 rounded-lg"
                      >
                        <span className="text-text-secondary">
                          <span className="text-eha-red font-medium">#{action.playerNumber}</span>
                          {' '}{getStatLabel(action.statType)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted text-xs">{action.teamName}</span>
                          {action.synced ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Home Team Roster */}
          <div className="col-span-3">
            <div className="bg-input-bg rounded-xl p-3 border border-eha-silver/20">
              <h3 className="font-semibold text-text-primary mb-3 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                {game.homeTeam.name}
              </h3>
              <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
                {game.homeTeam.players.map(player => renderPlayerButton(player, 'home'))}
                {game.homeTeam.players.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-4">No players on roster</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Box Score Modal */}
      <Modal
        isOpen={showBoxScore}
        onClose={() => setShowBoxScore(false)}
        title="Box Score"
        size="xl"
      >
        <div className="space-y-6">
          {/* Away Team */}
          <div>
            <h3 className="font-semibold text-text-primary mb-2">{game.awayTeam.name} - {awayScore}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-eha-silver/20">
                    <th className="text-left py-2 px-2">Player</th>
                    <th className="text-center py-2 px-1">PTS</th>
                    <th className="text-center py-2 px-1">REB</th>
                    <th className="text-center py-2 px-1">AST</th>
                    <th className="text-center py-2 px-1">STL</th>
                    <th className="text-center py-2 px-1">BLK</th>
                    <th className="text-center py-2 px-1">TO</th>
                    <th className="text-center py-2 px-1">PF</th>
                    <th className="text-center py-2 px-1">FG</th>
                    <th className="text-center py-2 px-1">3PT</th>
                    <th className="text-center py-2 px-1">FT</th>
                  </tr>
                </thead>
                <tbody>
                  {game.awayTeam.players.map(player => {
                    const stats = getPlayerStats(player.id)
                    return (
                      <tr key={player.id} className="border-b border-eha-silver/20/50">
                        <td className="py-2 px-2 text-text-primary">
                          #{player.jerseyNumber} {player.firstName[0]}. {player.lastName}
                        </td>
                        <td className="text-center py-2 px-1 text-text-primary font-medium">{stats.points}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.rebounds}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.assists}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.steals}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.blocks}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.turnovers}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.fouls}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.fgMade}-{stats.fgAttempted}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.fg3Made}-{stats.fg3Attempted}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.ftMade}-{stats.ftAttempted}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Home Team */}
          <div>
            <h3 className="font-semibold text-text-primary mb-2">{game.homeTeam.name} - {homeScore}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-eha-silver/20">
                    <th className="text-left py-2 px-2">Player</th>
                    <th className="text-center py-2 px-1">PTS</th>
                    <th className="text-center py-2 px-1">REB</th>
                    <th className="text-center py-2 px-1">AST</th>
                    <th className="text-center py-2 px-1">STL</th>
                    <th className="text-center py-2 px-1">BLK</th>
                    <th className="text-center py-2 px-1">TO</th>
                    <th className="text-center py-2 px-1">PF</th>
                    <th className="text-center py-2 px-1">FG</th>
                    <th className="text-center py-2 px-1">3PT</th>
                    <th className="text-center py-2 px-1">FT</th>
                  </tr>
                </thead>
                <tbody>
                  {game.homeTeam.players.map(player => {
                    const stats = getPlayerStats(player.id)
                    return (
                      <tr key={player.id} className="border-b border-eha-silver/20/50">
                        <td className="py-2 px-2 text-text-primary">
                          #{player.jerseyNumber} {player.firstName[0]}. {player.lastName}
                        </td>
                        <td className="text-center py-2 px-1 text-text-primary font-medium">{stats.points}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.rebounds}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.assists}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.steals}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.blocks}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.turnovers}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.fouls}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.fgMade}-{stats.fgAttempted}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.fg3Made}-{stats.fg3Attempted}</td>
                        <td className="text-center py-2 px-1 text-text-muted">{stats.ftMade}-{stats.ftAttempted}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* End Game Confirmation Modal */}
      <Modal
        isOpen={showEndGameModal}
        onClose={() => setShowEndGameModal(false)}
        title="End Game"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to finalize this game?
          </p>
          <div className="bg-eha-navy/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="text-sm text-text-muted">{game.awayTeam.name}</p>
                <p className="text-3xl font-bold text-text-primary">{awayScore}</p>
              </div>
              <div className="text-text-muted">-</div>
              <div>
                <p className="text-sm text-text-muted">{game.homeTeam.name}</p>
                <p className="text-3xl font-bold text-text-primary">{homeScore}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowEndGameModal(false)}>
              Cancel
            </Button>
            <Button onClick={endGame}>
              Confirm Final Score
            </Button>
          </div>
        </div>
      </Modal>

      {/* Player Selection Modal (Stat-First Workflow) */}
      <Modal
        isOpen={showPlayerSelectModal}
        onClose={cancelPendingStat}
        title={`Assign ${pendingStat ? getStatLabel(pendingStat.statType) : 'Stat'}`}
      >
        <div className="space-y-4">
          <p className="text-text-muted text-sm">
            Select the player who made this play, or choose &quot;Team Stat&quot; if unknown.
          </p>

          {/* Roster Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {pendingStat && (pendingStat.teamSide === 'home' ? game.homeTeam : game.awayTeam).players.map(player => (
              <button
                key={player.id}
                onClick={() => confirmStatWithPlayer(player.id)}
                className="p-3 bg-eha-navy/50 hover:bg-eha-red/20 rounded-lg text-left transition-colors border border-transparent hover:border-eha-red"
              >
                <div className="flex items-center gap-2">
                  <span className="text-eha-red font-bold">
                    #{player.jerseyNumber || '?'}
                  </span>
                  <span className="text-text-primary font-medium truncate">
                    {player.firstName[0]}. {player.lastName}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-eha-silver/20">
            <Button
              variant="secondary"
              onClick={() => confirmStatWithPlayer(null)}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              Team Stat / Unknown
            </Button>
            <Button
              variant="ghost"
              onClick={cancelPendingStat}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
