'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Building2,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
} from 'lucide-react'
import { Button, Badge, Modal } from '@/components/ui'

interface Program {
  id: string
  name: string
  slug: string
  directorName: string | null
  directorEmail: string | null
  city: string | null
  state: string | null
  logo: string | null
  teamsCount: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminProgramsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [programs, setPrograms] = useState<Program[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; program: Program | null }>({
    isOpen: false,
    program: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/programs')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  const fetchPrograms = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      })

      const res = await fetch(`/api/admin/programs?${params}`)
      const data = await res.json()

      if (res.ok) {
        setPrograms(data.programs)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      fetchPrograms()
    }
  }, [session, fetchPrograms])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPrograms()
  }

  const handleDelete = async () => {
    if (!deleteModal.program) return

    try {
      setIsDeleting(true)
      const res = await fetch(`/api/admin/programs/${deleteModal.program.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchPrograms()
        setDeleteModal({ isOpen: false, program: null })
      }
    } catch (error) {
      console.error('Error deleting program:', error)
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
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-text-primary uppercase tracking-tighter">Manage Programs</h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">View and manage all registered programs</p>
            </div>
            <Link href="/admin/programs/new">
              <Button className="flex items-center gap-2"><Building2 className="w-4 h-4" />Add Program</Button>
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
                placeholder="Search programs..."
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

      {/* Programs Table */}
      <div className="bg-surface-raised/30 border border-border-subtle rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No programs found</h3>
            <p className="text-text-muted">No programs match your search criteria</p>
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
                    Director
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                    Teams
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {programs.map((program) => (
                  <tr
                    key={program.id}
                    className="hover:bg-surface-glass transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/programs/${program.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {program.logo ? (
                          <img
                            src={program.logo}
                            alt={program.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-surface-overlay rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-text-muted" />
                          </div>
                        )}
                        <div className="font-medium text-text-primary">{program.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {program.directorName || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {program.city || program.state ? (
                        <div className="flex items-center gap-1 text-text-muted">
                          <MapPin className="w-4 h-4" />
                          <span>{program.city}{program.city && program.state ? ', ' : ''}{program.state}</span>
                        </div>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-text-muted" />
                        <Badge variant="default" size="sm">
                          {program.teamsCount}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => router.push(`/admin/programs/${program.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => setDeleteModal({ isOpen: true, program })}
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
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} programs
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
        onClose={() => setDeleteModal({ isOpen: false, program: null })}
        title="Delete Program"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete <strong className="text-text-primary">{deleteModal.program?.name}</strong>?
            {deleteModal.program && deleteModal.program.teamsCount > 0 && (
              <span className="block mt-2 text-yellow-400">
                This program has {deleteModal.program.teamsCount} team(s). It will be archived instead of deleted.
              </span>
            )}
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ isOpen: false, program: null })}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              {deleteModal.program && deleteModal.program.teamsCount > 0 ? 'Archive' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </main></div>
  )
}
