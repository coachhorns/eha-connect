'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'

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
]

const divisionOptions = [
  { value: '', label: 'Select Division' },
  { value: 'EPL', label: 'EHA Premier League (EPL)' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
]

export default function NewTeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    ageGroup: '',
    division: '',
    coachName: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/teams/new')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

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
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          ageGroup: formData.ageGroup || null,
          division: formData.division || null,
          coachName: formData.coachName.trim() || null,
        }),
      })

      if (res.ok) {
        router.push('/admin/teams')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create team')
      }
    } catch (err) {
      console.error('Error creating team:', err)
      setError('Failed to create team')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/teams"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">New Team</h1>
        <p className="mt-2 text-gray-400">
          Add a new team to the system
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

          {/* Coach Name */}
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

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Link href="/admin/teams">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1"
            >
              Create Team
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
