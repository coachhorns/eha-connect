'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, ImageIcon, X } from 'lucide-react'
import { Card, Button, Input } from '@/components/ui'

export default function DirectorOnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    logo: '',
  })

  // Strict auth check - only PROGRAM_DIRECTOR allowed
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin?callbackUrl=/director/onboarding')
    return null
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    router.push('/')
    return null
  }

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
      const res = await fetch('/api/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          directorName: session.user.name || null,
          directorEmail: session.user.email || null,
          directorPhone: null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          logo: formData.logo || null,
        }),
      })

      if (res.ok) {
        router.push('/director/dashboard')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create program')
      }
    } catch (err) {
      console.error('Error creating program:', err)
      setError('Failed to create program')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Image
            src="/images/main.png"
            alt="EHA Connect"
            width={200}
            height={200}
            className="w-auto h-40 mx-auto mb-2 object-contain"
            priority
          />
          <h1 className="text-2xl font-bold text-white">Set Up Your Program</h1>
          <p className="text-gray-400 mt-2">
            Welcome, {session.user.name || 'Director'}! Let's create your program.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  <p className="text-sm text-gray-400">Logo uploaded successfully</p>
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
                    <p className="text-sm text-gray-400">Click to upload logo</p>
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

          {/* Director Info (auto-filled, shown for transparency) */}
          <div className="bg-[#1a3a6e]/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Director Information (from your account)</p>
            <p className="text-white">{session.user.name || 'Not provided'}</p>
            <p className="text-gray-400 text-sm">{session.user.email}</p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isUploading}
            className="w-full"
          >
            Create Program
          </Button>
        </form>
      </Card>
    </div>
  )
}
