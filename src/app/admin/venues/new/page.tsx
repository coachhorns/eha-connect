'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Plus, Trash2, Home, Globe } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'

interface CourtInput {
    id: string // temporary ID for React keys
    name: string
}

export default function NewVenuePage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        timezone: 'America/Chicago',
    })

    // Start with one court by default
    const [courts, setCourts] = useState<CourtInput[]>([
        { id: '1', name: 'Court 1' },
        { id: '2', name: 'Court 2' }
    ])

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        } else if (session?.user.role !== 'ADMIN') {
            router.push('/')
        }
    }, [status, session, router])

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleCourtChange = (id: string, value: string) => {
        setCourts(prev => prev.map(c => c.id === id ? { ...c, name: value } : c))
    }

    const addCourt = () => {
        const nextNum = courts.length + 1
        const newId = Math.random().toString(36).substr(2, 9)
        setCourts([...courts, { id: newId, name: `Court ${nextNum}` }])
    }

    const removeCourt = (id: string) => {
        setCourts(courts.filter(c => c.id !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!formData.name) {
            setError('Venue name is required')
            return
        }

        try {
            setIsSubmitting(true)

            const res = await fetch('/api/admin/venues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    courts: courts.filter(c => c.name.trim() !== '') // Send courts with names
                }),
            })

            if (res.ok) {
                router.push('/admin/venues')
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create venue')
            }
        } catch (error) {
            console.error('Error creating venue:', error)
            setError('Failed to create venue')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (status === 'loading') {
        return <div className="p-8 text-center text-text-muted">Loading...</div>
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/admin/venues"
                    className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Venues
                </Link>
                <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">Add Venue</h1>
                <p className="mt-2 text-text-muted">Add a new tournament location and configure its courts</p>
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
                        <h3 className="text-lg font-medium text-text-primary flex items-center gap-2 border-b border-border-default pb-2">
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
                        <div className="flex justify-between items-center border-b border-border-default pb-2">
                            <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
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
                                        className="p-2 text-text-muted hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}

                            {courts.length === 0 && (
                                <div className="text-center py-4 bg-surface-raised/20 rounded-lg border border-dashed border-border-default">
                                    <p className="text-text-muted text-sm">No courts added yet.</p>
                                    <button
                                        type="button"
                                        onClick={addCourt}
                                        className="mt-2 text-eha-red hover:underline text-sm"
                                    >
                                        Add default courts
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-text-muted">
                            Each court will be available for scheduling games. You can edit names later.
                        </p>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => router.push('/admin/venues')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isSubmitting}
                            className="flex-1"
                        >
                            Create Venue
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
