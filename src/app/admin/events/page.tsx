'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { safeParseDate } from '@/lib/timezone'
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

interface ExposurePreviewEvent {
  exposureId: number
  name: string
  startDate: string
  endDate: string
  location: string | null
  city: string | null
  state: string | null
  image: string | null
  alreadyImported: boolean
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
  const [deleteMode, setDeleteMode] = useState<'confirm' | 'force' | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ created?: number; updated?: number; venuesCreated?: number; error?: string } | null>(null)

  // Exposure preview modal state
  const [exposureModal, setExposureModal] = useState<{
    isOpen: boolean
    isLoading: boolean
    events: ExposurePreviewEvent[]
    error: string | null
  }>({ isOpen: false, isLoading: false, events: [], error: null })
  const [selectedExposureIds, setSelectedExposureIds] = useState<Set<number>>(new Set())

  const handleOpenExposureModal = async () => {
    setExposureModal({ isOpen: true, isLoading: true, events: [], error: null })
    setSelectedExposureIds(new Set())

    try {
      const res = await fetch('/api/admin/exposure/preview-events')
      const data = await res.json()

      if (res.ok) {
        // Pre-select events that are NOT already imported
        const newIds = new Set(
          data.events
            .filter((e: ExposurePreviewEvent) => !e.alreadyImported)
            .map((e: ExposurePreviewEvent) => e.exposureId)
        )
        setSelectedExposureIds(newIds)
        setExposureModal({ isOpen: true, isLoading: false, events: data.events, error: null })
      } else {
        setExposureModal({ isOpen: true, isLoading: false, events: [], error: data.error || 'Failed to fetch events' })
      }
    } catch {
      setExposureModal({ isOpen: true, isLoading: false, events: [], error: 'Network error occurred' })
    }
  }

  const handleImportSelected = async () => {
    const ids = Array.from(selectedExposureIds)
    if (ids.length === 0) return

    setIsSyncing(true)
    setSyncResult(null)
    setExposureModal(prev => ({ ...prev, isOpen: false }))

    try {
      const res = await fetch('/api/admin/exposure/sync-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exposureIds: ids }),
      })
      const data = await res.json()

      if (res.ok) {
        setSyncResult({ created: data.created, updated: data.updated, venuesCreated: data.venuesCreated })
        fetchEvents()
      } else {
        setSyncResult({ error: data.error || 'Failed to sync' })
      }
    } catch {
      setSyncResult({ error: 'Network error occurred' })
    } finally {
      setIsSyncing(false)
    }
  }

  const toggleExposureSelection = (exposureId: number) => {
    setSelectedExposureIds(prev => {
      const next = new Set(prev)
      if (next.has(exposureId)) {
        next.delete(exposureId)
      } else {
        next.add(exposureId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    const selectable = exposureModal.events.filter(e => !e.alreadyImported)
    if (selectedExposureIds.size === selectable.length) {
      setSelectedExposureIds(new Set())
    } else {
      setSelectedExposureIds(new Set(selectable.map(e => e.exposureId)))
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

  const handleDelete = async (force: boolean = false) => {
    if (!deleteModal.event) return

    try {
      setIsDeleting(true)
      const url = force
        ? `/api/admin/events/${deleteModal.event.id}?force=true`
        : `/api/admin/events/${deleteModal.event.id}`
      const res = await fetch(url, { method: 'DELETE' })

      if (res.ok) {
        fetchEvents()
        setDeleteModal({ isOpen: false, event: null })
        setDeleteMode(null)
      }
    } catch (error) {
      console.error('Error deleting event:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getEventStatus = (event: Event): { label: string; variant: 'success' | 'warning' | 'default' | 'error' } => {
    const now = new Date()
    const start = safeParseDate(event.startDate)
    const end = safeParseDate(event.endDate)

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
      <header className="pt-32 lg:pt-36 relative overflow-hidden bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-border-subtle">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">Admin Panel</span>
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-text-primary uppercase tracking-tighter">Manage Events</h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">Create and manage tournaments, leagues, showcases, and camps</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="flex items-center gap-2"
                onClick={handleOpenExposureModal}
                disabled={isSyncing}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/exposure-logo.png" alt="Exposure" className="w-5 h-5 object-contain" />
                <span>{isSyncing ? 'Syncing...' : 'Sync from Exposure'}</span>
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
              <p className="text-sm text-text-secondary mt-1">
                {syncResult.error || `Added ${syncResult.created} new events, updated ${syncResult.updated} existing events.${syncResult.venuesCreated ? ` Created ${syncResult.venuesCreated} new venues.` : ''}`}
              </p>
            </div>
            <button onClick={() => setSyncResult(null)} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <form onSubmit={handleSearch} className="mb-6 flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-glass border border-border-default text-text-primary placeholder-text-muted rounded-sm px-4 py-3 pl-11 text-sm focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
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
              className="bg-surface-glass border border-border-default text-text-primary rounded-sm px-4 py-3 text-sm w-40 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 appearance-none cursor-pointer transition-all"
            >
              {eventTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-page-bg text-text-primary">{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="bg-surface-glass border border-border-default text-text-primary rounded-sm px-4 py-3 text-sm w-40 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 appearance-none cursor-pointer transition-all"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-page-bg text-text-primary">{opt.label}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </div>
        </form>

        {/* Events Table */}
        <div className="bg-surface-raised/30 border border-border-subtle rounded-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No events found</h3>
              <p className="text-text-muted mb-4">Get started by creating your first event</p>
              <Link href="/admin/events/new">
                <Button>Create Event</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-glass border-b border-border-subtle">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                      Event
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                      Location
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                      Teams
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                      Games
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {events.map((event) => {
                    const eventStatus = getEventStatus(event)
                    return (
                      <tr
                        key={event.id}
                        className="hover:bg-surface-glass transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/events/${event.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-text-primary">{event.name}</div>
                            {event.divisions.length > 0 && (
                              <div className="text-sm text-text-muted mt-1">
                                {event.divisions.join(', ')}
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
                          <div className="text-sm text-text-primary">
                            {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {event.venue || event.city ? (
                            <div className="flex items-center gap-1 text-sm text-text-muted">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {event.venue ? `${event.venue}, ` : ''}
                                {event.city}{event.state ? `, ${event.state}` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-sm text-text-muted">
                            <Users className="w-4 h-4" />
                            <span>{event._count.teams}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-sm text-text-muted">
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
                                <div className="absolute right-0 top-full mt-1 w-48 bg-page-bg border border-border-default rounded-sm shadow-xl z-10">
                                  <Link
                                    href={`/admin/events/${event.id}`}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-overlay transition-colors"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    <Gamepad2 className="w-4 h-4" />
                                    Manage Dashboard
                                  </Link>
                                  <button
                                    onClick={() => handleTogglePublish(event)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-overlay transition-colors"
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
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-overlay transition-colors"
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
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-surface-overlay transition-colors"
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
              <p className="text-sm text-text-muted">
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
                <span className="text-sm text-text-muted">
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
          onClose={() => { setDeleteModal({ isOpen: false, event: null }); setDeleteMode(null) }}
          title="Delete Event"
        >
          <div className="space-y-4">
            <p className="text-text-secondary">
              Are you sure you want to delete <strong className="text-text-primary">{deleteModal.event?.name}</strong>?
            </p>

            {deleteModal.event && deleteModal.event._count.games > 0 ? (
              <>
                <div className="bg-surface-glass border border-border-default rounded-lg p-4 space-y-2">
                  <p className="text-sm text-text-secondary">This event contains:</p>
                  <ul className="text-sm text-text-muted list-disc list-inside space-y-1">
                    <li>{deleteModal.event._count.teams} registered team{deleteModal.event._count.teams !== 1 ? 's' : ''}</li>
                    <li>{deleteModal.event._count.games} game{deleteModal.event._count.games !== 1 ? 's' : ''}</li>
                  </ul>
                </div>

                {deleteMode !== 'force' ? (
                  <>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-yellow-400 text-sm">
                        <strong>Deactivate</strong> hides the event but preserves all game data and stats.
                      </p>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="ghost" onClick={() => { setDeleteModal({ isOpen: false, event: null }); setDeleteMode(null) }}>
                        Cancel
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(false)} isLoading={isDeleting}>
                        Deactivate
                      </Button>
                      <button
                        onClick={() => setDeleteMode('force')}
                        className="text-sm text-red-400/60 hover:text-red-400 transition-colors px-3"
                      >
                        Permanently Delete...
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <p className="text-red-400 text-sm font-bold mb-1">This action cannot be undone.</p>
                      <p className="text-red-400/80 text-sm">
                        This will permanently delete the event, all {deleteModal.event._count.games} game{deleteModal.event._count.games !== 1 ? 's' : ''},
                        game stats, team registrations, brackets, and schedule constraints.
                      </p>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="ghost" onClick={() => setDeleteMode(null)}>
                        Back
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(true)} isLoading={isDeleting}>
                        Permanently Delete Everything
                      </Button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => { setDeleteModal({ isOpen: false, event: null }); setDeleteMode(null) }}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => handleDelete(false)} isLoading={isDeleting}>
                  Delete
                </Button>
              </div>
            )}
          </div>
        </Modal>

        {/* Exposure Import Modal */}
        <Modal
          isOpen={exposureModal.isOpen}
          onClose={() => setExposureModal(prev => ({ ...prev, isOpen: false }))}
          title="Import from Exposure"
          size="xl"
        >
          <div className="space-y-4">
            {exposureModal.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
                <span className="ml-3 text-text-muted">Fetching events from Exposure...</span>
              </div>
            ) : exposureModal.error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{exposureModal.error}</p>
              </div>
            ) : exposureModal.events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-muted">No upcoming events found in Exposure.</p>
              </div>
            ) : (
              <>
                {/* Select All header */}
                <div className="flex items-center justify-between pb-2 border-b border-border-default">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        selectedExposureIds.size ===
                        exposureModal.events.filter(e => !e.alreadyImported).length &&
                        selectedExposureIds.size > 0
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-border-default bg-surface-glass text-eha-red focus:ring-eha-red focus:ring-offset-0"
                    />
                    <span className="text-sm text-text-muted font-semibold uppercase tracking-wider">
                      Select All ({selectedExposureIds.size} of{' '}
                      {exposureModal.events.filter(e => !e.alreadyImported).length} new)
                    </span>
                  </label>
                  <span className="text-xs text-text-muted">
                    {exposureModal.events.length} upcoming events
                  </span>
                </div>

                {/* Event list */}
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                  {exposureModal.events.map(event => (
                    <label
                      key={event.exposureId}
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                        event.alreadyImported
                          ? 'border-border-subtle bg-white/[0.02] opacity-60 cursor-default'
                          : selectedExposureIds.has(event.exposureId)
                          ? 'border-eha-red/30 bg-eha-red/5 cursor-pointer'
                          : 'border-border-default bg-surface-glass hover:border-border-default cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={event.alreadyImported || selectedExposureIds.has(event.exposureId)}
                        disabled={event.alreadyImported}
                        onChange={() => toggleExposureSelection(event.exposureId)}
                        className="w-4 h-4 rounded border-border-default bg-surface-glass text-eha-red focus:ring-eha-red focus:ring-offset-0 disabled:opacity-50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary truncate">{event.name}</span>
                          {event.alreadyImported && (
                            <Badge variant="success" size="sm">Already Synced</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {event.startDate} - {event.endDate}
                          </span>
                          {(event.location || event.city) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location ? `${event.location}, ` : ''}
                              {event.city}{event.state ? `, ${event.state}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border-default">
                  <p className="text-sm text-text-muted">
                    {selectedExposureIds.size} event{selectedExposureIds.size !== 1 ? 's' : ''} selected for import
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setExposureModal(prev => ({ ...prev, isOpen: false }))}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImportSelected}
                      disabled={selectedExposureIds.size === 0}
                    >
                      Import Selected
                    </Button>
                  </div>
                </div>
              </>
            )}
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
