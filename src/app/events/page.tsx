'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  MapPin,
  Users,
  Eye,
  Radio,
  Mic2,
  BarChart3,
  Medal,
  ShieldCheck,
  Smartphone,
  LineChart,
  Calendar as CalendarIcon,
  ChevronDown
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { safeParseDate } from '@/lib/timezone'

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
  bannerImage?: string | null
  _count: {
    teams: number
    games: number
  }
}

// Sub-components adapted from the snippet
const EventCard = ({
  event,
  viewDetails,
  register,
  isFeatured = false
}: {
  event: Event;
  viewDetails: () => void;
  register: (e: React.MouseEvent) => void;
  isFeatured?: boolean;
}) => {
  const startDate = new Date(event.startDate)

  return (
    <div className="group relative flex flex-col lg:flex-row bg-[#153361] border border-white/10 rounded-sm overflow-hidden transition-all hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
      {/* Image Section */}
      <div className="lg:w-1/3 h-64 lg:h-auto relative overflow-hidden bg-[#0a1628]">
        <div className="absolute inset-0 bg-[#0a1628]/40 z-10"></div>
        {event.bannerImage ? (
          <img
            src={event.bannerImage}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
            alt={event.name}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-eha-red/20 to-eha-navy">
            <span className="text-4xl font-bold text-white/10">{startDate.getDate()}</span>
          </div>
        )}

        <div className="absolute top-6 left-6 z-20">
          <Badge variant={event.type === 'TOURNAMENT' ? 'orange' : 'default'} className="uppercase tracking-[0.2em] font-extrabold text-[10px]">
            {event.type}
          </Badge>
        </div>

        {/* Live Feature Badge (Mock for now or derive from data) */}
        <div className="absolute bottom-6 left-6 z-20">
          <div className="flex items-center gap-2 text-white">
            <Radio className="w-4 h-4 text-eha-red animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">Live Coverage</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-8 lg:p-10 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[11px] font-bold text-eha-red uppercase tracking-widest mb-2 block">
                {formatDate(event.startDate)}
              </span>
              <h4 className="text-2xl lg:text-3xl font-heading font-bold text-white group-hover:text-eha-red transition-colors">
                {event.name}
              </h4>
            </div>
            <div className="text-right hidden sm:block">
              <span className="block text-xl font-black text-white">{event._count.teams}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teams</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 lg:gap-8 py-6 border-y border-white/10">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs font-bold text-white">{event.venue || 'TBD'}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {[event.city, event.state].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs font-bold text-white">{event._count.teams} Teams</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Registered</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs font-bold text-white">Verified</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scouts attending</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-green-500">
              Registration Open
            </span>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <Button variant="secondary" onClick={viewDetails} className="flex-1 sm:flex-none">View Details</Button>
            <Button variant="primary" onClick={(e) => register(e)} className="flex-1 sm:flex-none">Register Team</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const UpcomingEventRow = ({ event }: { event: Event }) => {
  const startDate = new Date(event.startDate)

  return (
    <Link href={`/events/${event.slug}`} className="block">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-6 bg-[#0a1628] border border-white/5 hover:bg-[#153361] hover:border-white/20 transition-all group rounded-lg mb-4">
        <div className="md:col-span-2 flex md:block items-center justify-between">
          <span className="block text-sm font-bold text-white">
            {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2 md:ml-0">
            {startDate.getFullYear()}
          </span>
        </div>
        <div className="md:col-span-4">
          <h5 className="text-sm font-bold text-white group-hover:text-eha-red transition-colors font-heading text-lg md:text-sm">
            {event.name}
          </h5>
          <p className="text-xs text-gray-400">
            {[event.venue, event.city, event.state].filter(Boolean).join(' • ')}
          </p>
        </div>
        <div className="md:col-span-2 hidden md:block">
          <span className="text-[10px] font-extrabold text-gray-600 uppercase tracking-widest block mb-1">Status</span>
          <span className="text-xs font-bold uppercase text-eha-red">Open</span>
        </div>
        <div className="md:col-span-2 hidden md:flex gap-3">
          <Radio className="w-4 h-4 text-gray-500" />
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <Medal className="w-4 h-4 text-gray-500" />
        </div>
        <div className="col-span-12 md:col-span-2 text-right mt-4 md:mt-0">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white group-hover:text-eha-red underline underline-offset-4 decoration-eha-red/50">
            View Event
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const days = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    return { days, firstDay }
  }

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + offset)
    setCurrentDate(newDate)
  }

  const { days: daysInMonth, firstDay } = getDaysInMonth(currentDate)
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1
    if (day > 0 && day <= daysInMonth) return day
    return null
  })

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events')
        const data = await res.json()
        setEvents(data.events || [])
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvents()
  }, [])

  // In a real app, separate featured vs upcoming based on logic (e.g., featured flag or next tournament)
  const featuredEvents = events.slice(0, 2)
  const upcomingEvents = events.slice(2)

  return (
    <div className="min-h-screen bg-[#0A1D37]">
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-[#0a1628] border-b border-white/5 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#153361] border border-white/10 rounded-full shadow-lg">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-eha-red">2024–25 Season</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-heading font-bold tracking-tighter text-white leading-none">
                Circuit Events
              </h1>
              <p className="text-lg lg:text-xl text-gray-400 max-w-xl font-light leading-relaxed">
                Explore sanctioned tournaments, showcases, and combines. Verified scouting presence at all listed events.
              </p>
            </div>

            {/* View Toggles */}
            <div className="flex gap-4">
              <div className="bg-[#153361] p-1.5 rounded-lg flex border border-white/10">
                <button
                  className={`px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors ${viewMode === 'list' ? 'bg-eha-red text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setViewMode('list')}
                >
                  List View
                </button>
                <button
                  className={`px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-eha-red text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setViewMode('calendar')}
                >
                  Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Filters */}
      <section className="py-8 bg-[#0A1D37] border-b border-white/5 sticky top-20 z-40 shadow-xl backdrop-blur-md bg-opacity-90">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="flex gap-6">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-eha-red transition-colors" />
              <input
                type="text"
                placeholder="Search event or city..."
                className="w-full pl-12 pr-4 py-4 bg-[#0a1628] border border-white/10 text-white text-sm focus:outline-none focus:border-eha-red/50 focus:ring-1 focus:ring-eha-red/50 rounded-none transition-all placeholder:text-gray-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="bg-white text-[#0A1D37] px-8 py-4 text-xs font-extrabold uppercase tracking-widest hover:bg-eha-red hover:text-white transition-colors whitespace-nowrap">
              Search Events
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      {/* Main Content */}
      <section className="py-24 bg-[#0A1D37]">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">

          {viewMode === 'list' ? (
            <>
              {/* Featured Events */}
              <div className="mb-12 flex items-center gap-6">
                <h3 className="text-2xl font-bold text-white font-heading">Featured Tournaments</h3>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>

              <div className="grid grid-cols-1 gap-10 mb-24">
                {isLoading ? (
                  <div className="h-64 bg-[#0a1628] animate-pulse rounded-lg border border-white/5"></div>
                ) : featuredEvents.length > 0 ? (
                  featuredEvents.map((event) => (
                    <Link key={event.id} href={`/events/${event.slug}`}>
                      <EventCard
                        event={event}
                        viewDetails={() => { }}
                        register={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/events/${event.slug}/register`); }}
                        isFeatured={true}
                      />
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-20 text-gray-500">No events found</div>
                )}
              </div>

              {/* Upcoming Events List */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white font-heading mb-8">Upcoming Tournaments</h3>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <UpcomingEventRow key={event.id} event={event} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Calendar View Implementation */
            <div className="bg-[#0a1628] border border-white/10 rounded-lg p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-2xl font-bold text-white font-heading">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-full text-white transition-colors">
                    <ChevronDown className="w-6 h-6 rotate-90" />
                  </button>
                  <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-full text-white transition-colors">
                    <ChevronDown className="w-6 h-6 -rotate-90" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-4 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5">
                {days.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[120px] bg-[#0a1628]/50" />

                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                  const isToday = new Date().toDateString() === date.toDateString()

                  // Find events on this day
                  // Note: simple match, in real app consider timezones
                  const dayEvents = events.filter(e => {
                    const eDate = safeParseDate(e.startDate);
                    return eDate.getDate() === day &&
                      eDate.getMonth() === currentDate.getMonth() &&
                      eDate.getFullYear() === currentDate.getFullYear();
                  });

                  return (
                    <div key={i} className="min-h-[120px] p-2 bg-[#0a1628] hover:bg-[#153361] transition-colors relative group">
                      <span className={`text-xs font-bold block mb-2 ${isToday ? 'text-eha-red' : 'text-gray-500'}`}>
                        {day}
                      </span>

                      <div className="space-y-1">
                        {dayEvents.map(event => (
                          <Link key={event.id} href={`/events/${event.slug}`} className="block">
                            <div className="px-2 py-1 rounded bg-eha-red/10 border border-eha-red/20 text-[10px] font-bold text-eha-red truncate hover:bg-eha-red hover:text-white transition-colors">
                              {event.name}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  )
}
