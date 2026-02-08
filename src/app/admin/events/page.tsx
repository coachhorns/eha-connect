'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Calendar,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  Users,
  Gamepad2,
  MoreVertical,
  RefreshCw,
  X,
} from 'lucide-react'
import { Button, Badge, Modal } from '@/components/ui'

interface Event {
  id: string
  name: string
  slug: string
  type: string
  venue: string | null
  city: string | null
  state: string | null
  startDate: string
  endDate: string
  ageGroups: string[]
  divisions: string[]
  isPublished: boolean
  isActive: boolean
  _count: {
    teams: number
    games: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const eventTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'LEAGUE', label: 'League' },
  { value: 'SHOWCASE', label: 'Showcase' },
  { value: 'CAMP', label: 'Camp' },
]

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]

export default function AdminEventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; event: Event | null }>({
    isOpen: false,
    event: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ created?: number; updated?: number; venuesCreated?: number; error?: string } | null>(null)

  const handleSyncFromExposure = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/exposure/sync-events', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setSyncResult({ created: data.created, updated: data.updated, venuesCreated: data.venuesCreated })
        fetchEvents() // Refresh list
      } else {
        setSyncResult({ error: data.error || 'Failed to sync' })
      }
    } catch (err) {
      setSyncResult({ error: 'Network error occurred' })
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/events')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
        ...(statusFilter && { status: statusFilter }),
      })

      const res = await fetch(`/api/admin/events?${params}`)
      const data = await res.json()

      if (res.ok) {
        setEvents(data.events)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, typeFilter, statusFilter])

  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      fetchEvents()
    }
  }, [session, fetchEvents])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchEvents()
  }

  const handleTogglePublish = async (event: Event) => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !event.isPublished }),
      })

      if (res.ok) {
        fetchEvents()
      }
    } catch (error) {
      console.error('Error toggling publish status:', error)
    }
    setOpenDropdown(null)
  }

  const handleDelete = async () => {
    if (!deleteModal.event) return

    try {
      setIsDeleting(true)
      const res = await fetch(`/api/admin/events/${deleteModal.event.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchEvents()
        setDeleteModal({ isOpen: false, event: null })
      }
    } catch (error) {
      console.error('Error deleting event:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getEventStatus = (event: Event): { label: string; variant: 'success' | 'warning' | 'default' | 'error' } => {
    const now = new Date()
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)

    if (!event.isActive) {
      return { label: 'Inactive', variant: 'error' }
    }
    if (now < start) {
      return { label: 'Upcoming', variant: 'info' as any }
    }
    if (now >= start && now <= end) {
      return { label: 'In Progress', variant: 'success' }
    }
    return { label: 'Completed', variant: 'default' }
  }

  const getEventTypeBadge = (type: string) => {
    const variants: Record<string, 'orange' | 'info' | 'gold' | 'success'> = {
      TOURNAMENT: 'orange',
      LEAGUE: 'info',
      SHOWCASE: 'gold',
      CAMP: 'success',
    }
    return variants[type] || 'default'
  }

  if (status === 'loading' || (session?.user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="pt-32 lg:pt-36 relative overflow-hidden bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-white/5">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">Admin Panel</span>
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-white uppercase tracking-tighter">Manage Events</h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">Create and manage tournaments, leagues, showcases, and camps</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="flex items-center gap-2"
                onClick={handleSyncFromExposure}
                isLoading={isSyncing}
                disabled={isSyncing}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/exposure-logo.png" alt="Exposure" className="w-5 h-5 object-contain" />
                <span className={isSyncing ? 'animate-pulse' : ''}>
                  {isSyncing ? 'Syncing...' : 'Sync from Exposure'}
                </span>
              </Button>
              <Link href="/admin/events/new">
                <Button className="flex items-center gap-2"><Plus className="w-4 h-4" />Create Event</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10">

        {/* Sync Feedback */}
        {syncResult && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${syncResult.error ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'
            }`}>
            {syncResult.error ? (
              <X className="w-5 h-5 text-red-400 mt-0.5" />
            ) : (
              <RefreshCw className="w-5 h-5 text-green-400 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold ${syncResult.error ? 'text-red-400' : 'text-green-400'}`}>
                {syncResult.error ? 'Sync Failed' : 'Sync Complete'}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {syncResult.error || `Added ${syncResult.created} new events, updated ${syncResult.updated} existing events.${syncResult.venuesCreated ? ` Created ${syncResult.venuesCreated} new venues.` : ''}`}
              </p>
            </div>
            <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <form onSubmit={handleSearch} className="mb-6 flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-sm px-4 py-3 pl-11 text-sm focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              className="bg-white/5 border border-white/10 text-white rounded-sm px-4 py-3 text-sm w-40 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 appearance-none cursor-pointer transition-all"
            >
              {eventTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0A1D37] text-white">{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="bg-white/5 border border-white/10 text-white rounded-sm px-4 py-3 text-sm w-40 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 appearance-none cursor-pointer transition-all"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0A1D37] text-white">{opt.label}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </div>
        </form>

        {/* Events Table */}
        <div className="bg-[#152e50]/30 border border-white/5 rounded-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No events found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first event</p>
              <Link href="/admin/events/new">
                <Button>Create Event</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      Event
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      Location
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      Teams
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      Games
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {events.map((event) => {
                    const eventStatus = getEventStatus(event)
                    return (
                      <tr
                        key={event.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/events/${event.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-white">{event.name}</div>
                            {event.ageGroups.length > 0 && (
                              <div className="text-sm text-gray-500 mt-1">
                                {event.ageGroups.join(', ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getEventTypeBadge(event.type)}>
                            {event.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">
                            {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {event.venue || event.city ? (
                            <div className="flex items-center gap-1 text-sm text-gray-400">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {event.venue ? `${event.venue}, ` : ''}
                                {event.city}{event.state ? `, ${event.state}` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>{event._count.teams}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                            <Gamepad2 className="w-4 h-4" />
                            <span>{event._count.games}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge variant={eventStatus.variant as any} size="sm">
                              {eventStatus.label}
                            </Badge>
                            {!event.isPublished && (
                              <Badge variant="warning" size="sm">
                                Draft
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="relative flex items-center justify-end gap-2">
                            <Link href={`/admin/events/${event.id}/edit`}>
                              <Button variant="ghost" size="sm" className="p-2">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2"
                                onClick={() => setOpenDropdown(openDropdown === event.id ? null : event.id)}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                              {openDropdown === event.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-[#0A1D37] border border-white/10 rounded-sm shadow-xl z-10">
                                  <Link
                                    href={`/admin/events/${event.id}`}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    <Gamepad2 className="w-4 h-4" />
                                    Manage Dashboard
                                  </Link>
                                  <button
                                    onClick={() => handleTogglePublish(event)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                  >
                                    {event.isPublished ? (
                                      <>
                                        <EyeOff className="w-4 h-4" />
                                        Unpublish
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-4 h-4" />
                                        Publish
                                      </>
                                    )}
                                  </button>
                                  <Link
                                    href={`/events/${event.slug}`}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Public Page
                                  </Link>
                                  <button
                                    onClick={() => {
                                      setDeleteModal({ isOpen: true, event })
                                      setOpenDropdown(null)
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} events
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, event: null })}
          title="Delete Event"
        >
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete <strong className="text-white">{deleteModal.event?.name}</strong>?
            </p>
            {deleteModal.event && deleteModal.event._count.games > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  This event has {deleteModal.event._count.games} games. It will be deactivated instead of deleted.
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setDeleteModal({ isOpen: false, event: null })}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* Click outside to close dropdown */}
        {openDropdown && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setOpenDropdown(null)}
          />
        )}
      </main>
    </div>
  )
}
