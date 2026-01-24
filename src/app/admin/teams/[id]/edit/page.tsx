'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'

interface Team {
  id: string
  name: string
  coachName: string | null
  coachEmail: string | null
  coachPhone: string | null
  ageGroup: string | null
  division: string | null
  city: string | null
  state: string | null
  programId: string | null
}

const ageGroupOptions = [
  { value: '', label: 'Select Age Group' },
  { value: '8U', label: '8U' },
  { value: '9U', label: '9U' },
  { value: '10U', label: '10U' },
  { value: '11U', label: '11U' },
  { value: '12U', label: '12U' },
  { value: '13U', label: '13U' },
  { value: '14U', label: '14U' },
  { value: '15U', label: '15U' },
  { value: '16U', label: '16U' },
  { value: '17U', label: '17U' },
  { value: '18U', label: '18U' },
]

const divisionOptions = [
  { value: '', label: 'Select Division' },
  { value: 'EPL', label: 'EHA Premier League (EPL)' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
]

export default function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    coachName: '',
    coachEmail: '',
    coachPhone: '',
    ageGroup: '',
    division: '',
    city: '',
    state: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/teams/${resolvedParams.id}/edit`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch(`/api/admin/teams/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          const team: Team = data.team
          setFormData({
            name: team.name || '',
            coachName: team.coachName || '',
            coachEmail: team.coachEmail || '',
            coachPhone: team.coachPhone || '',
            ageGroup: team.ageGroup || '',
            division: team.division || '',
            city: team.city || '',
            state: team.state || '',
          })
        } else {
          setError('Team not found')
        }
      } catch (err) {
        console.error('Error fetching team:', err)
        setError('Failed to load team')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchTeam()
    }
  }, [session, resolvedParams.id])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Team name is required')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/admin/teams/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          coachName: formData.coachName.trim() || null,
          coachEmail: formData.coachEmail.trim() || null,
          coachPhone: formData.coachPhone.trim() || null,
          ageGroup: formData.ageGroup || null,
          division: formData.division || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
        }),
      })

      if (res.ok) {
        router.push(`/admin/teams/${resolvedParams.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update team')
      }
    } catch (error) {
      console.error('Error updating team:', error)
      setError('Failed to update team')
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

  if (error && !formData.name) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/admin/teams')}
            className="mt-4 text-eha-red hover:underline"
          >
            Back to Teams
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/teams/${resolvedParams.id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team
        </Link>
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Edit Team</h1>
        <p className="mt-2 text-gray-400">
          Update team information
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Team Name *
            </label>
            <Input
              type="text"
              placeholder="e.g., Houston Elite 17U"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          {/* Age Group & Division */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Age Group
              </label>
              <Select
                options={ageGroupOptions}
                value={formData.ageGroup}
                onChange={(e) => handleChange('ageGroup', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Division
              </label>
              <Select
                options={divisionOptions}
                value={formData.division}
                onChange={(e) => handleChange('division', e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City
              </label>
              <Input
                type="text"
                placeholder="Houston"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State
              </label>
              <Input
                type="text"
                placeholder="TX"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                maxLength={2}
              />
            </div>
          </div>

          <hr className="border-[#1a3a6e]" />

          {/* Coach Information */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Coach Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Coach Name
                </label>
                <Input
                  type="text"
                  placeholder="John Smith"
                  value={formData.coachName}
                  onChange={(e) => handleChange('coachName', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="coach@example.com"
                    value={formData.coachEmail}
                    onChange={(e) => handleChange('coachEmail', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.coachPhone}
                    onChange={(e) => handleChange('coachPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/admin/teams/${resolvedParams.id}`)}
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
