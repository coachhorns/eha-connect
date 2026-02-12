'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import { Card, Button, Input, Select, Badge } from '@/components/ui'
import { divisions } from '@/lib/constants'

const divisionOptions = [
  { value: '', label: 'Select Division' },
  ...divisions.map(d => ({ value: d, label: d })),
]

interface Program {
  id: string
  name: string
}

export default function NewTeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const programId = searchParams.get('programId')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [program, setProgram] = useState<Program | null>(null)

  const [formData, setFormData] = useState({
    name: '',
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

  useEffect(() => {
    const fetchProgram = async () => {
      if (!programId) return
      try {
        const res = await fetch(`/api/admin/programs/${programId}`)
        if (res.ok) {
          const data = await res.json()
          setProgram({ id: data.program.id, name: data.program.name })
        }
      } catch (err) {
        console.error('Error fetching program:', err)
      }
    }
    if (session?.user.role === 'ADMIN') {
      fetchProgram()
    }
  }, [programId, session])

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
          division: formData.division || null,
          coachName: formData.coachName.trim() || null,
          programId: programId || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Redirect back to program if we came from one
        if (programId) {
          router.push(`/admin/programs/${programId}`)
        } else {
          router.push(`/admin/teams/${data.team.id}`)
        }
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
          href={programId ? `/admin/programs/${programId}` : '/admin/teams'}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {programId ? 'Back to Program' : 'Back to Teams'}
        </Link>
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">New Team</h1>
        {program ? (
          <div className="mt-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Adding team to:</span>
            <Badge variant="info">{program.name}</Badge>
          </div>
        ) : (
          <p className="mt-2 text-gray-400">
            Add a new team to the system
          </p>
        )}
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

          {/* Division */}
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
            <Link href={programId ? `/admin/programs/${programId}` : '/admin/teams'}>
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
