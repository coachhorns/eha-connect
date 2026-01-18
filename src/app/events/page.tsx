'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Users, Trophy, ChevronRight } from 'lucide-react'
import { Card, Badge, Button, Select } from '@/components/ui'
import { formatDate } from '@/lib/utils'

interface Event {
  id: string
  slug: string
  name: string
  type: string
  description?: string | null
  venue?: string | null
  city?: string | null
  state?: string | null
  startDate: string
  endDate: string
  ageGroups: string[]
  bannerImage?: string | null
  _count: {
    teams: number
    games: number
  }
}

const eventTypes = [
  { value: '', label: 'All Types' },
  { value: 'TOURNAMENT', label: 'Tournaments' },
  { value: 'LEAGUE', label: 'Leagues' },
  { value: 'SHOWCASE', label: 'Showcases' },
  { value: 'CAMP', label: 'Camps' },
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [eventType, setEventType] = useState('')
  const [showUpcoming, setShowUpcoming] = useState(true)

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (eventType) params.set('type', eventType)
      if (showUpcoming) params.set('upcoming', 'true')

      const res = await fetch(`/api/events?${params}`)
      const data = await res.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [eventType, showUpcoming])

  const getEventTypeLabel = (type: string) => {
    const found = eventTypes.find((t) => t.value === type)
    return found?.label || type
  }

  const getEventTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'TOURNAMENT':
        return 'orange'
      case 'LEAGUE':
        return 'info'
      case 'SHOWCASE':
        return 'gold'
      case 'CAMP':
        return 'success'
      default:
        return 'default'
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 uppercase tracking-wider">
          <Calendar className="w-8 h-8 text-white" />
          Events
        </h1>
        <p className="mt-2 text-gray-400">
          Upcoming tournaments, leagues, and showcases
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-8 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpcoming(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showUpcoming
                  ? 'bg-eha-red text-white'
                  : 'bg-[#1a3a6e] text-gray-400 hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setShowUpcoming(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !showUpcoming
                  ? 'bg-eha-red text-white'
                  : 'bg-[#1a3a6e] text-gray-400 hover:text-white'
              }`}
            >
              All Events
            </button>
          </div>

          <Select
            options={eventTypes}
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-40"
          />
        </div>
      </Card>

      {/* Events List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <Card className="p-6">
                <div className="flex gap-4">
                  <div className="w-32 h-20 bg-[#1a3a6e] rounded-lg" />
                  <div className="flex-1">
                    <div className="h-5 bg-[#1a3a6e] rounded w-1/3 mb-2" />
                    <div className="h-4 bg-[#1a3a6e] rounded w-1/2 mb-4" />
                    <div className="h-4 bg-[#1a3a6e] rounded w-1/4" />
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No events found</p>
          <p className="text-gray-500 mt-2">Check back later for upcoming events</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.slug}`}>
              <Card variant="hover" className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-24 text-center">
                    <div className="bg-eha-red/10 rounded-lg p-3">
                      <p className="text-white text-sm font-medium uppercase">
                        {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-white text-3xl font-bold">
                        {new Date(event.startDate).getDate()}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {new Date(event.startDate).getFullYear()}
                      </p>
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getEventTypeBadgeVariant(event.type) as any} size="sm">
                            {getEventTypeLabel(event.type)}
                          </Badge>
                          {event.ageGroups.slice(0, 3).map((ag) => (
                            <Badge key={ag} variant="default" size="sm">
                              {ag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{event.name}</h3>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(event.startDate)}
                            {event.endDate !== event.startDate && (
                              <> - {formatDate(event.endDate)}</>
                            )}
                          </span>
                          {(event.city || event.state || event.venue) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {[event.venue, event.city, event.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="flex items-center gap-1 text-gray-400">
                            <Users className="w-4 h-4" />
                            {event._count.teams} Teams
                          </span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Trophy className="w-4 h-4" />
                            {event._count.games} Games
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-6 h-6 text-gray-500 hidden md:block" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
