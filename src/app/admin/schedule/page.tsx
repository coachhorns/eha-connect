'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, addDays, subDays, isToday } from 'date-fns'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  RefreshCw,
  GripVertical,
  AlertCircle,
  X,
  Wand2,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'

interface Team {
  id: string
  name: string
}

interface Event {
  id: string
  name: string
}

interface Court {
  id: string
  name: string
  venueId: string
}

interface Venue {
  id: string
  name: string
  courts: Court[]
}

interface Game {
  id: string
  homeTeam: Team
  awayTeam: Team
  event: Event | null
  scheduledAt: string
  courtId: string | null
  assignedCourt: (Court & { venue: { id: string; name: string } }) | null
  division: string | null
}

// Time slots from 8 AM to 10 PM in 30-minute intervals
const TIME_SLOTS = Array.from({ length: 29 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const minute = (i % 2) * 30
  return {
    label: format(new Date().setHours(hour, minute, 0, 0), 'h:mm a'),
    hour,
    minute,
  }
})

// Draggable Game Card Component
function DraggableGameCard({
  game,
  isDragging = false,
}: {
  game: Game
  isDragging?: boolean
}) {
  return (
    <div
      className={`p-3 bg-white/5 border border-white/10 rounded-lg cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-50 ring-2 ring-eha-red' : 'hover:border-eha-red/50'
        }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {game.homeTeam.name}
          </p>
          <p className="text-xs text-gray-400">vs</p>
          <p className="text-sm font-medium text-white truncate">
            {game.awayTeam.name}
          </p>
          {game.division && (
            <div className="flex gap-1 mt-1">
              <Badge size="sm" variant="default">
                {game.division}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Droppable Time Slot Cell
function DroppableCell({
  courtId,
  timeSlot,
  game,
  isOver,
  onRemoveGame,
}: {
  courtId: string
  timeSlot: { hour: number; minute: number }
  game: Game | null
  isOver: boolean
  onRemoveGame: (gameId: string) => void
}) {
  return (
    <div
      className={`min-h-[60px] border-b border-r border-white/5 p-1 transition-colors ${isOver ? 'bg-eha-red/20' : game ? 'bg-white/5' : 'hover:bg-white/5'
        }`}
    >
      {game && (
        <div className="relative group p-2 bg-gradient-to-r from-eha-red/20 to-eha-red/10 border border-eha-red/30 rounded text-xs h-full">
          <button
            onClick={() => onRemoveGame(game.id)}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="font-medium text-white truncate">{game.homeTeam.name}</p>
          <p className="text-gray-400">vs {game.awayTeam.name}</p>
        </div>
      )}
    </div>
  )
}

export default function SchedulingGridPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [unscheduledGames, setUnscheduledGames] = useState<Game[]>([])
  const [scheduledGames, setScheduledGames] = useState<Game[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [divisions, setDivisions] = useState<string[]>([])

  const [eventFilter, setEventFilter] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [activeGame, setActiveGame] = useState<Game | null>(null)
  const [overCell, setOverCell] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/schedule')
    } else if (authStatus === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [authStatus, session, router])

  const fetchScheduleData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        date: format(selectedDate, 'yyyy-MM-dd'),
      })
      if (eventFilter) params.append('eventId', eventFilter)
      if (divisionFilter) params.append('division', divisionFilter)

      const res = await fetch(`/api/admin/schedule?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setUnscheduledGames(data.unscheduledGames)
      setScheduledGames(data.scheduledGames)
      setVenues(data.venues)
      setEvents(data.events)
      setDivisions(data.divisions)
      setError('')
    } catch (err) {
      console.error('Error fetching schedule:', err)
      setError('Failed to load schedule data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedDate, eventFilter, divisionFilter])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchScheduleData()
    }
  }, [authStatus, fetchScheduleData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchScheduleData()
  }

  const goToPreviousDay = () => setSelectedDate((prev) => subDays(prev, 1))
  const goToNextDay = () => setSelectedDate((prev) => addDays(prev, 1))
  const goToToday = () => setSelectedDate(new Date())

  const handleDragStart = (event: DragStartEvent) => {
    const gameId = event.active.id as string
    const game =
      unscheduledGames.find((g) => g.id === gameId) ||
      scheduledGames.find((g) => g.id === gameId)
    setActiveGame(game || null)
  }

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as string | null
    setOverCell(overId)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveGame(null)
    setOverCell(null)

    if (!over) return

    const gameId = active.id as string
    const dropTarget = over.id as string

    // Parse the drop target (format: "courtId-hour-minute")
    const [courtId, hourStr, minuteStr] = dropTarget.split('-')
    const hour = parseInt(hourStr)
    const minute = parseInt(minuteStr)

    if (isNaN(hour) || isNaN(minute)) return

    // Calculate the new scheduled time
    const newScheduledAt = new Date(selectedDate)
    newScheduledAt.setHours(hour, minute, 0, 0)

    // Optimistic update
    const game =
      unscheduledGames.find((g) => g.id === gameId) ||
      scheduledGames.find((g) => g.id === gameId)

    if (!game) return

    // Remove from unscheduled if it was there
    setUnscheduledGames((prev) => prev.filter((g) => g.id !== gameId))

    // Add/update in scheduled games
    const updatedGame = {
      ...game,
      courtId,
      scheduledAt: newScheduledAt.toISOString(),
    }
    setScheduledGames((prev) => {
      const filtered = prev.filter((g) => g.id !== gameId)
      return [...filtered, updatedGame]
    })

    // API call
    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          courtId,
          scheduledAt: newScheduledAt.toISOString(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update schedule')
      }

      // Update with server response
      setScheduledGames((prev) =>
        prev.map((g) => (g.id === gameId ? data.game : g))
      )
    } catch (err: any) {
      // Revert on error
      setError(err.message)
      fetchScheduleData()
    }
  }

  const handleRemoveGame = async (gameId: string) => {
    // Optimistic update - move back to unscheduled
    const game = scheduledGames.find((g) => g.id === gameId)
    if (!game) return

    setScheduledGames((prev) => prev.filter((g) => g.id !== gameId))
    setUnscheduledGames((prev) => [...prev, { ...game, courtId: null }])

    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          courtId: null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to unschedule game')
      }
    } catch (err: any) {
      setError(err.message)
      fetchScheduleData()
    }
  }

  // Get all courts across all venues
  const allCourts = venues.flatMap((venue) =>
    venue.courts.map((court) => ({ ...court, venueName: venue.name }))
  )

  // Get game for a specific cell
  const getGameForCell = (courtId: string, hour: number, minute: number) => {
    return scheduledGames.find((game) => {
      if (game.courtId !== courtId) return false
      const gameTime = new Date(game.scheduledAt)
      return gameTime.getHours() === hour && gameTime.getMinutes() === minute
    })
  }

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-dark-base">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-eha-navy/95 backdrop-blur-md border-b border-white/10">
          <div className="max-w-[1800px] mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-white">Scheduling Grid</h1>
                  <p className="text-sm text-gray-500">
                    Drag games to schedule them on courts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Date Navigation */}
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                  <Button variant="ghost" size="sm" onClick={goToPreviousDay}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="px-3 py-1 text-center min-w-[140px]">
                    <p className="text-sm font-medium text-white">
                      {isToday(selectedDate)
                        ? 'Today'
                        : format(selectedDate, 'EEE, MMM d')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={goToNextDay}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {!isToday(selectedDate) && (
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    <Calendar className="w-4 h-4 mr-1" />
                    Today
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </Button>

                <div className="h-6 w-px bg-white/10 mx-2" />

                <Link href="/admin/scheduler/auto">
                  <Button size="sm" className="flex gap-2">
                    <Wand2 className="w-4 h-4" />
                    Auto-Schedule
                  </Button>
                </Link>

                <Link href="/admin/brackets">
                  <Button variant="outline" size="sm" className="flex gap-2">
                    <span className="text-eha-red">Brackets & Pools</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/50 px-4 py-2">
            <div className="max-w-[1800px] mx-auto flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Sidebar - Unscheduled Games */}
          <div className="w-[300px] flex-shrink-0 border-r border-white/10 bg-[#0A1D37] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Unscheduled Games
                <Badge variant="default">{unscheduledGames.length}</Badge>
              </h2>

              {/* Filters */}
              <div className="space-y-2">
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 appearance-none cursor-pointer transition-all"
                >
                  <option value="" className="bg-[#0A1D37] text-white">All Events</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id} className="bg-[#0A1D37] text-white">{e.name}</option>
                  ))}
                </select>
                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 appearance-none cursor-pointer transition-all"
                >
                  <option value="" className="bg-[#0A1D37] text-white">All Divisions</option>
                  {divisions.map((d) => (
                    <option key={d} value={d} className="bg-[#0A1D37] text-white">{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Games List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unscheduledGames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No unscheduled games</p>
                </div>
              ) : (
                unscheduledGames.map((game) => (
                  <div
                    key={game.id}
                    id={game.id}
                    data-draggable="true"
                  >
                    <DraggableItem id={game.id}>
                      <DraggableGameCard game={game} />
                    </DraggableItem>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Grid */}
          <div className="flex-1 overflow-auto min-w-0">
            {allCourts.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="bg-[#152e50]/30 border border-white/5 rounded-sm p-8 text-center max-w-md">
                  <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No Courts Available
                  </h3>
                  <p className="text-gray-400 mb-4">
                    You need to create venues and courts before you can schedule
                    games.
                  </p>
                  <Link href="/admin/venues">
                    <Button>Manage Venues</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="min-w-max">
                {/* Court Headers */}
                <div className="sticky top-0 z-30 bg-[#0A1D37] flex border-b border-white/10">
                  <div className="w-20 flex-shrink-0 p-2 border-r border-white/10" />
                  {allCourts.map((court) => (
                    <div
                      key={court.id}
                      className="w-40 flex-shrink-0 p-2 border-r border-white/10 text-center"
                    >
                      <p className="font-medium text-white text-sm">{court.name}</p>
                      <p className="text-xs text-gray-500">{court.venueName}</p>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                {TIME_SLOTS.map((slot) => (
                  <div key={`${slot.hour}-${slot.minute}`} className="flex">
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0 p-2 border-r border-b border-white/5 text-right">
                      <span className="text-xs text-gray-500">{slot.label}</span>
                    </div>

                    {/* Court Cells */}
                    {allCourts.map((court) => {
                      const cellId = `${court.id}-${slot.hour}-${slot.minute}`
                      const gameInCell = getGameForCell(
                        court.id,
                        slot.hour,
                        slot.minute
                      )

                      return (
                        <DroppableItem
                          key={cellId}
                          id={cellId}
                          className="w-40 flex-shrink-0"
                        >
                          <DroppableCell
                            courtId={court.id}
                            timeSlot={slot}
                            game={gameInCell || null}
                            isOver={overCell === cellId}
                            onRemoveGame={handleRemoveGame}
                          />
                        </DroppableItem>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeGame && (
            <div className="w-[280px]">
              <DraggableGameCard game={activeGame} isDragging />
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}

// Draggable wrapper using dnd-kit
function DraggableItem({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const { useDraggable } = require('@dnd-kit/core')
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  })

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  )
}

// Droppable wrapper using dnd-kit
function DroppableItem({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { useDroppable } = require('@dnd-kit/core')
  const { setNodeRef } = useDroppable({
    id,
  })

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  )
}
