'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, MapPin } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'

interface Game {
  id: string
  scheduledAt: string
  status: string
  currentPeriod: number
  homeScore: number
  awayScore: number
  court: string | null
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
}

const statusOptions = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'WARMUP', label: 'Warmup' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'HALFTIME', label: 'Halftime' },
  { value: 'FINAL', label: 'Final' },
  { value: 'POSTPONED', label: 'Postponed' },
  { value: 'CANCELED', label: 'Canceled' },
]

const periodOptions = [
  { value: '1', label: 'Period 1' },
  { value: '2', label: 'Period 2' },
  { value: '3', label: 'Period 3' },
  { value: '4', label: 'Period 4' },
  { value: '5', label: 'OT 1' },
  { value: '6', label: 'OT 2' },
]

export default function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [game, setGame] = useState<Game | null>(null)

  const [formData, setFormData] = useState({
    scheduledAt: '',
    court: '',
    status: '',
    currentPeriod: '1',
    homeScore: '0',
    awayScore: '0',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/games/${resolvedParams.id}/edit`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/admin/games/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          const g: Game = data.game
          setGame(g)
          // Format date for datetime-local input
          const scheduledDate = new Date(g.scheduledAt)
          const localDateTime = format(scheduledDate, "yyyy-MM-dd'T'HH:mm")
          setFormData({
            scheduledAt: localDateTime,
            court: g.court || '',
            status: g.status,
            currentPeriod: g.currentPeriod.toString(),
            homeScore: g.homeScore.toString(),
            awayScore: g.awayScore.toString(),
          })
        } else {
          setError('Game not found')
        }
      } catch (err) {
        console.error('Error fetching game:', err)
        setError('Failed to load game')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchGame()
    }
  }, [session, resolvedParams.id])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.scheduledAt) {
      setError('Date and time are required')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/admin/games/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
          court: formData.court || null,
          status: formData.status,
          currentPeriod: parseInt(formData.currentPeriod),
          homeScore: parseInt(formData.homeScore),
          awayScore: parseInt(formData.awayScore),
        }),
      })

      if (res.ok) {
        router.push(`/admin/games/${resolvedParams.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update game')
      }
    } catch (error) {
      console.error('Error updating game:', error)
      setError('Failed to update game')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (error && !game) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/admin/games')}
            className="mt-4 text-eha-red hover:underline"
          >
            Back to Games
          </button>
        </div>
      </div>
    )
  }

  if (!game) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/games/${resolvedParams.id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Game
        </Link>
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Edit Game</h1>
        <p className="mt-2 text-gray-400">
          {game.awayTeam.name} @ {game.homeTeam.name}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date & Time *
            </label>
            <Input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => handleChange('scheduledAt', e.target.value)}
              required
            />
          </div>

          {/* Court/Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Court / Location
            </label>
            <Input
              type="text"
              placeholder="e.g., Court 1"
              value={formData.court}
              onChange={(e) => handleChange('court', e.target.value)}
            />
          </div>

          {/* Status & Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <Select
                options={statusOptions}
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Period
              </label>
              <Select
                options={periodOptions}
                value={formData.currentPeriod}
                onChange={(e) => handleChange('currentPeriod', e.target.value)}
              />
            </div>
          </div>

          <hr className="border-[#1a3a6e]" />

          {/* Score Override */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Score Override</h3>
            <p className="text-sm text-gray-500 mb-4">
              Manually adjust the final score if needed. This will override any calculated totals.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {game.awayTeam.name} (Away)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.awayScore}
                  onChange={(e) => handleChange('awayScore', e.target.value)}
                  className="text-center text-2xl font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {game.homeTeam.name} (Home)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.homeScore}
                  onChange={(e) => handleChange('homeScore', e.target.value)}
                  className="text-center text-2xl font-bold"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/admin/games/${resolvedParams.id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
