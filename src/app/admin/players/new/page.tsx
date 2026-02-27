'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'

interface Team {
  id: string
  name: string
  division: string | null
}

const positionOptions = [
  { value: '', label: 'Select Position (Optional)' },
  { value: 'PG', label: 'Point Guard (PG)' },
  { value: 'SG', label: 'Shooting Guard (SG)' },
  { value: 'SF', label: 'Small Forward (SF)' },
  { value: 'PF', label: 'Power Forward (PF)' },
  { value: 'C', label: 'Center (C)' },
]

import { Suspense } from 'react'

function NewPlayerForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTeamId = searchParams.get('teamId')

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [teams, setTeams] = useState<Team[]>([])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    teamId: preselectedTeamId || '',
    jerseyNumber: '',
    primaryPosition: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/players/new')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/admin/teams?limit=500')
        if (res.ok) {
          const data = await res.json()
          setTeams(data.teams || [])
        }
      } catch (error) {
        console.error('Error fetching teams:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchTeams()
    }
  }, [session])

  // Update formData when preselectedTeamId changes (from URL)
  useEffect(() => {
    if (preselectedTeamId) {
      setFormData(prev => ({ ...prev, teamId: preselectedTeamId }))
    }
  }, [preselectedTeamId])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          teamId: formData.teamId || null,
          jerseyNumber: formData.jerseyNumber || null,
          primaryPosition: formData.primaryPosition || null,
        }),
      })

      if (res.ok) {
        // Redirect back to team dashboard if we came from there, otherwise players list
        if (preselectedTeamId) {
          router.push(`/admin/teams/${preselectedTeamId}`)
        } else {
          router.push('/admin/players')
        }
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create player')
      }
    } catch (error) {
      console.error('Error creating player:', error)
      setError('Failed to create player')
    } finally {
      setIsSubmitting(false)
    }
  }

  const teamOptions = [
    { value: '', label: 'Select Team (Optional)' },
    ...teams.map(team => ({
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

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={preselectedTeamId ? `/admin/teams/${preselectedTeamId}` : '/admin/players'}
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {preselectedTeamId ? 'Back to Team' : 'Back to Players'}
        </Link>
        <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">Add New Player</h1>
        <p className="mt-2 text-text-muted">
          Create a new player profile{preselectedTeamId && teams.find(t => t.id === preselectedTeamId) ? ` for ${teams.find(t => t.id === preselectedTeamId)?.name}` : ''}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                First Name *
              </label>
              <Input
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Last Name *
              </label>
              <Input
                type="text"
                placeholder="Smith"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Team
            </label>
            <Select
              options={teamOptions}
              value={formData.teamId}
              onChange={(e) => handleChange('teamId', e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">
              Optionally add this player to a team roster
            </p>
          </div>

          {/* Jersey Number & Position */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Jersey Number
              </label>
              <Input
                type="text"
                placeholder="23"
                value={formData.jerseyNumber}
                onChange={(e) => handleChange('jerseyNumber', e.target.value)}
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Position
              </label>
              <Select
                options={positionOptions}
                value={formData.primaryPosition}
                onChange={(e) => handleChange('primaryPosition', e.target.value)}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(preselectedTeamId ? `/admin/teams/${preselectedTeamId}` : '/admin/players')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1"
            >
              Create Player
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default function NewPlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    }>
      <NewPlayerForm />
    </Suspense>
  )
}
