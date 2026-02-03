'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Users, Trophy, Trash2, UserPlus, Pencil, Upload, FileText, X, Check, ChevronDown, AlertCircle } from 'lucide-react'
import { Button, Badge, Input, Modal } from '@/components/ui'

interface ParsedPlayer {
  firstName: string
  lastName: string
  jerseyNumber: string | null
  primaryPosition: string | null
  graduationYear: number | null
  heightFeet: number | null
  heightInches: number | null
  school: string | null
}

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
    heightFeet: '',
    heightInches: '',
    school: '',
    graduationYear: '',
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

  // Edit player modal state
  const [isEditPlayerOpen, setIsEditPlayerOpen] = useState(false)
  const [isEditPlayerSubmitting, setIsEditPlayerSubmitting] = useState(false)
  const [editPlayerForm, setEditPlayerForm] = useState({
    playerId: '',
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    primaryPosition: '',
    heightFeet: '',
    heightInches: '',
    school: '',
    graduationYear: '',
  })

  // Smart Upload state
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual')
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parseError, setParseError] = useState('')
  const [uploadFileName, setUploadFileName] = useState('')

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
          heightFeet: playerForm.heightFeet || null,
          heightInches: playerForm.heightInches || null,
          school: playerForm.school.trim() || null,
          graduationYear: playerForm.graduationYear || null,
        }),
      })

      if (res.ok) {
        setIsAddPlayerOpen(false)
        setPlayerForm({ firstName: '', lastName: '', jerseyNumber: '', primaryPosition: '', heightFeet: '', heightInches: '', school: '', graduationYear: '' })
        fetchTeam()
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
        fetchTeam()
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

  const openEditPlayerModal = (player: Player) => {
    setEditPlayerForm({
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      jerseyNumber: player.jerseyNumber || '',
      primaryPosition: player.primaryPosition || '',
      heightFeet: player.heightFeet?.toString() || '',
      heightInches: player.heightInches?.toString() || '',
      school: player.school || '',
      graduationYear: player.graduationYear?.toString() || '',
    })
    setIsEditPlayerOpen(true)
  }

  const handleEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!editPlayerForm.firstName.trim() || !editPlayerForm.lastName.trim()) {
      setError('First name and last name are required')
      return
    }

    try {
      setIsEditPlayerSubmitting(true)
      const res = await fetch(`/api/director/teams/${teamId}/roster`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: editPlayerForm.playerId,
          firstName: editPlayerForm.firstName.trim(),
          lastName: editPlayerForm.lastName.trim(),
          jerseyNumber: editPlayerForm.jerseyNumber.trim() || null,
          primaryPosition: editPlayerForm.primaryPosition || null,
          heightFeet: editPlayerForm.heightFeet || null,
          heightInches: editPlayerForm.heightInches || null,
          school: editPlayerForm.school.trim() || null,
          graduationYear: editPlayerForm.graduationYear || null,
        }),
      })

      if (res.ok) {
        setIsEditPlayerOpen(false)
        setEditPlayerForm({
          playerId: '',
          firstName: '',
          lastName: '',
          jerseyNumber: '',
          primaryPosition: '',
          heightFeet: '',
          heightInches: '',
          school: '',
          graduationYear: '',
        })
        fetchTeam()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update player')
      }
    } catch (err) {
      console.error('Error updating player:', err)
      setError('Failed to update player')
    } finally {
      setIsEditPlayerSubmitting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setParseError('')
    setParsedPlayers([])
    setUploadFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/director/teams/${teamId}/roster/parse`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        if (data.players && data.players.length > 0) {
          setParsedPlayers(data.players)
        } else {
          setParseError('No players found in the file. Please check the format.')
        }
      } else {
        setParseError(data.error || 'Failed to parse file')
      }
    } catch (err) {
      console.error('Error parsing file:', err)
      setParseError('Failed to parse file')
    } finally {
      setIsParsing(false)
    }

    e.target.value = ''
  }

  const handleBatchImport = async () => {
    if (parsedPlayers.length === 0) return

    setIsImporting(true)
    setParseError('')

    try {
      const res = await fetch(`/api/director/teams/${teamId}/roster/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: parsedPlayers }),
      })

      const data = await res.json()

      if (res.ok) {
        setIsAddPlayerOpen(false)
        setParsedPlayers([])
        setUploadFileName('')
        setActiveTab('manual')
        fetchTeam()
        alert(data.message || `Successfully imported ${data.results?.added || 0} players`)
      } else {
        setParseError(data.error || 'Failed to import players')
      }
    } catch (err) {
      console.error('Error importing players:', err)
      setParseError('Failed to import players')
    } finally {
      setIsImporting(false)
    }
  }

  const updateParsedPlayer = (index: number, field: keyof ParsedPlayer, value: any) => {
    setParsedPlayers(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeParsedPlayer = (index: number) => {
    setParsedPlayers(prev => prev.filter((_, i) => i !== index))
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
      <div className="min-h-screen bg-[#0A1D37] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    return null
  }

  if (error && !team) {
    return (
      <div className="min-h-screen bg-[#0A1D37] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8 relative z-10">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <p className="text-red-400">{error}</p>
            <Link href="/director/dashboard">
              <Button className="mt-4 bg-gradient-to-r from-[#E31837] to-[#a01128]">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return null
  }

  const logoUrl = team.logo || team.program.logo

  return (
    <div className="min-h-screen bg-[#0A1D37] relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E31837] blur-[180px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 blur-[150px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8 relative z-10">
        {/* Back Link */}
        <Link
          href="/director/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              {logoUrl ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5">
                  <Image
                    src={logoUrl}
                    alt={team.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a3a6e] to-[#0a1628] flex items-center justify-center border-2 border-white/10">
                  <span className="text-2xl font-bold text-white/30">
                    {team.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-white tracking-tight">{team.name}</h1>
                  <button
                    onClick={openEditModal}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Edit team settings"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {team.ageGroup && <Badge variant="info">{team.ageGroup}</Badge>}
                  {team.division && <Badge variant="default">{team.division}</Badge>}
                  <span className="text-gray-400">{team.program.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl">
              <Trophy className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-white font-mono">
                {team.wins}-{team.losses}
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        {/* Team Info Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Coach</div>
                <div className="text-lg font-semibold text-white">{team.coachName || 'Not assigned'}</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Roster Size</div>
                <div className="text-lg font-semibold text-white">{team.roster.length} players</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Games</div>
                <div className="text-lg font-semibold text-white">{team._count.homeGames + team._count.awayGames}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Roster Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-bold text-white">Roster</h2>
          <Button
            onClick={() => setIsAddPlayerOpen(true)}
            className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Player
          </Button>
        </div>

        {team.roster.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-heading font-bold text-white mb-2">No Players Yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Start building your roster by adding players
            </p>
            <Button
              onClick={() => setIsAddPlayerOpen(true)}
              className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Player
            </Button>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0a1628] border-b border-white/10">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Height</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-5 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {team.roster.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 text-white font-mono font-medium">
                      {entry.jerseyNumber || entry.player.jerseyNumber || '-'}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/players/${entry.player.slug}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        {entry.player.profilePhoto ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image
                              src={entry.player.profilePhoto}
                              alt={`${entry.player.firstName} ${entry.player.lastName}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-400">
                              {entry.player.firstName.charAt(0)}{entry.player.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="font-medium text-white hover:text-[#E31837] transition-colors">
                          {entry.player.firstName} {entry.player.lastName}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-300">
                      {entry.player.primaryPosition || '-'}
                    </td>
                    <td className="px-5 py-4 text-gray-300">
                      {entry.player.heightFeet && entry.player.heightInches !== null
                        ? `${entry.player.heightFeet}'${entry.player.heightInches}"`
                        : '-'}
                    </td>
                    <td className="px-5 py-4 text-gray-300">
                      {entry.player.school || '-'}
                    </td>
                    <td className="px-5 py-4 text-gray-300">
                      {entry.player.graduationYear || '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditPlayerModal(entry.player)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Edit player"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Player Modal */}
        <Modal
          isOpen={isAddPlayerOpen}
          onClose={() => {
            setIsAddPlayerOpen(false)
            setPlayerForm({ firstName: '', lastName: '', jerseyNumber: '', primaryPosition: '', heightFeet: '', heightInches: '', school: '', graduationYear: '' })
            setParsedPlayers([])
            setParseError('')
            setUploadFileName('')
            setActiveTab('manual')
            setError('')
          }}
          title="Add Players to Roster"
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'manual'
                  ? 'border-[#E31837] text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-[#E31837] text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4 inline-block mr-1" />
              Smart Upload
            </button>
          </div>

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleAddPlayer} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={playerForm.firstName}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Jersey Number</label>
                  <Input
                    type="text"
                    placeholder="23"
                    value={playerForm.jerseyNumber}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                    maxLength={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                  <div className="relative">
                    <select
                      value={playerForm.primaryPosition}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, primaryPosition: e.target.value }))}
                      className="w-full appearance-none bg-white/5 border border-white/10 text-white px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                    >
                      {positionOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0a1628]">{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Height</label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Feet"
                    min={3}
                    max={7}
                    value={playerForm.heightFeet}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, heightFeet: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Inches"
                    min={0}
                    max={11}
                    value={playerForm.heightInches}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, heightInches: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">School</label>
                  <Input
                    type="text"
                    placeholder="School name"
                    value={playerForm.school}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, school: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Class (Grad Year)</label>
                  <Input
                    type="number"
                    placeholder="2026"
                    min={2020}
                    max={2040}
                    value={playerForm.graduationYear}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, graduationYear: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                  onClick={() => {
                    setIsAddPlayerOpen(false)
                    setPlayerForm({ firstName: '', lastName: '', jerseyNumber: '', primaryPosition: '', heightFeet: '', heightInches: '', school: '', graduationYear: '' })
                    setError('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
                >
                  Add Player
                </Button>
              </div>
            </form>
          )}

          {/* Smart Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {parseError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-red-400 text-sm">{parseError}</p>
                </div>
              )}

              {parsedPlayers.length === 0 && !isParsing && (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-white/30 transition-colors">
                  <input
                    type="file"
                    id="roster-upload"
                    accept=".csv,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="roster-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-white mx-auto mb-3" />
                    <p className="text-gray-300 text-sm mb-1">
                      Include: First Name, Last Name, Number, Position, Height, Grad Year, School
                    </p>
                    <p className="text-gray-400 text-xs mb-4">
                      (any order - AI will figure it out)
                    </p>
                    <p className="text-white font-medium mb-2">
                      Drop your roster file here or click to browse
                    </p>
                    <p className="text-gray-500 text-sm">
                      Supports CSV, PNG, and JPG files
                    </p>
                  </label>
                </div>
              )}

              {isParsing && (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-white font-medium">Analyzing {uploadFileName}...</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Using AI to extract player information
                  </p>
                </div>
              )}

              {parsedPlayers.length > 0 && !isParsing && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-white" />
                      <span className="text-white font-medium">
                        {parsedPlayers.length} players found
                      </span>
                      {uploadFileName && (
                        <span className="text-gray-400 text-sm">from {uploadFileName}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setParsedPlayers([])
                        setUploadFileName('')
                      }}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Upload different file
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-white/10 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0a1628] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-400 font-medium">Name</th>
                          <th className="px-3 py-2 text-left text-gray-400 font-medium">#</th>
                          <th className="px-3 py-2 text-left text-gray-400 font-medium">Pos</th>
                          <th className="px-3 py-2 text-left text-gray-400 font-medium">Class</th>
                          <th className="px-3 py-2 text-right text-gray-400 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedPlayers.map((player, index) => (
                          <tr key={index} className="hover:bg-white/5">
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={player.firstName}
                                  onChange={(e) => updateParsedPlayer(index, 'firstName', e.target.value)}
                                  className="w-20 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-white px-1 outline-none"
                                />
                                <input
                                  type="text"
                                  value={player.lastName}
                                  onChange={(e) => updateParsedPlayer(index, 'lastName', e.target.value)}
                                  className="w-24 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-white px-1 outline-none"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={player.jerseyNumber || ''}
                                onChange={(e) => updateParsedPlayer(index, 'jerseyNumber', e.target.value || null)}
                                className="w-10 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-white px-1 outline-none"
                                placeholder="-"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={player.primaryPosition || ''}
                                onChange={(e) => updateParsedPlayer(index, 'primaryPosition', e.target.value || null)}
                                className="w-10 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-white px-1 outline-none"
                                placeholder="-"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={player.graduationYear || ''}
                                onChange={(e) => updateParsedPlayer(index, 'graduationYear', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-12 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-white px-1 outline-none"
                                placeholder="-"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => removeParsedPlayer(index)}
                                className="text-gray-400 hover:text-red-400 transition-colors"
                                title="Remove player"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/20 text-gray-300 hover:bg-white/10"
                      onClick={() => {
                        setIsAddPlayerOpen(false)
                        setParsedPlayers([])
                        setUploadFileName('')
                        setActiveTab('manual')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBatchImport}
                      isLoading={isImporting}
                      className="flex-1 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Import {parsedPlayers.length} Players
                    </Button>
                  </div>
                </>
              )}

              {parsedPlayers.length === 0 && !isParsing && (
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 text-gray-300 hover:bg-white/10"
                    onClick={() => {
                      setIsAddPlayerOpen(false)
                      setActiveTab('manual')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
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
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Team Name *</label>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Age Group</label>
                <div className="relative">
                  <select
                    value={editForm.ageGroup}
                    onChange={(e) => setEditForm(prev => ({ ...prev, ageGroup: e.target.value }))}
                    className="w-full appearance-none bg-white/5 border border-white/10 text-white px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                  >
                    {ageGroupOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#0a1628]">{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Division</label>
                <div className="relative">
                  <select
                    value={editForm.division}
                    onChange={(e) => setEditForm(prev => ({ ...prev, division: e.target.value }))}
                    className="w-full appearance-none bg-white/5 border border-white/10 text-white px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                  >
                    {divisionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#0a1628]">{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Coach Name</label>
              <Input
                type="text"
                placeholder="John Smith"
                value={editForm.coachName}
                onChange={(e) => setEditForm(prev => ({ ...prev, coachName: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-gray-300 hover:bg-white/10"
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
                className="flex-1 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Player Modal */}
        <Modal
          isOpen={isEditPlayerOpen}
          onClose={() => {
            setIsEditPlayerOpen(false)
            setEditPlayerForm({
              playerId: '',
              firstName: '',
              lastName: '',
              jerseyNumber: '',
              primaryPosition: '',
              heightFeet: '',
              heightInches: '',
              school: '',
              graduationYear: '',
            })
            setError('')
          }}
          title="Edit Player"
        >
          <form onSubmit={handleEditPlayer} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                <Input
                  type="text"
                  placeholder="John"
                  value={editPlayerForm.firstName}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                <Input
                  type="text"
                  placeholder="Smith"
                  value={editPlayerForm.lastName}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Jersey Number</label>
                <Input
                  type="text"
                  placeholder="23"
                  value={editPlayerForm.jerseyNumber}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                <div className="relative">
                  <select
                    value={editPlayerForm.primaryPosition}
                    onChange={(e) => setEditPlayerForm(prev => ({ ...prev, primaryPosition: e.target.value }))}
                    className="w-full appearance-none bg-white/5 border border-white/10 text-white px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                  >
                    {positionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#0a1628]">{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Height</label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Feet"
                  min={3}
                  max={7}
                  value={editPlayerForm.heightFeet}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, heightFeet: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Inches"
                  min={0}
                  max={11}
                  value={editPlayerForm.heightInches}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, heightInches: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">School</label>
                <Input
                  type="text"
                  placeholder="School name"
                  value={editPlayerForm.school}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, school: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Class (Grad Year)</label>
                <Input
                  type="number"
                  placeholder="2026"
                  min={2020}
                  max={2040}
                  value={editPlayerForm.graduationYear}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, graduationYear: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-gray-300 hover:bg-white/10"
                onClick={() => {
                  setIsEditPlayerOpen(false)
                  setEditPlayerForm({
                    playerId: '',
                    firstName: '',
                    lastName: '',
                    jerseyNumber: '',
                    primaryPosition: '',
                    heightFeet: '',
                    heightInches: '',
                    school: '',
                    graduationYear: '',
                  })
                  setError('')
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isEditPlayerSubmitting}
                className="flex-1 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
