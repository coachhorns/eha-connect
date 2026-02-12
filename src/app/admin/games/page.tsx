'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Gamepad2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
} from 'lucide-react'
import { Button, Badge, Modal } from '@/components/ui'

interface Game {
  id: string
  scheduledAt: string
  status: string
  homeScore: number
  awayScore: number
  court: string | null
  division: string | null
  homeTeam: {
    id: string
    name: string
  }
  awayTeam: {
    id: string
    name: string
  }
  event: {
    id: string
    name: string
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'FINAL', label: 'Final' },
  { value: 'POSTPONED', label: 'Postponed' },
  { value: 'CANCELED', label: 'Canceled' },
]

export default function AdminGamesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; game: Game | null }>({
    isOpen: false,
    game: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/games')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  const fetchGames = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      })

      const res = await fetch(`/api/admin/games?${params}`)
      const data = await res.json()

      if (res.ok) {
        setGames(data.games)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      fetchGames()
    }
  }, [session, fetchGames])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchGames()
  }

  const handleDelete = async () => {
    if (!deleteModal.game) return

    try {
      setIsDeleting(true)
      const res = await fetch('/api/admin/games', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteModal.game.id }),
      })

      if (res.ok) {
        fetchGames()
        setDeleteModal({ isOpen: false, game: null })
      }
    } catch (error) {
      console.error('Error deleting game:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string): { label: string; variant: 'success' | 'warning' | 'default' | 'error' | 'info' } => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'default' | 'error' | 'info' }> = {
      SCHEDULED: { label: 'Scheduled', variant: 'info' },
      WARMUP: { label: 'Warmup', variant: 'warning' },
      IN_PROGRESS: { label: 'In Progress', variant: 'success' },
      HALFTIME: { label: 'Halftime', variant: 'warning' },
      FINAL: { label: 'Final', variant: 'default' },
      POSTPONED: { label: 'Postponed', variant: 'warning' },
      CANCELED: { label: 'Canceled', variant: 'error' },
    }
    return statusMap[status] || { label: status, variant: 'default' }
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
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-white uppercase tracking-tighter">Manage Games</h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">Schedule and manage games across all events</p>
            </div>
            <Link href="/admin/games/new">
              <Button className="flex items-center gap-2"><Plus className="w-4 h-4" />Schedule Game</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10">

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              placeholder="Search by team or event name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-sm px-4 py-3 pl-11 text-sm focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="bg-white/5 border border-white/10 text-white rounded-sm px-4 py-3 text-sm w-40 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 appearance-none cursor-pointer transition-all"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0A1D37] text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>
      </form>

      {/* Games Table */}
      <div className="bg-[#152e50]/30 border border-white/5 rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12">
            <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No games found</h3>
            <p className="text-gray-500 mb-4">Get started by scheduling your first game</p>
            <Link href="/admin/games/new">
              <Button>Schedule Game</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Home Team
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Away Team
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Event
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
                {games.map((game) => {
                  const statusBadge = getStatusBadge(game.status)
                  return (
                    <tr
                      key={game.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/games/${game.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-white">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div>{format(new Date(game.scheduledAt), 'MMM d, yyyy')}</div>
                            <div className="text-gray-500">{format(new Date(game.scheduledAt), 'h:mm a')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{game.homeTeam.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{game.awayTeam.name}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-white">
                          {game.homeScore} - {game.awayScore}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {game.event ? (
                          <span className="text-sm text-gray-400">{game.event.name}</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusBadge.variant as any} size="sm">
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex items-center justify-end gap-2">
                          <Link href={`/admin/games/${game.id}/edit`}>
                            <Button variant="ghost" size="sm" className="p-2">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2"
                              onClick={() => setOpenDropdown(openDropdown === game.id ? null : game.id)}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                            {openDropdown === game.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0A1D37] border border-white/10 rounded-sm shadow-xl z-10">
                                <button
                                  onClick={() => {
                                    setDeleteModal({ isOpen: true, game })
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
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} games
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
        onClose={() => setDeleteModal({ isOpen: false, game: null })}
        title="Delete Game"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete the game between{' '}
            <strong className="text-white">{deleteModal.game?.homeTeam.name}</strong> and{' '}
            <strong className="text-white">{deleteModal.game?.awayTeam.name}</strong>?
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ isOpen: false, game: null })}
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
