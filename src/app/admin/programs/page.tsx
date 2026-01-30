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
import { Card, Button, Input, Badge, Modal } from '@/components/ui'

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
    <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Manage Programs</h1>
          <p className="mt-2 text-gray-400">
            View and manage all registered programs (clubs)
          </p>
        </div>
        <Link href="/admin/programs/new">
          <Button className="mt-4 sm:mt-0 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Add Program
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="mb-6 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Search programs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {/* Programs Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No programs found</h3>
            <p className="text-gray-500">No programs match your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a3a6e]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Director
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Teams
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3a6e]">
                {programs.map((program) => (
                  <tr
                    key={program.id}
                    className="hover:bg-[#1a3a6e]/50 transition-colors cursor-pointer"
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
                          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="font-medium text-white">{program.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {program.directorName || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {program.city || program.state ? (
                        <div className="flex items-center gap-1 text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{program.city}{program.city && program.state ? ', ' : ''}{program.state}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-500" />
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#1a3a6e]">
            <p className="text-sm text-gray-500">
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
        onClose={() => setDeleteModal({ isOpen: false, program: null })}
        title="Delete Program"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete <strong className="text-white">{deleteModal.program?.name}</strong>?
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
    </div>
  )
}
