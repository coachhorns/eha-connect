'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, AlertCircle, ChevronDown } from 'lucide-react'
import { Button, Input, Badge } from '@/components/ui'
import { divisions } from '@/lib/constants'

const divisionOptions = [
  { value: '', label: 'Select Division' },
  ...divisions.map(d => ({ value: d, label: d })),
]

interface Program {
  id: string
  name: string
}

function DirectorNewTeamContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const programId = searchParams.get('programId')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [program, setProgram] = useState<Program | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    division: '',
    coachName: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/director/teams/new')
      return
    }

    if (status === 'authenticated' && session?.user.role !== 'PROGRAM_DIRECTOR') {
      router.push('/')
      return
    }

    if (status === 'authenticated' && session?.user.role === 'PROGRAM_DIRECTOR') {
      fetchProgram()
    }
  }, [status, session, router])

  const fetchProgram = async () => {
    try {
      const res = await fetch('/api/director/program')
      const data = await res.json()

      if (res.ok && data.program) {
        setProgram({ id: data.program.id, name: data.program.name })

        // Verify the programId from URL matches the director's program
        if (programId && programId !== data.program.id) {
          router.push('/director/dashboard')
          return
        }
      } else {
        // No program, redirect to onboarding
        router.push('/director/onboarding')
        return
      }
    } catch (err) {
      console.error('Error fetching program:', err)
      setError('Failed to load program')
    } finally {
      setIsLoading(false)
    }
  }

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

    if (!program) {
      setError('No program found')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/director/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          division: formData.division || null,
          coachName: formData.coachName.trim() || null,
          programId: program.id,
        }),
      })

      if (res.ok) {
        router.push('/director/dashboard')
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1D37] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0A1D37] relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E31837] blur-[150px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-32 pb-12">
        {/* Back Link */}
        <Link
          href="/director/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">
            New Team
          </h1>
          {program && (
            <div className="mt-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white" />
              <span className="text-gray-400">Adding team to:</span>
              <Badge variant="info">{program.name}</Badge>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              {error}
            </p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="relative">
                <select
                  value={formData.division}
                  onChange={(e) => handleChange('division', e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/10 text-white px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                >
                  {divisionOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0a1628]">
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
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

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link href="/director/dashboard" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20 text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="flex-1 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25"
              >
                Create Team
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function NewTeamLoading() {
  return (
    <div className="min-h-screen bg-[#0A1D37] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
    </div>
  )
}

export default function DirectorNewTeamPage() {
  return (
    <Suspense fallback={<NewTeamLoading />}>
      <DirectorNewTeamContent />
    </Suspense>
  )
}
