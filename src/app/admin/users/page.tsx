'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCog,
  User,
  Building2,
  Baby,
  Edit,
  Key,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Card, Button, Input, Select, Badge, Avatar, Modal } from '@/components/ui'

interface Program {
  id: string
  name: string
  slug: string
}

interface Player {
  id: string
  firstName: string
  lastName: string
  slug: string
}

interface UserData {
  id: string
  name: string | null
  email: string
  role: string
  image: string | null
  createdAt: string
  ownedPrograms: Program[]
  players: Player[]
  _count: {
    players: number
    ownedPrograms: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PROGRAM_DIRECTOR', label: 'Director' },
  { value: 'SCOREKEEPER', label: 'Scorekeeper' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'PLAYER', label: 'Player' },
]

const editRoleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PROGRAM_DIRECTOR', label: 'Program Director' },
  { value: 'SCOREKEEPER', label: 'Scorekeeper' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'PLAYER', label: 'Player' },
]

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)

  // Edit modal state
  const [editModal, setEditModal] = useState<{ isOpen: boolean; user: UserData | null }>({
    isOpen: false,
    user: null,
  })
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/users')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      })

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()

      if (res.ok) {
        setUsers(data.users)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      fetchUsers()
    }
  }, [session, fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const openEditModal = (user: UserData) => {
    setEditForm({
      name: user.name || '',
      role: user.role,
      password: '',
    })
    setEditError('')
    setEditModal({ isOpen: true, user })
  }

  const closeEditModal = () => {
    setEditModal({ isOpen: false, user: null })
    setEditForm({ name: '', role: '', password: '' })
    setEditError('')
    setShowDeleteConfirm(false)
  }

  const handleDeleteUser = async () => {
    if (!editModal.user) return

    setIsDeleting(true)
    setEditError('')

    try {
      const res = await fetch(`/api/admin/users/${editModal.user.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        closeEditModal()
        fetchUsers()
      } else {
        const data = await res.json()
        setEditError(data.error || 'Failed to delete user')
        setShowDeleteConfirm(false)
      }
    } catch (error) {
      setEditError('An error occurred while deleting the user.')
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModal.user) return

    setIsSubmitting(true)
    setEditError('')

    try {
      const res = await fetch(`/api/admin/users/${editModal.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          role: editForm.role,
          ...(editForm.password && { password: editForm.password }),
        }),
      })

      if (res.ok) {
        closeEditModal()
        fetchUsers()
      } else {
        const data = await res.json()
        setEditError(data.error || 'Failed to update user')
      }
    } catch (error) {
      setEditError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { variant: 'error' as const, icon: Shield, label: 'Admin' }
      case 'PROGRAM_DIRECTOR':
        return { variant: 'info' as const, icon: UserCog, label: 'Director' }
      case 'SCOREKEEPER':
        return { variant: 'gold' as const, icon: User, label: 'Scorekeeper' }
      case 'PARENT':
        return { variant: 'default' as const, icon: User, label: 'Parent' }
      case 'PLAYER':
        return { variant: 'success' as const, icon: User, label: 'Player' }
      default:
        return { variant: 'default' as const, icon: User, label: role }
    }
  }

  if (status === 'loading' || session?.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider">User Management</h1>
          <p className="mt-2 text-gray-400">
            View and manage all registered users
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {pagination && (
            <Badge variant="default" size="lg">
              {pagination.total} Total Users
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
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

      {/* Users Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No users found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a3a6e]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Connected Entities
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3a6e]">
                {users.map((user) => {
                  const roleBadge = getRoleBadge(user.role)
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-[#1a3a6e]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.image}
                            name={user.name || user.email}
                            size="md"
                          />
                          <div>
                            <div className="font-medium text-white">
                              {user.name || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={roleBadge.variant}>
                          <roleBadge.icon className="w-3 h-3 mr-1" />
                          {roleBadge.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {user.ownedPrograms.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="w-4 h-4 text-blue-400" />
                              <span className="text-gray-300">
                                Director: {user.ownedPrograms.map(p => p.name).join(', ')}
                              </span>
                            </div>
                          )}
                          {user.players.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Baby className="w-4 h-4 text-green-400" />
                              <span className="text-gray-300">
                                Parent of: {user.players.length} player{user.players.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {user.ownedPrograms.length === 0 && user.players.length === 0 && (
                            <span className="text-gray-600 text-sm">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          {format(new Date(user.createdAt), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#1a3a6e]">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} users
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

      {/* Edit User Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={closeEditModal}
        title="Edit User"
      >
        {editModal.user && (
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {/* User Info Header */}
            <div className="flex items-center gap-4 p-4 bg-[#1a3a6e]/30 rounded-lg">
              <Avatar
                src={editModal.user.image}
                name={editModal.user.name || editModal.user.email}
                size="lg"
              />
              <div>
                <div className="font-medium text-white text-lg">
                  {editModal.user.name || 'No name'}
                </div>
                <div className="text-gray-400">{editModal.user.email}</div>
              </div>
            </div>

            {/* Connected Entities (Read-only) */}
            {(editModal.user.ownedPrograms.length > 0 || editModal.user.players.length > 0) && (
              <div className="p-4 bg-[#1a3a6e]/20 rounded-lg space-y-2">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Connected Entities
                </h4>
                {editModal.user.ownedPrograms.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm">
                      Programs: {editModal.user.ownedPrograms.map(p => p.name).join(', ')}
                    </span>
                  </div>
                )}
                {editModal.user.players.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">
                      Players: {editModal.user.players.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Editable Fields */}
            <div className="space-y-4">
              <Input
                label="Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="User's display name"
              />

              <Select
                label="Role"
                options={editRoleOptions}
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              />

              <div>
                <Input
                  label="Reset Password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave empty to keep current password"
                />
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  Enter a new password to reset, or leave blank to keep unchanged
                </p>
              </div>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{editError}</p>
              </div>
            )}

            {/* Delete User Section */}
            <div className="pt-4 border-t border-[#1a3a6e]">
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete User
                </Button>
              ) : (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium">Are you sure?</p>
                      <p className="text-red-400/80 text-sm mt-1">
                        This action cannot be undone. This will permanently delete the user account
                        {editModal.user.ownedPrograms.length > 0 && ' and their program ownership'}
                        {editModal.user.players.length > 0 && ' and their player connections'}.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleDeleteUser}
                      isLoading={isDeleting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Yes, Delete User
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-[#1a3a6e]">
              <Button type="button" variant="ghost" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
