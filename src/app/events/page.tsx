'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Users, Trophy } from 'lucide-react'
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

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <Card className="overflow-hidden">
                <div className="aspect-[16/9] bg-[#1a3a6e]" />
                <div className="p-5">
                  <div className="h-5 bg-[#1a3a6e] rounded w-3/4 mb-3" />
                  <div className="h-4 bg-[#1a3a6e] rounded w-1/2 mb-2" />
                  <div className="h-4 bg-[#1a3a6e] rounded w-2/3" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.slug}`}>
              <Card variant="hover" className="overflow-hidden h-full flex flex-col group">
                {/* Top Section - Image or Placeholder */}
                <div className="relative aspect-[16/9] overflow-hidden">
                  {event.bannerImage ? (
                    <div className="w-full h-full p-2 flex items-center justify-center">
                      <img
                        src={event.bannerImage}
                        alt={event.name}
                        className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-eha-red/20 via-[#1a3a6e] to-[#0F0F1A] flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-white/80 text-sm font-medium uppercase tracking-wider">
                          {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-white text-4xl font-bold">
                          {new Date(event.startDate).getDate()}
                        </p>
                        <p className="text-white/60 text-sm">
                          {new Date(event.startDate).getFullYear()}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Event Type Badge Overlay */}
                  <div className="absolute top-3 left-3">
                    <Badge variant={getEventTypeBadgeVariant(event.type) as any} size="sm">
                      {getEventTypeLabel(event.type)}
                    </Badge>
                  </div>
                </div>

                {/* Bottom Section - Info */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Event Name */}
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-eha-red transition-colors">
                    {event.name}
                  </h3>

                  {/* Age Group Badges */}
                  {event.ageGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {event.ageGroups.slice(0, 4).map((ag) => (
                        <Badge key={ag} variant="default" size="sm">
                          {ag}
                        </Badge>
                      ))}
                      {event.ageGroups.length > 4 && (
                        <Badge variant="default" size="sm">
                          +{event.ageGroups.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Date & Location */}
                  <div className="space-y-1.5 text-sm text-gray-400 mt-auto">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-eha-red flex-shrink-0" />
                      <span>
                        {formatDate(event.startDate)}
                        {event.endDate !== event.startDate && (
                          <> - {formatDate(event.endDate)}</>
                        )}
                      </span>
                    </div>
                    {(event.city || event.state || event.venue) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-eha-red flex-shrink-0" />
                        <span className="truncate">
                          {[event.venue, event.city, event.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats Footer */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#1a3a6e]">
                    <span className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Users className="w-4 h-4" />
                      {event._count.teams} Teams
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Trophy className="w-4 h-4" />
                      {event._count.games} Games
                    </span>
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
