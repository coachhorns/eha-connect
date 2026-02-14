'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface Team {
  id: string
  name: string
  division: string | null
}

const gameTypeOptions = [
  { value: 'POOL', label: 'Pool Play' },
  { value: 'BRACKET', label: 'Bracket' },
  { value: 'CONSOLATION', label: 'Consolation' },
  { value: 'CHAMPIONSHIP', label: 'Championship' },
  { value: 'EXHIBITION', label: 'Exhibition' },
]

export default function NewGamePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [events, setEvents] = useState<Event[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])

  const [showAllTeams, setShowAllTeams] = useState(false)

  const [formData, setFormData] = useState({
    eventId: '',
    homeTeamId: '',
    awayTeamId: '',
    scheduledAt: '',
    court: '',
    gameType: 'POOL',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/games/new')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [eventsRes, teamsRes] = await Promise.all([
          fetch('/api/admin/events?limit=100'),
          fetch('/api/admin/teams?limit=500'),
        ])

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setEvents(eventsData.events || [])
        }

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          setTeams(teamsData.teams || [])
          setFilteredTeams(teamsData.teams || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchData()
    }
  }, [session])

  useEffect(() => {
    if (showAllTeams) {
      // Show all teams when toggle is checked
      setFilteredTeams(teams)
    } else if (formData.eventId) {
      // Filter teams by event
      const eventTeams = teams.filter((team: any) =>
        team.events?.some((e: any) => e.eventId === formData.eventId) ||
        team.eventId === formData.eventId
      )
      setFilteredTeams(eventTeams.length > 0 ? eventTeams : teams)
    } else {
      setFilteredTeams(teams)
    }
    // Reset team selections when event changes (but not when toggling showAllTeams)
  }, [formData.eventId, teams, showAllTeams])

  // Reset team selections when event changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, homeTeamId: '', awayTeamId: '' }))
  }, [formData.eventId])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.homeTeamId || !formData.awayTeamId) {
      setError('Please select both home and away teams')
      return
    }

    if (formData.homeTeamId === formData.awayTeamId) {
      setError('Home team and away team must be different')
      return
    }

    if (!formData.scheduledAt) {
      setError('Please select a date and time')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: formData.eventId || null,
          homeTeamId: formData.homeTeamId,
          awayTeamId: formData.awayTeamId,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
          court: formData.court || null,
          gameType: formData.gameType,
        }),
      })

      if (res.ok) {
        router.push('/admin/games')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create game')
      }
    } catch (error) {
      console.error('Error creating game:', error)
      setError('Failed to create game')
    } finally {
      setIsSubmitting(false)
    }
  }

  const eventOptions = [
    { value: '', label: 'Select Event (Optional)' },
    ...events.map(event => ({ value: event.id, label: event.name })),
  ]

  const teamOptions = [
    { value: '', label: 'Select Team' },
    ...filteredTeams.map(team => ({
      value: team.id,
      label: `${team.name}${team.division ? ` (${team.division})` : ''}`,
    })),
  ]

  const awayTeamOptions = [
    { value: '', label: 'Select Team' },
    ...filteredTeams
      .filter(team => team.id !== formData.homeTeamId)
      .map(team => ({
        value: team.id,
        label: `${team.name}${team.division ? ` (${team.division})` : ''}`,
      })),
  ]

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/games"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </Link>
        <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">Schedule Game</h1>
        <p className="mt-2 text-text-muted">
          Create a new game between two teams
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Event Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Event
            </label>
            <Select
              options={eventOptions}
              value={formData.eventId}
              onChange={(e) => handleChange('eventId', e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">
              Selecting an event will filter teams to those registered for that event
            </p>
          </div>

          {/* Teams */}
          <div className="space-y-4">
            {/* Show All Teams Toggle */}
            {formData.eventId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllTeams}
                  onChange={(e) => setShowAllTeams(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default bg-surface-raised text-eha-red focus:ring-eha-red focus:ring-offset-0"
                />
                <span className="text-sm text-text-secondary">
                  Show All Teams
                </span>
                <span className="text-xs text-text-muted">
                  (ignore event filter)
                </span>
              </label>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Home Team *
                </label>
                <Select
                  options={teamOptions}
                  value={formData.homeTeamId}
                  onChange={(e) => handleChange('homeTeamId', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Away Team *
                </label>
                <Select
                  options={awayTeamOptions}
                  value={formData.awayTeamId}
                  onChange={(e) => handleChange('awayTeamId', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date & Time *
            </label>
            <Input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => handleChange('scheduledAt', e.target.value)}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Court / Location
            </label>
            <Input
              type="text"
              placeholder="e.g., Court 1, Field A"
              value={formData.court}
              onChange={(e) => handleChange('court', e.target.value)}
            />
          </div>

          {/* Game Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Game Type
            </label>
            <Select
              options={gameTypeOptions}
              value={formData.gameType}
              onChange={(e) => handleChange('gameType', e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/games')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1"
            >
              Schedule Game
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
