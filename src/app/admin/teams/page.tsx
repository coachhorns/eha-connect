'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Users,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button, Badge, Modal } from '@/components/ui'

interface Team {
  id: string
  name: string
  coachName: string | null
  division: string | null
  isActive: boolean
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminTeamsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; team: Team | null }>({
    isOpen: false,
    team: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/teams')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      })

      const res = await fetch(`/api/admin/teams?${params}`)
      const data = await res.json()

      if (res.ok) {
        setTeams(data.teams)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      fetchTeams()
    }
  }, [session, fetchTeams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchTeams()
  }

  const handleDelete = async () => {
    if (!deleteModal.team) return

    try {
      setIsDeleting(true)
      const res = await fetch(`/api/admin/teams/${deleteModal.team.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchTeams()
        setDeleteModal({ isOpen: false, team: null })
      }
    } catch (error) {
      console.error('Error deleting team:', error)
    } finally {
      setIsDeleting(false)
    }
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
      <header className="pt-32 lg:pt-36 relative overflow-hidden border-b border-border-subtle">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">Admin Panel</span>
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-text-primary uppercase tracking-tighter">Manage Teams</h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">View and manage all registered teams</p>
            </div>
            <Link href="/admin/teams/new">
              <Button className="flex items-center gap-2"><Users className="w-4 h-4" />Add Team</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10">

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-4 mb-8">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-glass border border-border-default text-text-primary placeholder-text-muted rounded-sm px-4 py-3 pl-11 text-sm focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
            />
          </div>
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {/* Teams Table */}
      <div className="bg-surface-raised/30 border border-border-subtle rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No teams found</h3>
            <p className="text-text-muted">No teams match your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-glass border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                    Coach
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                    Division
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
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className={`hover:bg-surface-glass transition-colors cursor-pointer ${!team.isActive ? 'opacity-60' : ''}`}
                    onClick={() => router.push(`/admin/teams/${team.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className={`font-medium ${team.isActive ? 'text-text-primary' : 'text-text-muted'}`}>{team.name}</div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {team.coachName || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {team.division ? (
                        <Badge variant="default" size="sm">
                          {team.division}
                        </Badge>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {team.isActive ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="error" size="sm">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => router.push(`/admin/teams/${team.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => setDeleteModal({ isOpen: true, team })}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
            <p className="text-sm text-text-muted">
              Showing {((page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} teams
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
        onClose={() => setDeleteModal({ isOpen: false, team: null })}
        title="Delete Team"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete <strong className="text-text-primary">{deleteModal.team?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ isOpen: false, team: null })}
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
    </main></div>
  )
}
