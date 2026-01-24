'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Wand2,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Card, Button, Select, Badge } from '@/components/ui'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface ScheduledGame {
  gameId: string
  courtId: string
  courtName: string
  venueName: string
  scheduledAt: string
  timeSlot: string
  homeTeam: string
  awayTeam: string
  gameType: string
  ageGroup?: string
  division?: string
}

interface UnscheduledGame {
  gameId: string
  homeTeam: string
  awayTeam: string
  gameType: string
  reason: string
}

interface PreviewResult {
  scheduled: ScheduledGame[]
  unscheduled: UnscheduledGame[]
  stats: {
    totalGames: number
    scheduledCount: number
    unscheduledCount: number
    utilizationPercent: number
  }
}

type WizardStep = 'config' | 'preview' | 'complete'

const timeOptions = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: '23:00', label: '11:00 PM' },
]

const durationOptions = [
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
  { value: '75', label: '75 minutes' },
  { value: '90', label: '90 minutes' },
]

const restOptions = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
  { value: '90', label: '90 minutes' },
]

export default function AutoSchedulerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Wizard state
  const [step, setStep] = useState<WizardStep>('config')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Events list
  const [events, setEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  // Configuration
  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('22:00')
  const [gameDuration, setGameDuration] = useState('60')
  const [minRest, setMinRest] = useState('60')

  // Preview result
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/scheduler/auto')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/admin/events?limit=100')
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
        }
      } catch (err) {
        console.error('Error fetching events:', err)
      } finally {
        setIsLoadingEvents(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchEvents()
    }
  }, [session])

  // Set default date when event is selected
  useEffect(() => {
    if (selectedEventId) {
      const event = events.find((e) => e.id === selectedEventId)
      if (event) {
        const startDate = new Date(event.startDate)
        setSelectedDate(startDate.toISOString().split('T')[0])
      }
    }
  }, [selectedEventId, events])

  const handleGeneratePreview = async () => {
    if (!selectedEventId || !selectedDate) {
      setError('Please select an event and date')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/scheduler/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          date: selectedDate,
          mode: 'PREVIEW',
          settings: {
            startTime,
            endTime,
            gameDuration: parseInt(gameDuration),
            minRestMinutes: parseInt(minRest),
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to generate preview')
        return
      }

      setPreviewResult({
        scheduled: data.scheduled,
        unscheduled: data.unscheduled,
        stats: data.stats,
      })
      setStep('preview')
    } catch (err) {
      console.error('Error generating preview:', err)
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplySchedule = async () => {
    if (!selectedEventId || !selectedDate) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/scheduler/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          date: selectedDate,
          mode: 'APPLY',
          settings: {
            startTime,
            endTime,
            gameDuration: parseInt(gameDuration),
            minRestMinutes: parseInt(minRest),
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to apply schedule')
        return
      }

      setStep('complete')
    } catch (err) {
      console.error('Error applying schedule:', err)
      setError('Failed to apply schedule')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoadingEvents) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/schedule"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Schedule
        </Link>
        <div className="flex items-center gap-3">
          <Wand2 className="w-8 h-8 text-eha-red" />
          <div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-wider">
              Auto-Schedule Wizard
            </h1>
            <p className="mt-1 text-gray-400">
              Automatically assign times and courts to unscheduled games
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {(['config', 'preview', 'complete'] as const).map((s, idx) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step === s
                  ? 'bg-eha-red text-white'
                  : idx < ['config', 'preview', 'complete'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {idx < ['config', 'preview', 'complete'].indexOf(step) ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={`ml-2 text-sm ${
                step === s ? 'text-white font-medium' : 'text-gray-400'
              }`}
            >
              {s === 'config' && 'Configuration'}
              {s === 'preview' && 'Preview'}
              {s === 'complete' && 'Complete'}
            </span>
            {idx < 2 && <ChevronRight className="w-5 h-5 text-gray-600 ml-4" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: Configuration */}
      {step === 'config' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Configure Scheduling Parameters
          </h2>

          <div className="space-y-6">
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Event *
              </label>
              <Select
                options={[
                  { value: '', label: 'Choose an event...' },
                  ...events.map((e) => ({ value: e.id, label: e.name })),
                ]}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              />
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Schedule Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={selectedEvent?.startDate?.split('T')[0]}
                  max={selectedEvent?.endDate?.split('T')[0]}
                  className="w-full bg-[#0a1628] border border-[#1a3a6e] rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-eha-red focus:border-transparent"
                />
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Start Time
                </label>
                <Select
                  options={timeOptions.slice(0, 5)}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  End Time
                </label>
                <Select
                  options={timeOptions.slice(5)}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Game Duration & Rest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Duration
                </label>
                <Select
                  options={durationOptions}
                  value={gameDuration}
                  onChange={(e) => setGameDuration(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Rest Between Games
                </label>
                <Select
                  options={restOptions}
                  value={minRest}
                  onChange={(e) => setMinRest(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-[#1a3a6e]">
              <Link href="/admin/schedule">
                <Button variant="ghost">Cancel</Button>
              </Link>
              <Button
                onClick={handleGeneratePreview}
                isLoading={isLoading}
                disabled={!selectedEventId || !selectedDate}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Preview
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && previewResult && (
        <div className="space-y-6">
          {/* Stats Summary */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Schedule Preview
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0a1628] rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-white">
                  {previewResult.stats.totalGames}
                </div>
                <div className="text-sm text-gray-400">Total Games</div>
              </div>
              <div className="bg-[#0a1628] rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400">
                  {previewResult.stats.scheduledCount}
                </div>
                <div className="text-sm text-gray-400">Scheduled</div>
              </div>
              <div className="bg-[#0a1628] rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {previewResult.stats.unscheduledCount}
                </div>
                <div className="text-sm text-gray-400">Could Not Schedule</div>
              </div>
              <div className="bg-[#0a1628] rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {previewResult.stats.utilizationPercent}%
                </div>
                <div className="text-sm text-gray-400">Court Utilization</div>
              </div>
            </div>

            {previewResult.unscheduled.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  {previewResult.unscheduled.length} Game(s) Could Not Be Scheduled
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  {previewResult.unscheduled.map((game) => (
                    <li key={game.gameId} className="flex items-start gap-2">
                      <span className="text-gray-400">-</span>
                      <span>
                        {game.homeTeam} vs {game.awayTeam}:{' '}
                        <span className="text-yellow-400">{game.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Scheduled Games List */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Proposed Schedule ({previewResult.scheduled.length} games)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a3a6e]">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Court
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Matchup
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.scheduled
                    .sort(
                      (a, b) =>
                        new Date(a.scheduledAt).getTime() -
                        new Date(b.scheduledAt).getTime()
                    )
                    .map((game) => (
                      <tr
                        key={game.gameId}
                        className="border-b border-[#1a3a6e]/50 hover:bg-[#0a1628]/50"
                      >
                        <td className="py-3 px-4 text-white font-medium">
                          {game.timeSlot}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {game.courtName}
                          <span className="text-gray-500 text-sm ml-2">
                            ({game.venueName})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {game.homeTeam} vs {game.awayTeam}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              game.gameType === 'BRACKET' ||
                              game.gameType === 'CHAMPIONSHIP'
                                ? 'warning'
                                : 'default'
                            }
                            size="sm"
                          >
                            {game.gameType}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-4 pt-6 mt-6 border-t border-[#1a3a6e]">
              <Button variant="ghost" onClick={() => setStep('config')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Configuration
              </Button>
              <Button onClick={handleApplySchedule} isLoading={isLoading}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm & Apply Schedule
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && (
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Schedule Applied Successfully!
          </h2>
          <p className="text-gray-400 mb-8">
            {previewResult?.stats.scheduledCount} games have been assigned to
            courts and time slots.
          </p>

          <div className="flex justify-center gap-4">
            <Link href="/admin/schedule">
              <Button>
                <Calendar className="w-4 h-4 mr-2" />
                View Scheduling Grid
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setStep('config')
                setPreviewResult(null)
              }}
            >
              Schedule Another Day
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
