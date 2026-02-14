'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import EventForm from '@/components/admin/EventForm'

interface Event {
  id: string
  name: string
  slug: string
  type: string
  description: string | null
  venue: string | null
  address: string | null
  city: string | null
  state: string | null
  startDate: string
  endDate: string
  registrationDeadline: string | null
  divisions: string[]
  entryFee: number | null
  bannerImage: string | null
  flyerImage: string | null
  isPublished: boolean
  isActive: boolean
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/events/${resolvedParams.id}/edit`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/admin/events/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          setEvent(data.event)
        } else {
          setError('Event not found')
        }
      } catch (err) {
        setError('Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchEvent()
    }
  }, [session, resolvedParams.id])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-page-bg text-text-primary w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/admin/events')}
            className="mt-4 text-eha-red hover:underline"
          >
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  if (!event) {
    return null
  }

  return (
    <div className="min-h-screen bg-page-bg text-text-primary w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl tracking-tighter font-bold text-text-primary uppercase">Edit Event</h1>
        <p className="mt-3 text-sm text-text-muted font-bold uppercase tracking-widest">
          Update details for {event.name}
        </p>
      </div>

      <EventForm initialData={event} isEditing />
    </div>
  )
}
