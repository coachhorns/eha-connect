import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  getGameLocally,
  saveGameLocally,
  queueMutation,
  getQueuedMutations,
  clearMutation,
} from '@/lib/offline-db'

export function useGameSync(gameId: string) {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Monitor Online Status
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 1. Fetch Game Data (Server -> Local Cache)
  const { data: gameData, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
        // Try network first
        try {
            const [gameRes, statsRes] = await Promise.all([
                fetch(`/api/scorekeeper/games/${gameId}`),
                fetch(`/api/scorekeeper/games/${gameId}/stats`),
            ])
            if (!gameRes.ok) throw new Error('Network response not ok')

            const gameJson = await gameRes.json()
            const statsJson = await statsRes.json()

            const fullData = { game: gameJson.game, stats: statsJson.stats, statLogs: statsJson.statLogs }

            // Save to IndexedDB for offline use later
            await saveGameLocally(gameId, fullData)
            return fullData
        } catch (err) {
            console.warn('Network failed, falling back to local DB', err)
            throw err
        }
    },
    // If network fails, React Query can't natively "fallback" to IDB easily in queryFn
    // So we use `initialData` or a separate effect.
    // Here we'll handle the fallback logic by returning the local data in the catch block
    // BUT React Query retries by default.
    // Better strategy: A separate "load from DB" effect if query fails or is initial load.
    retry: 1,
  })

  // Manual fallback loader
  const [localData, setLocalData] = useState<any>(null)

  useEffect(() => {
      if (!gameData && !isLoading) {
          // If no server data, try local
          getGameLocally(gameId).then(data => {
              if (data) setLocalData(data)
          })
      }
  }, [gameData, isLoading, gameId])

  // Combined Data (Server wins, else Local)
  const activeData = gameData || localData

  // 2. Sync Engine (Process Queue when Online)
  useEffect(() => {
    if (!isOnline || isSyncing) return

    const processQueue = async () => {
      setIsSyncing(true)
      const queuedMutations = await getQueuedMutations(gameId)

      for (const mutation of queuedMutations) {
        try {
          const res = await fetch('/api/scorekeeper/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mutation.payload), // Payload matches API body
          })

          if (res.ok) {
            await clearMutation(mutation.id!)
            // Refetch to ensure state is consistent
            queryClient.invalidateQueries({ queryKey: ['game', gameId] })
          }
        } catch (error) {
          console.error('Failed to sync mutation:', mutation)
          // Stop processing if network error, wait for next cycle
          break
        }
      }
      setIsSyncing(false)
    }

    processQueue()
    // Poll every 10s if online to ensure queue is clear
    const interval = setInterval(processQueue, 10000)
    return () => clearInterval(interval)
  }, [isOnline, gameId, queryClient, isSyncing])

  // 3. Mutation Helper (UI calls this)
  const mutateStat = async (type: string, payload: any) => {
    // A. Optimistic Update (Handled by UI state usually, or we can update cache here)
    // For now, we assume UI updates state locally first.

    // B. Queue immediately (Offline First pattern)
    // We ALWAYS queue, then try to flush. simpler than having two paths.
    // Actually, for instant feedback, we can try fetch first if online?
    // No, "Offline First" means DB is source of truth.
    await queueMutation(gameId, type, payload)

    // Trigger sync immediately if online
    if (isOnline) {
       // We can signal the effect or just let the interval/online-event catch it
       // Or manually trigger a sync check
    }
  }

  return {
    game: activeData?.game,
    stats: activeData?.stats,
    statLogs: activeData?.statLogs,
    isLoading: isLoading && !localData,
    isOnline,
    isSyncing,
    mutateStat
  }
}
