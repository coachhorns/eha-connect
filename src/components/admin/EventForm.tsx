'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { X, Plus, Save, ArrowLeft, Users } from 'lucide-react'
import { Card, Button, Input, Select, Badge } from '@/components/ui'
import { states, ageGroups as ageGroupOptions, divisions as divisionOptions } from '@/lib/constants'

interface EventFormData {
  name: string
  type: string
  description: string
  venue: string
  address: string
  city: string
  state: string
  startDate: string
  endDate: string
  ageGroups: string[]
  divisions: string[]
  entryFee: string
  bannerImage: string
  isPublished: boolean
}

interface EventInput {
  id?: string
  name?: string
  type?: string
  description?: string | null
  venue?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  startDate?: string | Date
  endDate?: string | Date
  ageGroups?: string[]
  divisions?: string[]
  entryFee?: number | string | null
  bannerImage?: string | null
  isPublished?: boolean
}

interface EventFormProps {
  initialData?: EventInput
  isEditing?: boolean
}

const eventTypeOptions = [
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'LEAGUE', label: 'League' },
  { value: 'SHOWCASE', label: 'Showcase' },
  { value: 'CAMP', label: 'Camp' },
]

export default function EventForm({ initialData, isEditing = false }: EventFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    type: 'TOURNAMENT',
    description: '',
    venue: '',
    address: '',
    city: '',
    state: '',
    startDate: '',
    endDate: '',
    ageGroups: [],
    divisions: [],
    entryFee: '',
    bannerImage: '',
    isPublished: false,
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'TOURNAMENT',
        description: initialData.description || '',
        venue: initialData.venue || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        startDate: initialData.startDate
          ? format(new Date(initialData.startDate), "yyyy-MM-dd'T'HH:mm")
          : '',
        endDate: initialData.endDate
          ? format(new Date(initialData.endDate), "yyyy-MM-dd'T'HH:mm")
          : '',
        ageGroups: initialData.ageGroups || [],
        divisions: initialData.divisions || [],
        entryFee: initialData.entryFee?.toString() || '',
        bannerImage: initialData.bannerImage || '',
        isPublished: initialData.isPublished || false,
      })
    }
  }, [initialData])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleToggleAgeGroup = (ageGroup: string) => {
    setFormData((prev) => ({
      ...prev,
      ageGroups: prev.ageGroups.includes(ageGroup)
        ? prev.ageGroups.filter((ag) => ag !== ageGroup)
        : [...prev.ageGroups, ageGroup],
    }))
  }

  const handleToggleDivision = (division: string) => {
    setFormData((prev) => ({
      ...prev,
      divisions: prev.divisions.includes(division)
        ? prev.divisions.filter((d) => d !== division)
        : [...prev.divisions, division],
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required'
    }
    if (!formData.type) {
      newErrors.type = 'Event type is required'
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }
    if (formData.entryFee && isNaN(parseFloat(formData.entryFee))) {
      newErrors.entryFee = 'Entry fee must be a valid number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)

    try {
      const url = isEditing
        ? `/api/admin/events/${initialData?.id}`
        : '/api/admin/events'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        router.push('/admin/events')
        router.refresh()
      } else {
        const data = await res.json()
        setErrors({ submit: data.error || 'Failed to save event' })
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const stateOptions = [{ value: '', label: 'Select State' }, ...states]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="flex items-center gap-3">
          {isEditing && initialData?.id && (
            <Link href={`/admin/events/${initialData.id}/teams`}>
              <Button type="button" variant="outline" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Manage Teams
              </Button>
            </Link>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              name="isPublished"
              checked={formData.isPublished}
              onChange={handleChange}
              className="w-4 h-4 rounded border-[#1a3a6e] bg-[#1A1A2E] text-eha-red focus:ring-eha-red"
            />
            Published
          </label>
          <Button type="submit" isLoading={isSubmitting} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isEditing ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{errors.submit}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Event Details</h2>
            <div className="space-y-4">
              <Input
                label="Event Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="e.g., EHA Summer Showcase 2024"
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Event Type"
                  name="type"
                  options={eventTypeOptions}
                  value={formData.type}
                  onChange={handleChange}
                  error={errors.type}
                />
                <Input
                  label="Entry Fee ($)"
                  name="entryFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.entryFee}
                  onChange={handleChange}
                  error={errors.entryFee}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-[#1A1A2E] border border-[#1a3a6e] rounded-lg text-white placeholder-gray-500 transition-colors duration-200 resize-none"
                  placeholder="Describe the event..."
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Date & Time</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Start Date & Time"
                name="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={handleChange}
                error={errors.startDate}
              />
              <Input
                label="End Date & Time"
                name="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={handleChange}
                error={errors.endDate}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Location</h2>
            <div className="space-y-4">
              <Input
                label="Venue Name"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g., Main Street Sports Complex"
              />
              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main Street"
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
                <Select
                  label="State"
                  name="state"
                  options={stateOptions}
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Age Groups</h2>
            <div className="flex flex-wrap gap-2">
              {ageGroupOptions.map((ageGroup) => (
                <button
                  key={ageGroup}
                  type="button"
                  onClick={() => handleToggleAgeGroup(ageGroup)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.ageGroups.includes(ageGroup)
                      ? 'bg-eha-red text-white'
                      : 'bg-[#1a3a6e] text-gray-400 hover:text-white'
                  }`}
                >
                  {ageGroup}
                </button>
              ))}
            </div>
            {formData.ageGroups.length > 0 && (
              <p className="mt-3 text-sm text-gray-500">
                Selected: {formData.ageGroups.join(', ')}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Divisions</h2>
            <div className="flex flex-wrap gap-2">
              {divisionOptions.map((division) => (
                <button
                  key={division}
                  type="button"
                  onClick={() => handleToggleDivision(division)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.divisions.includes(division)
                      ? 'bg-eha-red text-white'
                      : 'bg-[#1a3a6e] text-gray-400 hover:text-white'
                  }`}
                >
                  {division}
                </button>
              ))}
            </div>
            {formData.divisions.length > 0 && (
              <p className="mt-3 text-sm text-gray-500">
                Selected: {formData.divisions.join(', ')}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Banner Image</h2>
            <Input
              name="bannerImage"
              value={formData.bannerImage}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              helperText="Enter the URL of the banner image"
            />
            {formData.bannerImage && (
              <div className="mt-4">
                <img
                  src={formData.bannerImage}
                  alt="Banner preview"
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </form>
  )
}
