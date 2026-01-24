'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Plus, Trash2, Home, AlertTriangle } from 'lucide-react'
import { Card, Button, Input, Modal } from '@/components/ui'

interface CourtInput {
  id: string
  name: string
  isNew?: boolean
}

interface Venue {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  timezone: string
  courts: Array<{ id: string; name: string }>
}

export default function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    timezone: 'America/Chicago',
  })

  const [courts, setCourts] = useState<CourtInput[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/venues/${resolvedParams.id}/edit`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const res = await fetch(`/api/admin/venues/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          const venue: Venue = data.venue
          setFormData({
            name: venue.name || '',
            address: venue.address || '',
            city: venue.city || '',
            state: venue.state || '',
            zip: venue.zip || '',
            timezone: venue.timezone || 'America/Chicago',
          })
          setCourts(
            venue.courts.map((c) => ({
              id: c.id,
              name: c.name,
              isNew: false,
            }))
          )
        } else {
          setError('Venue not found')
        }
      } catch (err) {
        console.error('Error fetching venue:', err)
        setError('Failed to load venue')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchVenue()
    }
  }, [session, resolvedParams.id])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleCourtChange = (id: string, value: string) => {
    setCourts((prev) => prev.map((c) => (c.id === id ? { ...c, name: value } : c)))
  }

  const addCourt = () => {
    const nextNum = courts.length + 1
    const newId = `new-${Math.random().toString(36).substr(2, 9)}`
    setCourts([...courts, { id: newId, name: `Court ${nextNum}`, isNew: true }])
  }

  const removeCourt = (id: string) => {
    setCourts(courts.filter((c) => c.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Venue name is required')
      return
    }

    try {
      setIsSubmitting(true)

      const res = await fetch(`/api/admin/venues/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          courts: courts.filter((c) => c.name.trim() !== ''),
        }),
      })

      if (res.ok) {
        router.push('/admin/venues')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update venue')
      }
    } catch (err) {
      console.error('Error updating venue:', err)
      setError('Failed to update venue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/admin/venues/${resolvedParams.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/admin/venues')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete venue')
        setShowDeleteModal(false)
      }
    } catch (err) {
      console.error('Error deleting venue:', err)
      setError('Failed to delete venue')
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
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
            onClick={() => router.push('/admin/venues')}
            className="mt-4 text-eha-red hover:underline"
          >
            Back to Venues
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
          href="/admin/venues"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Venues
        </Link>
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">
          Edit Venue
        </h1>
        <p className="mt-2 text-gray-400">
          Update venue details and manage courts
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-[#1a3a6e] pb-2">
              <MapPin className="w-5 h-5 text-eha-red" />
              Location Details
            </h3>

            <Input
              label="Venue Name *"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Target Center"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Minneapolis"
              />
              <Input
                label="State"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="MN"
              />
            </div>

            <Input
              label="Address (Optional)"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="600 N 1st Ave"
            />
          </div>

          {/* Courts Configuration */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-[#1a3a6e] pb-2">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Home className="w-5 h-5 text-eha-red" />
                Courts
              </h3>
              <button
                type="button"
                onClick={addCourt}
                className="text-sm text-eha-red hover:text-red-400 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Court
              </button>
            </div>

            <div className="space-y-3">
              {courts.map((court, index) => (
                <div key={court.id} className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder={`Court Name (e.g. Court ${index + 1})`}
                      value={court.name}
                      onChange={(e) => handleCourtChange(court.id, e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCourt(court.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    title="Remove court"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {courts.length === 0 && (
                <div className="text-center py-4 bg-[#153361]/20 rounded-lg border border-dashed border-[#1a3a6e]">
                  <p className="text-gray-400 text-sm">No courts configured.</p>
                  <button
                    type="button"
                    onClick={addCourt}
                    className="mt-2 text-eha-red hover:underline text-sm"
                  >
                    Add a court
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Removing a court with scheduled games is not allowed. Reassign games
              first.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-between">
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Venue
            </Button>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/admin/venues')}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Venue"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-yellow-400">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-medium">Are you sure you want to delete this venue?</p>
              <p className="text-sm text-gray-400 mt-1">
                This will also delete all courts associated with this venue. This
                action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete Venue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
