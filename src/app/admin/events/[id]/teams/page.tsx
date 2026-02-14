'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  MapPin,
  Save,
  X,
} from 'lucide-react'
import { Card, Button, Input, Select, Badge, Modal } from '@/components/ui'

interface Team {
  id: string
  name: string
  slug: string
  division: string | null
  city: string | null
  state: string | null
  coachName: string | null
  coachEmail: string | null
  program?: {
    id: string
    name: string
  } | null
  _count: {
    roster: number
  }
}

interface EventTeam {
  id: string
  eventId: string
  teamId: string
  pool: string | null
  seed: number | null
  eventWins: number
  eventLosses: number
  pointsFor: number
  pointsAgainst: number
  registeredAt: string
  team: Team
}

interface Event {
  id: string
  name: string
}

export default function AdminEventTeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([])
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTeam, setSearchTeam] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<EventTeam | null>(null)
  const [editForm, setEditForm] = useState({ pool: '', seed: '' })
  const [addForm, setAddForm] = useState({ teamId: '', pool: '', seed: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; team: EventTeam | null }>({
    isOpen: false,
    team: null,
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/admin/events/${resolvedParams.id}/teams`)
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router, resolvedParams.id])

  const fetchEventTeams = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${resolvedParams.id}/teams`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
        setEventTeams(data.teams)
      }
    } catch (error) {
      console.error('Error fetching event teams:', error)
    } finally {
      setIsLoading(false)
    }
  }, [resolvedParams.id])

  const fetchAvailableTeams = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams?limit=100`)
      if (res.ok) {
        const data = await res.json()
        // Filter out teams already registered
        const registeredIds = eventTeams.map(et => et.teamId)
        setAvailableTeams(data.teams.filter((t: Team) => !registeredIds.includes(t.id)))
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }, [eventTeams])

  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      fetchEventTeams()
    }
  }, [session, fetchEventTeams])

  useEffect(() => {
    if (showAddModal) {
      fetchAvailableTeams()
    }
  }, [showAddModal, fetchAvailableTeams])

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.teamId) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${resolvedParams.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })

      if (res.ok) {
        setShowAddModal(false)
        setAddForm({ teamId: '', pool: '', seed: '' })
        fetchEventTeams()
      }
    } catch (error) {
      console.error('Error adding team:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${resolvedParams.id}/teams/${selectedTeam.teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        setShowEditModal(false)
        setSelectedTeam(null)
        fetchEventTeams()
      }
    } catch (error) {
      console.error('Error updating team:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveTeam = async () => {
    if (!deleteModal.team) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${resolvedParams.id}/teams/${deleteModal.team.teamId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setDeleteModal({ isOpen: false, team: null })
        fetchEventTeams()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to remove team')
      }
    } catch (error) {
      console.error('Error removing team:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (eventTeam: EventTeam) => {
    setSelectedTeam(eventTeam)
    setEditForm({
      pool: eventTeam.pool || '',
      seed: eventTeam.seed?.toString() || '',
    })
    setShowEditModal(true)
  }

  // Group teams by pool
  const groupedTeams = eventTeams.reduce((acc, et) => {
    const pool = et.pool || 'Unassigned'
    if (!acc[pool]) acc[pool] = []
    acc[pool].push(et)
    return acc
  }, {} as Record<string, EventTeam[]>)

  // Sort pools (Pool A, Pool B, etc., then Unassigned)
  const sortedPools = Object.keys(groupedTeams).sort((a, b) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return a.localeCompare(b)
  })

  const filteredAvailableTeams = availableTeams.filter(t =>
    t.name.toLowerCase().includes(searchTeam.toLowerCase()) ||
    (t.program?.name?.toLowerCase().includes(searchTeam.toLowerCase()))
  )

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={`/admin/events/${resolvedParams.id}/edit`}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>
          <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">Manage Teams</h1>
          {event && (
            <p className="mt-1 text-text-muted">{event.name}</p>
          )}
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Team
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-2xl font-bold text-text-primary">{eventTeams.length}</div>
          <div className="text-sm text-text-muted">Teams Registered</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-text-primary">
            {Object.keys(groupedTeams).filter(p => p !== 'Unassigned').length}
          </div>
          <div className="text-sm text-text-muted">Pools</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-text-primary">
            {eventTeams.reduce((sum, et) => sum + et.team._count.roster, 0)}
          </div>
          <div className="text-sm text-text-muted">Total Players</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-text-primary">
            {groupedTeams['Unassigned']?.length || 0}
          </div>
          <div className="text-sm text-text-muted">Unassigned</div>
        </Card>
      </div>

      {/* Teams by Pool */}
      {eventTeams.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No teams registered</h3>
          <p className="text-text-muted mb-4">Add teams to this event to get started</p>
          <Button onClick={() => setShowAddModal(true)}>Add First Team</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedPools.map(pool => (
            <Card key={pool} className="overflow-hidden p-0">
              <div className="bg-surface-raised px-6 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  {pool === 'Unassigned' ? (
                    <Badge variant="warning">{pool}</Badge>
                  ) : (
                    <Badge variant="info">{pool}</Badge>
                  )}
                  <span className="text-text-muted font-normal">
                    ({groupedTeams[pool].length} teams)
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-border-default">
                {groupedTeams[pool]
                  .sort((a, b) => (a.seed || 999) - (b.seed || 999))
                  .map((et) => (
                    <div
                      key={et.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-surface-overlay transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {et.seed && (
                          <div className="w-8 h-8 bg-[#FF6B00]/20 rounded-full flex items-center justify-center">
                            <span className="text-text-primary font-bold text-sm">#{et.seed}</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-text-primary">{et.team.name}</div>
                          <div className="flex items-center gap-3 text-sm text-text-muted">
                            {et.team.program && (
                              <span>{et.team.program.name}</span>
                            )}
                            {et.team.division && (
                              <Badge size="sm" variant="default">{et.team.division}</Badge>
                            )}
                            {et.team.city && et.team.state && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {et.team.city}, {et.team.state}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-text-muted">
                            {et.team._count.roster} players
                          </div>
                          {(et.eventWins > 0 || et.eventLosses > 0) && (
                            <div className="text-text-primary font-medium">
                              {et.eventWins}-{et.eventLosses}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2"
                            onClick={() => openEditModal(et)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 text-red-400 hover:text-red-300"
                            onClick={() => setDeleteModal({ isOpen: true, team: et })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Team Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setAddForm({ teamId: '', pool: '', seed: '' })
          setSearchTeam('')
        }}
        title="Add Team to Event"
        size="lg"
      >
        <form onSubmit={handleAddTeam} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Search Teams
            </label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="Search by name or program..."
                value={searchTeam}
                onChange={(e) => setSearchTeam(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-[#1a3a6e] rounded-lg">
              {filteredAvailableTeams.length === 0 ? (
                <div className="p-4 text-center text-text-muted">
                  {searchTeam ? 'No teams found' : 'No available teams'}
                </div>
              ) : (
                filteredAvailableTeams.map((team) => (
                  <label
                    key={team.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-overlay transition-colors ${
                      addForm.teamId === team.id ? 'bg-surface-raised' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="teamId"
                      value={team.id}
                      checked={addForm.teamId === team.id}
                      onChange={(e) => setAddForm({ ...addForm, teamId: e.target.value })}
                      className="text-white focus:ring-eha-red"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">{team.name}</div>
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        {team.program && <span>{team.program.name}</span>}
                        {team.division && <Badge size="sm">{team.division}</Badge>}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pool"
              placeholder="e.g., Pool A"
              value={addForm.pool}
              onChange={(e) => setAddForm({ ...addForm, pool: e.target.value })}
            />
            <Input
              label="Seed"
              type="number"
              min="1"
              placeholder="e.g., 1"
              value={addForm.seed}
              onChange={(e) => setAddForm({ ...addForm, seed: e.target.value })}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddModal(false)
                setAddForm({ teamId: '', pool: '', seed: '' })
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={!addForm.teamId}>
              Add Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedTeam(null)
        }}
        title="Edit Team Registration"
      >
        {selectedTeam && (
          <form onSubmit={handleUpdateTeam} className="space-y-4">
            <div className="bg-surface-raised rounded-lg p-4 mb-4">
              <div className="font-medium text-text-primary">{selectedTeam.team.name}</div>
              {selectedTeam.team.program && (
                <div className="text-sm text-text-muted">{selectedTeam.team.program.name}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pool"
                placeholder="e.g., Pool A"
                value={editForm.pool}
                onChange={(e) => setEditForm({ ...editForm, pool: e.target.value })}
              />
              <Input
                label="Seed"
                type="number"
                min="1"
                placeholder="e.g., 1"
                value={editForm.seed}
                onChange={(e) => setEditForm({ ...editForm, seed: e.target.value })}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedTeam(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, team: null })}
        title="Remove Team"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to remove{' '}
            <strong className="text-text-primary">{deleteModal.team?.team.name}</strong> from this event?
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
              onClick={handleRemoveTeam}
              isLoading={isSubmitting}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
