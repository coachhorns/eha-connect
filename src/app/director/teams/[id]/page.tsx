'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Users, Trophy, Trash2, UserPlus, Pencil } from 'lucide-react'
import { Card, Button, Badge, Input, Select, Modal } from '@/components/ui'

const positionOptions = [
  { value: '', label: 'Select Position' },
  { value: 'PG', label: 'Point Guard (PG)' },
  { value: 'SG', label: 'Shooting Guard (SG)' },
  { value: 'SF', label: 'Small Forward (SF)' },
  { value: 'PF', label: 'Power Forward (PF)' },
  { value: 'C', label: 'Center (C)' },
]

const ageGroupOptions = [
  { value: '', label: 'Select Age Group' },
  { value: '8U', label: '8U' },
  { value: '9U', label: '9U' },
  { value: '10U', label: '10U' },
  { value: '11U', label: '11U' },
  { value: '12U', label: '12U' },
  { value: '13U', label: '13U' },
  { value: '14U', label: '14U' },
  { value: '15U', label: '15U' },
  { value: '16U', label: '16U' },
  { value: '17U', label: '17U' },
]

const divisionOptions = [
  { value: '', label: 'Select Division' },
  { value: 'EPL', label: 'EHA Premier League (EPL)' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
]

interface Player {
  id: string
  firstName: string
  lastName: string
  slug: string
  jerseyNumber: string | null
  primaryPosition: string | null
  heightFeet: number | null
  heightInches: number | null
  school: string | null
  graduationYear: number | null
  profilePhoto: string | null
}

interface RosterEntry {
  id: string
  jerseyNumber: string | null
  player: Player
}

interface Team {
  id: string
  slug: string
  name: string
  logo: string | null
  ageGroup: string | null
  division: string | null
  coachName: string | null
  wins: number
  losses: number
  program: {
    id: string
    name: string
    ownerId: string
    logo: string | null
  }
  roster: RosterEntry[]
  _count: {
    homeGames: number
    awayGames: number
  }
}

export default function DirectorTeamDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string

  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Add player modal state
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [playerForm, setPlayerForm] = useState({
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    primaryPosition: '',
  })

  // Edit team modal state
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    ageGroup: '',
    division: '',
    coachName: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/director/dashboard')
      return
    }

    if (status === 'authenticated' && session?.user.role !== 'PROGRAM_DIRECTOR') {
      router.push('/')
      return
    }

    if (status === 'authenticated' && session?.user.role === 'PROGRAM_DIRECTOR' && teamId) {
      fetchTeam()
    }
  }, [status, session, router, teamId])

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/director/teams/${teamId}`)
      const data = await res.json()

      if (res.ok) {
        setTeam(data.team)
      } else if (res.status === 403 || res.status === 404) {
        // Not authorized or not found - redirect to dashboard
        router.push('/director/dashboard')
        return
      } else {
        setError(data.error || 'Failed to fetch team')
      }
    } catch (err) {
      console.error('Error fetching team:', err)
      setError('Failed to fetch team')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!playerForm.firstName.trim() || !playerForm.lastName.trim()) {
      setError('First name and last name are required')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/director/teams/${teamId}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: playerForm.firstName.trim(),
          lastName: playerForm.lastName.trim(),
          jerseyNumber: playerForm.jerseyNumber.trim() || null,
          primaryPosition: playerForm.primaryPosition || null,
        }),
      })

      if (res.ok) {
        setIsAddPlayerOpen(false)
        setPlayerForm({ firstName: '', lastName: '', jerseyNumber: '', primaryPosition: '' })
        fetchTeam() // Refresh the roster
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add player')
      }
    } catch (err) {
      console.error('Error adding player:', err)
      setError('Failed to add player')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to remove ${playerName} from the roster?`)) {
      return
    }

    try {
      const res = await fetch(`/api/director/teams/${teamId}/roster?playerId=${playerId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchTeam() // Refresh the roster
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to remove player')
      }
    } catch (err) {
      console.error('Error removing player:', err)
      setError('Failed to remove player')
    }
  }

  const openEditModal = () => {
    if (team) {
      setEditForm({
        name: team.name,
        ageGroup: team.ageGroup || '',
        division: team.division || '',
        coachName: team.coachName || '',
      })
      setIsEditTeamOpen(true)
    }
  }

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!editForm.name.trim()) {
      setError('Team name is required')
      return
    }

    try {
      setIsEditSubmitting(true)
      const res = await fetch(`/api/director/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          ageGroup: editForm.ageGroup || null,
          division: editForm.division || null,
          coachName: editForm.coachName.trim() || null,
        }),
      })

      if (res.ok) {
        // Update local state
        setTeam(prev => prev ? {
          ...prev,
          name: editForm.name.trim(),
          ageGroup: editForm.ageGroup || null,
          division: editForm.division || null,
          coachName: editForm.coachName.trim() || null,
        } : null)
        setIsEditTeamOpen(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update team')
      }
    } catch (err) {
      console.error('Error updating team:', err)
      setError('Failed to update team')
    } finally {
      setIsEditSubmitting(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    return null
  }

  if (error && !team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <p className="text-red-400">{error}</p>
          <Link href="/director/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (!team) {
    return null
  }

  const logoUrl = team.logo || team.program.logo

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/director/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={team.name}
                className="w-20 h-20 rounded-xl object-contain bg-white/5 p-1 border border-white/10"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-eha-navy flex items-center justify-center border border-white/10">
                <span className="text-2xl font-bold text-gray-400">
                  {team.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{team.name}</h1>
                <button
                  onClick={openEditModal}
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#1a3a6e] rounded-lg transition-colors"
                  title="Edit team settings"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {team.ageGroup && <Badge variant="info">{team.ageGroup}</Badge>}
                {team.division && <Badge variant="default">{team.division}</Badge>}
                <span className="text-gray-400">
                  {team.program.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#1a3a6e]/50 px-4 py-2 rounded-lg">
              <Trophy className="w-5 h-5 text-eha-gold" />
              <span className="text-xl font-bold text-white">
                {team.wins}-{team.losses}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Team Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-sm text-gray-400">Coach</div>
          <div className="text-lg font-medium text-white">
            {team.coachName || 'Not assigned'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-400">Roster Size</div>
          <div className="text-lg font-medium text-white">
            {team.roster.length} players
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-400">Total Games</div>
          <div className="text-lg font-medium text-white">
            {team._count.homeGames + team._count.awayGames}
          </div>
        </Card>
      </div>

      {/* Roster Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Roster</h2>
        <Button onClick={() => setIsAddPlayerOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Player
        </Button>
      </div>

      {team.roster.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-[#1a3a6e] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Players Yet</h3>
          <p className="text-gray-400 mb-4">
            Start building your roster by adding players
          </p>
          <Button onClick={() => setIsAddPlayerOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Player
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1a3a6e]/30">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Player</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Position</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Height</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">School</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Class</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a3a6e]">
              {team.roster.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#1a3a6e]/20">
                  <td className="px-4 py-3 text-white font-medium">
                    {entry.jerseyNumber || entry.player.jerseyNumber || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {entry.player.profilePhoto ? (
                        <img
                          src={entry.player.profilePhoto}
                          alt={`${entry.player.firstName} ${entry.player.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#1a3a6e] rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-400">
                            {entry.player.firstName.charAt(0)}{entry.player.lastName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white">
                          {entry.player.firstName} {entry.player.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {entry.player.primaryPosition || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {entry.player.heightFeet && entry.player.heightInches !== null
                      ? `${entry.player.heightFeet}'${entry.player.heightInches}"`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {entry.player.school || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {entry.player.graduationYear || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemovePlayer(
                        entry.player.id,
                        `${entry.player.firstName} ${entry.player.lastName}`
                      )}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove from roster"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Player Modal */}
      <Modal
        isOpen={isAddPlayerOpen}
        onClose={() => {
          setIsAddPlayerOpen(false)
          setPlayerForm({ firstName: '', lastName: '', jerseyNumber: '', primaryPosition: '' })
          setError('')
        }}
        title="Add Player to Roster"
      >
        <form onSubmit={handleAddPlayer} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Name *
              </label>
              <Input
                type="text"
                placeholder="John"
                value={playerForm.firstName}
                onChange={(e) => setPlayerForm(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Name *
              </label>
              <Input
                type="text"
                placeholder="Smith"
                value={playerForm.lastName}
                onChange={(e) => setPlayerForm(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Jersey Number
              </label>
              <Input
                type="text"
                placeholder="23"
                value={playerForm.jerseyNumber}
                onChange={(e) => setPlayerForm(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Position
              </label>
              <Select
                options={positionOptions}
                value={playerForm.primaryPosition}
                onChange={(e) => setPlayerForm(prev => ({ ...prev, primaryPosition: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAddPlayerOpen(false)
                setPlayerForm({ firstName: '', lastName: '', jerseyNumber: '', primaryPosition: '' })
                setError('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1"
            >
              Add Player
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        isOpen={isEditTeamOpen}
        onClose={() => {
          setIsEditTeamOpen(false)
          setError('')
        }}
        title="Edit Team Details"
      >
        <form onSubmit={handleEditTeam} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Team Name *
            </label>
            <Input
              type="text"
              placeholder="e.g., Houston Elite 17U"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Age Group
              </label>
              <Select
                options={ageGroupOptions}
                value={editForm.ageGroup}
                onChange={(e) => setEditForm(prev => ({ ...prev, ageGroup: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Division
              </label>
              <Select
                options={divisionOptions}
                value={editForm.division}
                onChange={(e) => setEditForm(prev => ({ ...prev, division: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Coach Name
            </label>
            <Input
              type="text"
              placeholder="John Smith"
              value={editForm.coachName}
              onChange={(e) => setEditForm(prev => ({ ...prev, coachName: e.target.value }))}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditTeamOpen(false)
                setError('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isEditSubmitting}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
