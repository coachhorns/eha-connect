'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
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
  ageGroup?: string
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

export default function ScorekeeperGamePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const gameId = resolvedParams.id
  const { status: authStatus } = useSession()
  const router = useRouter()

  const [game, setGame] = useState<Game | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null)
  const [actionLog, setActionLog] = useState<StatAction[]>([])
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerGameStats>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [currentPeriod, setCurrentPeriod] = useState(1)
  const [gameStatus, setGameStatus] = useState('SCHEDULED')
  const [showBoxScore, setShowBoxScore] = useState(false)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'scoring' | 'stats'>('scoring')
  const [retryQueue, setRetryQueue] = useState<QueuedStat[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Process retry queue when coming back online
  useEffect(() => {
    if (!isOnline || retryQueue.length === 0 || isSyncing) return

    const processQueue = async () => {
      setIsSyncing(true)
      const queue = [...retryQueue]
      const successfulIds: string[] = []

      for (const stat of queue) {
        try {
          const res = await fetch('/api/scorekeeper/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: stat.gameId,
              playerId: stat.playerId,
              teamId: stat.teamId,
              statType: stat.statType,
              value: stat.value,
              period: stat.period,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            successfulIds.push(stat.localId)
            // Update action log to mark as synced
            setActionLog(prev =>
              prev.map(a => a.id === stat.localId ? { ...a, synced: true, statLogId: data.statLog?.id } : a)
            )
          }
        } catch (error) {
          console.error('Error syncing queued stat:', error)
          // Stop processing on error, will retry when online again
          break
        }
      }

      // Remove successfully synced items from queue
      if (successfulIds.length > 0) {
        setRetryQueue(prev => prev.filter(s => !successfulIds.includes(s.localId)))
      }
      setIsSyncing(false)
    }

    processQueue()
  }, [isOnline, retryQueue, isSyncing])

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/scorekeeper')
    }
  }, [authStatus, router])

  const fetchGame = useCallback(async () => {
    try {
      const [gameRes, statsRes] = await Promise.all([
        fetch(`/api/scorekeeper/games/${gameId}`),
        fetch(`/api/scorekeeper/games/${gameId}/stats`),
      ])

      const gameData = await gameRes.json()
      if (gameData.game) {
        setGame(gameData.game)
        setHomeScore(gameData.game.homeScore)
        setAwayScore(gameData.game.awayScore)
        setCurrentPeriod(gameData.game.currentPeriod || 1)
        setGameStatus(gameData.game.status)
      }

      const statsData = await statsRes.json()
      if (statsData.stats) {
        setPlayerStats(statsData.stats)
      }
      if (statsData.statLogs && gameData.game) {
        // Convert stat logs to action log format
        const actions: StatAction[] = statsData.statLogs.map((log: StatLogEntry) => {
          const team = log.teamId === gameData.game.homeTeam.id ? gameData.game.homeTeam : gameData.game.awayTeam
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
    } catch (error) {
      console.error('Error fetching game:', error)
    } finally {
      setIsLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    if (gameId) {
      fetchGame()
    }
  }, [gameId, fetchGame])

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

  const recordStat = useCallback(async (statType: string, value: number) => {
    if (!selectedPlayer || !selectedTeam || !game) return

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

    // Create queued stat object
    const queuedStat: QueuedStat = {
      localId: action.id,
      gameId,
      playerId: selectedPlayer.id,
      teamId,
      statType,
      value,
      period: currentPeriod,
    }

    // If offline, add to retry queue immediately
    if (!isOnline) {
      setRetryQueue(prev => [...prev, queuedStat])
      return
    }

    // Sync to server if online
    try {
      const res = await fetch('/api/scorekeeper/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId: selectedPlayer.id,
          teamId,
          statType,
          value,
          period: currentPeriod,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setActionLog(prev =>
          prev.map(a => a.id === action.id ? { ...a, synced: true, statLogId: data.statLog?.id } : a)
        )
      } else {
        // Server error - add to retry queue
        setRetryQueue(prev => [...prev, queuedStat])
      }
    } catch (error) {
      console.error('Error syncing stat:', error)
      // Network error - add to retry queue
      setRetryQueue(prev => [...prev, queuedStat])
    }
  }, [selectedPlayer, selectedTeam, game, gameId, isOnline, currentPeriod])

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

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F1A]">
        <div className="animate-spin w-10 h-10 border-3 border-[#FF6B00] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F1A]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-4">Game not found</p>
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
        className={`relative p-3 rounded-xl text-left transition-all touch-manipulation ${
          isSelected
            ? 'bg-[#FF6B00] text-white ring-2 ring-[#FF6B00] ring-offset-2 ring-offset-[#0F0F1A]'
            : 'bg-[#1A1A2E] text-gray-300 hover:bg-[#252540] active:bg-[#2a2a4a]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-[#FF6B00]'}`}>
            #{player.jerseyNumber || '?'}
          </span>
          <span className="font-medium truncate">
            {player.firstName[0]}. {player.lastName}
          </span>
        </div>
        {stats.points > 0 && (
          <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
            {stats.points} pts
            {stats.rebounds > 0 && ` • ${stats.rebounds} reb`}
            {stats.assists > 0 && ` • ${stats.assists} ast`}
          </div>
        )}
        {stats.fouls > 0 && (
          <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            stats.fouls >= 5 ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
          }`}>
            {stats.fouls}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] select-none">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0F0F1A]/95 backdrop-blur-md border-b border-[#252540]">
        <div className="max-w-[1600px] mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/scorekeeper">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <p className="text-xs text-gray-500">
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
                  {retryQueue.length > 0 && !isSyncing && isOnline && (
                    <Badge variant="warning" className="flex items-center gap-1">
                      {retryQueue.length} PENDING
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
            className={`flex-1 max-w-xs cursor-pointer rounded-2xl p-4 transition-all ${
              selectedTeam === 'away'
                ? 'bg-gradient-to-br from-[#FF6B00]/30 to-[#FF6B00]/10 ring-2 ring-[#FF6B00]'
                : 'bg-[#1A1A2E] hover:bg-[#252540]'
            }`}
          >
            <p className="text-sm font-medium text-gray-400 text-center truncate">{game.awayTeam.name}</p>
            <p className="text-6xl font-bold text-white text-center mt-2">{awayScore}</p>
          </div>

          {/* VS / Period */}
          <div className="flex flex-col items-center justify-center px-4">
            <p className="text-2xl font-bold text-gray-600">VS</p>
            {game.ageGroup && <Badge className="mt-2">{game.ageGroup}</Badge>}
          </div>

          {/* Home Team Score */}
          <div
            onClick={() => {
              setSelectedTeam('home')
              setSelectedPlayer(null)
            }}
            className={`flex-1 max-w-xs cursor-pointer rounded-2xl p-4 transition-all ${
              selectedTeam === 'home'
                ? 'bg-gradient-to-br from-[#FF6B00]/30 to-[#FF6B00]/10 ring-2 ring-[#FF6B00]'
                : 'bg-[#1A1A2E] hover:bg-[#252540]'
            }`}
          >
            <p className="text-sm font-medium text-gray-400 text-center truncate">{game.homeTeam.name}</p>
            <p className="text-6xl font-bold text-white text-center mt-2">{homeScore}</p>
          </div>
        </div>

        {/* Main Interface Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Away Team Roster */}
          <div className="col-span-3">
            <div className="bg-[#1A1A2E] rounded-xl p-3 border border-[#252540]">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                {game.awayTeam.name}
              </h3>
              <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
                {game.awayTeam.players.map(player => renderPlayerButton(player, 'away'))}
                {game.awayTeam.players.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No players on roster</p>
                )}
              </div>
            </div>
          </div>

          {/* Stat Buttons - Center */}
          <div className="col-span-6">
            <div className="bg-[#1A1A2E] rounded-xl p-4 border border-[#252540]">
              {/* Selected Player Display */}
              <div className="text-center mb-4">
                {selectedPlayer ? (
                  <div className="bg-[#FF6B00]/20 rounded-lg py-2 px-4 inline-block">
                    <span className="text-[#FF6B00] font-bold text-lg">
                      #{selectedPlayer.jerseyNumber || '?'} {selectedPlayer.firstName} {selectedPlayer.lastName}
                    </span>
                    <span className="text-gray-400 ml-2">
                      ({selectedTeam === 'home' ? game.homeTeam.name : game.awayTeam.name})
                    </span>
                  </div>
                ) : (
                  <p className="text-gray-500">Select a player to record stats</p>
                )}
              </div>

              {/* Tab Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('scoring')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    activeTab === 'scoring'
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-[#252540] text-gray-400 hover:text-white'
                  }`}
                >
                  Scoring
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    activeTab === 'stats'
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-[#252540] text-gray-400 hover:text-white'
                  }`}
                >
                  Other Stats
                </button>
              </div>

              {/* Stat Buttons */}
              {activeTab === 'scoring' ? (
                <div className="grid grid-cols-3 gap-3">
                  {scoringButtons.map(btn => (
                    <button
                      key={btn.type}
                      onClick={() => recordStat(btn.type, btn.value)}
                      disabled={!selectedPlayer || gameStatus !== 'IN_PROGRESS'}
                      className={`${btn.color} text-white rounded-xl p-4 transition-all touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed active:scale-95`}
                    >
                      <div className="text-2xl font-bold">{btn.label}</div>
                      <div className="text-sm opacity-80">{btn.subLabel}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {otherStatButtons.map(btn => (
                    <button
                      key={btn.type}
                      onClick={() => recordStat(btn.type, btn.value)}
                      disabled={!selectedPlayer || gameStatus !== 'IN_PROGRESS'}
                      className={`${btn.color} text-white rounded-xl p-4 transition-all touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed active:scale-95`}
                    >
                      <div className="text-xl font-bold">{btn.label}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Actions */}
              <div className="mt-4 pt-4 border-t border-[#252540]">
                <p className="text-xs text-gray-500 mb-2">Recent Actions</p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {actionLog.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-2">No actions yet</p>
                  ) : (
                    actionLog.slice(0, 5).map(action => (
                      <div
                        key={action.id}
                        className="flex items-center justify-between text-sm p-2 bg-[#252540] rounded-lg"
                      >
                        <span className="text-gray-300">
                          <span className="text-[#FF6B00] font-medium">#{action.playerNumber}</span>
                          {' '}{getStatLabel(action.statType)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">{action.teamName}</span>
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
            <div className="bg-[#1A1A2E] rounded-xl p-3 border border-[#252540]">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                {game.homeTeam.name}
              </h3>
              <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
                {game.homeTeam.players.map(player => renderPlayerButton(player, 'home'))}
                {game.homeTeam.players.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No players on roster</p>
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
            <h3 className="font-semibold text-white mb-2">{game.awayTeam.name} - {awayScore}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-[#252540]">
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
                      <tr key={player.id} className="border-b border-[#252540]/50">
                        <td className="py-2 px-2 text-white">
                          #{player.jerseyNumber} {player.firstName[0]}. {player.lastName}
                        </td>
                        <td className="text-center py-2 px-1 text-white font-medium">{stats.points}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.rebounds}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.assists}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.steals}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.blocks}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.turnovers}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.fouls}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.fgMade}-{stats.fgAttempted}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.fg3Made}-{stats.fg3Attempted}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.ftMade}-{stats.ftAttempted}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Home Team */}
          <div>
            <h3 className="font-semibold text-white mb-2">{game.homeTeam.name} - {homeScore}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-[#252540]">
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
                      <tr key={player.id} className="border-b border-[#252540]/50">
                        <td className="py-2 px-2 text-white">
                          #{player.jerseyNumber} {player.firstName[0]}. {player.lastName}
                        </td>
                        <td className="text-center py-2 px-1 text-white font-medium">{stats.points}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.rebounds}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.assists}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.steals}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.blocks}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.turnovers}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.fouls}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.fgMade}-{stats.fgAttempted}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.fg3Made}-{stats.fg3Attempted}</td>
                        <td className="text-center py-2 px-1 text-gray-400">{stats.ftMade}-{stats.ftAttempted}</td>
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
          <p className="text-gray-300">
            Are you sure you want to finalize this game?
          </p>
          <div className="bg-[#252540] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="text-sm text-gray-400">{game.awayTeam.name}</p>
                <p className="text-3xl font-bold text-white">{awayScore}</p>
              </div>
              <div className="text-gray-500">-</div>
              <div>
                <p className="text-sm text-gray-400">{game.homeTeam.name}</p>
                <p className="text-3xl font-bold text-white">{homeScore}</p>
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
    </div>
  )
}
