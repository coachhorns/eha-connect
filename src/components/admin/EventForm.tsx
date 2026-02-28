'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { safeParseDate } from '@/lib/timezone'
import Link from 'next/link'
import { X, Plus, Save, ArrowLeft, Users, Sparkles, Loader2 } from 'lucide-react'
import { Card, Button, Input, Select, Badge, ImageUpload } from '@/components/ui'
import { states, divisions as divisionOptions } from '@/lib/constants'

interface Venue {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
}

interface EventFormData {
  name: string
  type: string
  description: string
  venueId: string
  venue: string
  address: string
  city: string
  state: string
  startDate: string
  endDate: string
  registrationDeadline: string
  divisions: string[]
  entryFee: string
  bannerImage: string
  flyerImage: string
  isPublished: boolean
  isNcaaCertified: boolean
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
  registrationDeadline?: string | Date | null
  divisions?: string[]
  entryFee?: number | string | null
  bannerImage?: string | null
  flyerImage?: string | null
  isPublished?: boolean
  isNcaaCertified?: boolean
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
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoadingVenues, setIsLoadingVenues] = useState(true)
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAiInput, setShowAiInput] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    type: 'TOURNAMENT',
    description: '',
    venueId: '',
    venue: '',
    address: '',
    city: '',
    state: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    divisions: [],
    entryFee: '',
    bannerImage: '',
    flyerImage: '',
    isPublished: false,
    isNcaaCertified: false,
  })

  // Fetch venues on mount
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const res = await fetch('/api/admin/venues')
        if (res.ok) {
          const data = await res.json()
          setVenues(data.venues || [])
        }
      } catch (err) {
        console.error('Failed to fetch venues:', err)
      } finally {
        setIsLoadingVenues(false)
      }
    }
    fetchVenues()
  }, [])

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'TOURNAMENT',
        description: initialData.description || '',
        venueId: '',
        venue: initialData.venue || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        startDate: initialData.startDate
          ? format(safeParseDate(initialData.startDate), 'yyyy-MM-dd')
          : '',
        endDate: initialData.endDate
          ? format(safeParseDate(initialData.endDate), 'yyyy-MM-dd')
          : '',
        registrationDeadline: initialData.registrationDeadline
          ? format(safeParseDate(initialData.registrationDeadline), 'yyyy-MM-dd')
          : '',
        divisions: initialData.divisions || [],
        entryFee: initialData.entryFee?.toString() || '',
        bannerImage: initialData.bannerImage || '',
        flyerImage: initialData.flyerImage || '',
        isPublished: initialData.isPublished || false,
        isNcaaCertified: initialData.isNcaaCertified || false,
      })
    }
  }, [initialData])

  // Match venue from initialData after venues are loaded
  useEffect(() => {
    if (venues.length > 0 && initialData?.venue && !formData.venueId) {
      const matchedVenue = venues.find((v) => v.name === initialData.venue)
      if (matchedVenue) {
        setFormData((prev) => ({
          ...prev,
          venueId: matchedVenue.id,
        }))
      }
    }
  }, [venues, initialData?.venue, formData.venueId])

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

  const handleToggleDivision = (division: string) => {
    setFormData((prev) => ({
      ...prev,
      divisions: prev.divisions.includes(division)
        ? prev.divisions.filter((d) => d !== division)
        : [...prev.divisions, division],
    }))
  }

  const handleVenueSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const venueId = e.target.value
    const selectedVenue = venues.find((v) => v.id === venueId)

    if (selectedVenue) {
      setFormData((prev) => ({
        ...prev,
        venueId,
        venue: selectedVenue.name,
        address: selectedVenue.address || '',
        city: selectedVenue.city || '',
        state: selectedVenue.state || '',
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        venueId: '',
      }))
    }
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

  const generateDescription = async () => {
    if (!aiPrompt.trim()) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/admin/events/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          eventName: formData.name,
          eventType: formData.type,
          divisions: formData.divisions,
        }),
      })
      const data = await res.json()
      if (res.ok && data.description) {
        setFormData(prev => ({ ...prev, description: data.description }))
        setAiPrompt('')
        setShowAiInput(false)
      } else {
        alert(data.error || 'Failed to generate description')
      }
    } catch {
      alert('Failed to generate description')
    } finally {
      setIsGenerating(false)
    }
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
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
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
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              name="isNcaaCertified"
              checked={formData.isNcaaCertified}
              onChange={handleChange}
              className="w-4 h-4 rounded-sm border-white/10 bg-[#0A1D37] text-eha-red focus:ring-eha-red"
            />
            NCAA Certified
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              name="isPublished"
              checked={formData.isPublished}
              onChange={handleChange}
              className="w-4 h-4 rounded-sm border-border-default bg-page-bg text-eha-red focus:ring-eha-red"
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
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-4">
          <p className="text-red-400 text-sm">{errors.submit}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-sm border border-border-subtle">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red mb-6">Event Details</h2>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAiInput(!showAiInput)}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-eha-red hover:text-eha-red/80 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {showAiInput ? 'Cancel' : 'AI Generate'}
                  </button>
                </div>

                {showAiInput && (
                  <div className="mb-3 p-3 bg-eha-red/5 border border-eha-red/20 rounded-sm">
                    <p className="text-xs text-text-muted mb-2">
                      Briefly describe the event and AI will write a professional description.
                    </p>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-page-bg border border-border-default rounded-sm text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-eha-red mb-2"
                      placeholder="e.g., 3-day elite tournament for top 17U teams, college coaches will be scouting..."
                      disabled={isGenerating}
                    />
                    <button
                      type="button"
                      onClick={generateDescription}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-eha-red hover:bg-eha-red/90 text-white text-xs font-bold rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Generate Description</>
                      )}
                    </button>
                  </div>
                )}

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-page-bg border border-border-default rounded-sm text-text-primary placeholder-text-muted transition-colors duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-eha-red"
                  placeholder="Describe the event..."
                />
              </div>
            </div>
          </Card>

          <Card className="rounded-sm border border-border-subtle">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red mb-6">Dates</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="Start Date"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                error={errors.startDate}
              />
              <Input
                label="End Date"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                error={errors.endDate}
              />
              <Input
                label="Registration Deadline"
                name="registrationDeadline"
                type="date"
                value={formData.registrationDeadline}
                onChange={handleChange}
                error={errors.registrationDeadline}
              />
            </div>
            <p className="mt-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Registration will close automatically after the deadline
            </p>
          </Card>

          <Card className="rounded-sm border border-border-subtle">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red mb-6">Location</h2>
            <div className="space-y-4">
              <Select
                label="Venue"
                name="venueId"
                options={[
                  { value: '', label: isLoadingVenues ? 'Loading venues...' : 'Select a venue' },
                  ...venues.map((v) => ({ value: v.id, label: v.name })),
                ]}
                value={formData.venueId}
                onChange={handleVenueSelect}
                disabled={isLoadingVenues}
              />
              {formData.venueId && (
                <div className="text-sm text-text-muted bg-surface-raised/50 border border-border-subtle rounded-sm p-3">
                  <p className="font-bold text-text-primary uppercase tracking-wide">{formData.venue}</p>
                  {formData.address && <p className="mt-1">{formData.address}</p>}
                  {(formData.city || formData.state) && (
                    <p>
                      {formData.city}
                      {formData.city && formData.state && ', '}
                      {formData.state}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="rounded-sm border border-border-subtle">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red mb-6">Divisions</h2>
            <div className="flex flex-wrap gap-2">
              {divisionOptions.map((division) => (
                <button
                  key={division}
                  type="button"
                  onClick={() => handleToggleDivision(division)}
                  className={`px-3 py-1.5 rounded-sm text-sm font-bold uppercase tracking-wide transition-colors ${formData.divisions.includes(division)
                      ? 'bg-eha-red text-white'
                      : 'bg-surface-raised/50 border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-glass'
                    }`}
                >
                  {division}
                </button>
              ))}
              {/* Show custom divisions that aren't in the standard list */}
              {formData.divisions
                .filter((d) => !divisionOptions.includes(d))
                .map((division) => (
                  <button
                    key={division}
                    type="button"
                    onClick={() => handleToggleDivision(division)}
                    className="px-3 py-1.5 rounded-sm text-sm font-bold uppercase tracking-wide transition-colors bg-eha-red text-white"
                  >
                    {division}
                  </button>
                ))}
            </div>
            {/* Custom Division Input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Custom division name..."
                id="customDivisionInput"
                className="flex-1 px-3 py-1.5 bg-page-bg border border-border-default rounded-sm text-text-primary placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-eha-red"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const input = e.target as HTMLInputElement
                    const val = input.value.trim()
                    if (val && !formData.divisions.includes(val)) {
                      handleToggleDivision(val)
                      input.value = ''
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('customDivisionInput') as HTMLInputElement
                  const val = input?.value.trim()
                  if (val && !formData.divisions.includes(val)) {
                    handleToggleDivision(val)
                    input.value = ''
                  }
                }}
                className="px-3 py-1.5 rounded-sm text-sm font-bold uppercase tracking-wide bg-surface-raised/50 border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-glass transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {formData.divisions.length > 0 && (
              <p className="mt-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                Selected: {formData.divisions.join(', ')}
              </p>
            )}
          </Card>

          <Card className="rounded-sm border border-border-subtle">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red mb-6">Banner Image</h2>
            <ImageUpload
              value={formData.bannerImage}
              onChange={(url) => setFormData((prev) => ({ ...prev, bannerImage: url }))}
              aspectRatio="16/9"
              helperText="Recommended: 1920x1080"
            />
          </Card>

        </div>
      </div>
    </form>
  )
}
