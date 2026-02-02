'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Loader2,
  ImageIcon,
  X,
  ArrowLeft,
  AlertCircle,
  Check,
} from 'lucide-react'
import { Button, Input } from '@/components/ui'

interface Program {
  id: string
  name: string
  city: string | null
  state: string | null
  logo: string | null
}

export default function EditProgramPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [programData, setProgramData] = useState({
    id: '',
    name: '',
    city: '',
    state: '',
    logo: '',
  })

  // Fetch existing program data
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/director/program/edit')
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
        setProgramData({
          id: data.program.id,
          name: data.program.name || '',
          city: data.program.city || '',
          state: data.program.state || '',
          logo: data.program.logo || '',
        })
      } else if (!data.program) {
        // No program exists, redirect to onboarding
        router.push('/director/onboarding')
        return
      } else {
        setError(data.error || 'Failed to fetch program')
      }
    } catch (err) {
      console.error('Error fetching program:', err)
      setError('Failed to fetch program')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setProgramData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setProgramData(prev => ({ ...prev, logo: data.url }))
      } else {
        setError(data.error || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = () => {
    setProgramData(prev => ({ ...prev, logo: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!programData.name.trim()) {
      setError('Program name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/director/program', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: programData.name.trim(),
          city: programData.city.trim() || null,
          state: programData.state.trim() || null,
          logo: programData.logo || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/director/dashboard')
        }, 1500)
      } else {
        setError(data.error || 'Failed to update program')
      }
    } catch (err) {
      console.error('Error updating program:', err)
      setError('Failed to update program')
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              Program updated successfully! Redirecting...
            </p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">Edit Program</h1>
          <p className="text-gray-400 mb-8">
            Update your program information.
          </p>

          <div className="space-y-6">
            {/* Program Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Program Name *
              </label>
              <Input
                type="text"
                placeholder="e.g., Cali Rebels"
                value={programData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Logo
              </label>
              {programData.logo ? (
                <div className="flex items-start gap-4">
                  <div className="relative w-24 h-24 bg-white/5 rounded-xl overflow-hidden border border-white/10">
                    <Image
                      src={programData.logo}
                      alt="Logo preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Change logo
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-white/30 transition-colors ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-white mx-auto mb-2" />
                  )}
                  <p className="text-sm text-gray-400">Click to upload logo</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <Input
                  type="text"
                  placeholder="Los Angeles"
                  value={programData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                <Input
                  type="text"
                  placeholder="CA"
                  value={programData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  maxLength={2}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link href="/director/dashboard" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={isUploading || success}
                className="flex-1 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
