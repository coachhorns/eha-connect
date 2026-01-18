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
} from 'lucide-react'
import { Card, Button, Input, Select, Badge, Modal } from '@/components/ui'

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
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Events</h1>
          <p className="mt-2 text-gray-400">
            Create and manage tournaments, leagues, showcases, and camps
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button className="mt-4 sm:mt-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Select
              options={eventTypeOptions}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              className="w-40"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="w-40"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Events Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
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
              <thead className="bg-[#252540]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Teams
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252540]">
                {events.map((event) => {
                  const eventStatus = getEventStatus(event)
                  return (
                    <tr key={event.id} className="hover:bg-[#252540]/50 transition-colors">
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
                      <td className="px-6 py-4 text-right">
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
                              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1A1A2E] border border-[#252540] rounded-lg shadow-xl z-10">
                                <Link
                                  href={`/admin/events/${event.id}`}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#252540] transition-colors"
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  <Gamepad2 className="w-4 h-4" />
                                  Manage Dashboard
                                </Link>
                                <button
                                  onClick={() => handleTogglePublish(event)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#252540] transition-colors"
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
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#252540] transition-colors"
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
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#252540] transition-colors"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#252540]">
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
      </Card>

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
    </div>
  )
}
