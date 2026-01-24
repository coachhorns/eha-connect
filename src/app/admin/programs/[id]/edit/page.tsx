'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, X, Loader2, ImageIcon } from 'lucide-react'
import { Card, Button, Input } from '@/components/ui'

interface Program {
  id: string
  name: string
  directorName: string | null
  directorEmail: string | null
  directorPhone: string | null
  logo: string | null
  city: string | null
  state: string | null
}

export default function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    directorName: '',
    directorEmail: '',
    directorPhone: '',
    city: '',
    state: '',
    logo: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/programs/${resolvedParams.id}/edit`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const res = await fetch(`/api/admin/programs/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          const program: Program = data.program
          setFormData({
            name: program.name || '',
            directorName: program.directorName || '',
            directorEmail: program.directorEmail || '',
            directorPhone: program.directorPhone || '',
            city: program.city || '',
            state: program.state || '',
            logo: program.logo || '',
          })
        } else {
          setError('Program not found')
        }
      } catch (err) {
        console.error('Error fetching program:', err)
        setError('Failed to load program')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchProgram()
    }
  }, [session, resolvedParams.id])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError('')

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()

      if (res.ok) {
        setFormData(prev => ({ ...prev, logo: data.url }))
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
    setFormData(prev => ({ ...prev, logo: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Program name is required')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/admin/programs/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          directorName: formData.directorName.trim() || null,
          directorEmail: formData.directorEmail.trim() || null,
          directorPhone: formData.directorPhone.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          logo: formData.logo || null,
        }),
      })

      if (res.ok) {
        router.push(`/admin/programs/${resolvedParams.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update program')
      }
    } catch (error) {
      console.error('Error updating program:', error)
      setError('Failed to update program')
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
            onClick={() => router.push('/admin/programs')}
            className="mt-4 text-eha-red hover:underline"
          >
            Back to Programs
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
          href={`/admin/programs/${resolvedParams.id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Program
        </Link>
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Edit Program</h1>
        <p className="mt-2 text-gray-400">
          Update program information
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Program Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Program Name *
            </label>
            <Input
              type="text"
              placeholder="e.g., Cali Rebels"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Logo
            </label>
            {formData.logo ? (
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 bg-[#1a3a6e] rounded-lg overflow-hidden">
                  <img
                    src={formData.logo}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Current logo</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-eha-red hover:underline mt-1"
                  >
                    Change logo
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-[#1a3a6e] rounded-lg p-8 text-center cursor-pointer hover:border-eha-red/50 transition-colors ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-eha-red animate-spin" />
                    <p className="text-sm text-gray-400">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#1a3a6e] rounded-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">
                      Click to upload logo
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF, WebP or SVG (max 5MB)
                    </p>
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City
              </label>
              <Input
                type="text"
                placeholder="Los Angeles"
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
                placeholder="CA"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                maxLength={2}
              />
            </div>
          </div>

          <hr className="border-[#1a3a6e]" />

          {/* Director Information */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Director Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Director Name
                </label>
                <Input
                  type="text"
                  placeholder="John Smith"
                  value={formData.directorName}
                  onChange={(e) => handleChange('directorName', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="director@example.com"
                    value={formData.directorEmail}
                    onChange={(e) => handleChange('directorEmail', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.directorPhone}
                    onChange={(e) => handleChange('directorPhone', e.target.value)}
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
              onClick={() => router.push(`/admin/programs/${resolvedParams.id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isUploading}
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
