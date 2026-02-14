'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Users, Trophy, Trash2, UserPlus, Pencil, Upload, FileText, X, Check, ChevronDown, AlertCircle, Link2 } from 'lucide-react'
import { Button, Badge, Input, Modal } from '@/components/ui'
import { divisions } from '@/lib/constants'

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

interface PlayerMatch {
  id: string
  firstName: string
  lastName: string
  profilePhoto: string | null
  school: string | null
  graduationYear: number | null
  primaryPosition: string | null
  heightFeet: number | null
  heightInches: number | null
  currentTeams: Array<{
    teamName: string
    programName: string | null
  }>
  isOnTargetRoster: boolean
  hasGuardian: boolean
}

const positionOptions = [
  { value: '', label: 'Select Position' },
  { value: 'PG', label: 'Point Guard (PG)' },
  { value: 'SG', label: 'Shooting Guard (SG)' },
  { value: 'SF', label: 'Small Forward (SF)' },
  { value: 'PF', label: 'Power Forward (PF)' },
  { value: 'C', label: 'Center (C)' },
]

const divisionOptions = [
  { value: '', label: 'Select Division' },
  ...divisions.map(d => ({ value: d, label: d })),
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

  // Player dedup state (manual add)
  const [duplicateMatches, setDuplicateMatches] = useState<PlayerMatch[]>([])
  const [isSearchingDupes, setIsSearchingDupes] = useState(false)
  const [duplicateDecision, setDuplicateDecision] = useState<string | null>(null) // null = undecided, playerId = use existing, 'new' = create new

  // Player dedup state (batch import)
  const [batchMatches, setBatchMatches] = useState<Map<number, PlayerMatch[]>>(new Map())
  const [batchResolutions, setBatchResolutions] = useState<Map<number, { resolution: 'new' | 'existing'; playerId?: string }>>(new Map())
  const [isCheckingBatchDupes, setIsCheckingBatchDupes] = useState(false)

  // Push to Exposure state
  const [isPushModalOpen, setIsPushModalOpen] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [pushEventId, setPushEventId] = useState('')
  const [pushDivisionId, setPushDivisionId] = useState('')
  const [pushResult, setPushResult] = useState<{ success?: boolean; error?: string } | null>(null)

  // Events the team is registered for (to populate dropdown)
  const [registeredEvents, setRegisteredEvents] = useState<any[]>([])

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

  // Debounced search for duplicate players when adding manually
  useEffect(() => {
    const firstName = playerForm.firstName.trim()
    const lastName = playerForm.lastName.trim()

    if (firstName.length < 2 || lastName.length < 2) {
      setDuplicateMatches([])
      setDuplicateDecision(null)
      return
    }

    const controller = new AbortController()
    const debounce = setTimeout(async () => {
      setIsSearchingDupes(true)
      try {
        const res = await fetch(
          `/api/director/players/search?q=${encodeURIComponent(firstName + ' ' + lastName)}&teamId=${teamId}`,
          { signal: controller.signal }
        )
        const data = await res.json()
        if (res.ok && data.players?.length > 0) {
          setDuplicateMatches(data.players)
          setDuplicateDecision(null)
        } else {
          setDuplicateMatches([])
          setDuplicateDecision(null)
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Error searching for duplicates:', err)
        }
      } finally {
        setIsSearchingDupes(false)
      }
    }, 300)

    return () => {
      clearTimeout(debounce)
      controller.abort()
    }
  }, [playerForm.firstName, playerForm.lastName, teamId])

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/director/teams/${teamId}`)
      const data = await res.json()

      if (res.ok) {
        setTeam(data.team)
        // Extract registered events if available (needs API update to include eventTeams)
        if (data.team.eventTeams) {
          setRegisteredEvents(data.team.eventTeams.map((et: any) => et.event))
        }
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

  const handlePushToExposure = async () => {
    if (!pushEventId || !pushDivisionId) return

    setIsPushing(true)
    setPushResult(null)

    try {
      const res = await fetch(`/api/director/teams/${teamId}/push-exposure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: pushEventId,
          exposureDivisionId: pushDivisionId
        })
      })

      const data = await res.json()

      if (res.ok) {
        setPushResult({ success: true })
        // Close modal after delay
        setTimeout(() => {
          setIsPushModalOpen(false)
          setPushResult(null)
          setPushEventId('')
          setPushDivisionId('')
        }, 2000)
      } else {
        setPushResult({ error: data.error || 'Failed to push team' })
      }
    } catch (err) {
      setPushResult({ error: 'Network error occurred' })
    } finally {
      setIsPushing(false)
    }
  }

  const resetAddPlayerState = () => {
    setPlayerForm({ firstName: '', lastName: '', jerseyNumber: '', primaryPosition: '', heightFeet: '', heightInches: '', school: '', graduationYear: '' })
    setDuplicateMatches([])
    setDuplicateDecision(null)
    setError('')
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // If matches were found but director hasn't decided, block submit
    if (duplicateMatches.length > 0 && duplicateDecision === null) {
      setError('Please select an existing player or choose to create a new one')
      return
    }

    try {
      setIsSubmitting(true)

      // If director chose an existing player, send playerId
      if (duplicateDecision && duplicateDecision !== 'new') {
        const res = await fetch(`/api/director/teams/${teamId}/roster`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: duplicateDecision,
            jerseyNumber: playerForm.jerseyNumber.trim() || null,
          }),
        })

        if (res.ok) {
          setIsAddPlayerOpen(false)
          resetAddPlayerState()
          fetchTeam()
        } else {
          const data = await res.json()
          setError(data.error || 'Failed to add player')
        }
      } else {
        // Create new player (original path)
        if (!playerForm.firstName.trim() || !playerForm.lastName.trim()) {
          setError('First name and last name are required')
          setIsSubmitting(false)
          return
        }

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
          resetAddPlayerState()
          fetchTeam()
        } else {
          const data = await res.json()
          setError(data.error || 'Failed to add player')
        }
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

  const checkBatchDuplicates = async (players: ParsedPlayer[]) => {
    setIsCheckingBatchDupes(true)
    try {
      const res = await fetch('/api/director/players/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: players.map(p => ({ firstName: p.firstName, lastName: p.lastName })),
          teamId,
        }),
      })

      const data = await res.json()
      const newMatchMap = new Map<number, PlayerMatch[]>()
      const newResolutions = new Map<number, { resolution: 'new' | 'existing'; playerId?: string }>()

      if (res.ok && data.matches) {
        for (const match of data.matches) {
          newMatchMap.set(match.index, match.players)
          // Auto-select first non-already-on-roster match
          const bestMatch = match.players.find((p: PlayerMatch) => !p.isOnTargetRoster)
          if (bestMatch) {
            newResolutions.set(match.index, { resolution: 'existing', playerId: bestMatch.id })
          }
        }
      }

      setBatchMatches(newMatchMap)
      setBatchResolutions(newResolutions)
    } catch (err) {
      console.error('Error checking batch duplicates:', err)
      setBatchMatches(new Map())
      setBatchResolutions(new Map())
    } finally {
      setIsCheckingBatchDupes(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setParseError('')
    setParsedPlayers([])
    setBatchMatches(new Map())
    setBatchResolutions(new Map())
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
          // Check for duplicates after parsing
          await checkBatchDuplicates(data.players)
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

    // Split players into create-new and link-existing groups
    const playersToCreate: ParsedPlayer[] = []
    const playersToLink: Array<{ playerId: string; jerseyNumber: string | null }> = []

    parsedPlayers.forEach((player, index) => {
      const resolution = batchResolutions.get(index)
      if (resolution?.resolution === 'existing' && resolution.playerId) {
        playersToLink.push({
          playerId: resolution.playerId,
          jerseyNumber: player.jerseyNumber,
        })
      } else {
        playersToCreate.push(player)
      }
    })

    try {
      let created = 0
      let linked = 0
      let errors = 0

      // Create new players via batch endpoint
      if (playersToCreate.length > 0) {
        const res = await fetch(`/api/director/teams/${teamId}/roster/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ players: playersToCreate }),
        })

        const data = await res.json()
        if (res.ok) {
          created = data.results?.added || 0
        } else {
          setParseError(data.error || 'Failed to import new players')
          setIsImporting(false)
          return
        }
      }

      // Link existing players via individual roster calls
      for (const link of playersToLink) {
        try {
          const res = await fetch(`/api/director/teams/${teamId}/roster`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(link),
          })
          if (res.ok) {
            linked++
          } else {
            errors++
          }
        } catch {
          errors++
        }
      }

      setIsAddPlayerOpen(false)
      setParsedPlayers([])
      setBatchMatches(new Map())
      setBatchResolutions(new Map())
      setUploadFileName('')
      setActiveTab('manual')
      fetchTeam()

      const parts: string[] = []
      if (created > 0) parts.push(`Created ${created} new players`)
      if (linked > 0) parts.push(`Linked ${linked} existing players`)
      if (errors > 0) parts.push(`${errors} errors`)
      alert(parts.join('. ') + '.')
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
          division: editForm.division || null,
          coachName: editForm.coachName.trim() || null,
        }),
      })

      if (res.ok) {
        setTeam(prev => prev ? {
          ...prev,
          name: editForm.name.trim(),
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
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    return null
  }

  if (error && !team) {
    return (
      <div className="min-h-screen bg-page-bg relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-8 relative z-10">
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-6">
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
    <div className="min-h-screen bg-page-bg relative overflow-hidden">
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
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-6 md:p-8 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              {logoUrl ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-border-default bg-surface-glass">
                  <Image
                    src={logoUrl}
                    alt={team.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a3a6e] to-[#0a1628] flex items-center justify-center border-2 border-border-default">
                  <span className="text-2xl font-bold text-white/30">
                    {team.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary tracking-tight">{team.name}</h1>
                  <button
                    onClick={openEditModal}
                    className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
                    title="Edit team settings"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {team.division && <Badge variant="info">{team.division}</Badge>}
                  <span className="text-text-muted">{team.program.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-surface-overlay px-4 py-2.5 rounded-xl">
              <Trophy className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-text-primary font-mono">
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
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Coach</div>
                <div className="text-lg font-semibold text-text-primary">{team.coachName || 'Not assigned'}</div>
              </div>
            </div>
          </div>
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Roster Size</div>
                <div className="text-lg font-semibold text-text-primary">{team.roster.length} players</div>
              </div>
            </div>
          </div>
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-overlay rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Games</div>
                <div className="text-lg font-semibold text-text-primary">{team._count.homeGames + team._count.awayGames}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Roster Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-bold text-text-primary">Roster</h2>
          <Button
            onClick={() => setIsAddPlayerOpen(true)}
            className="bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] shadow-lg shadow-[#E31837]/25"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Player
          </Button>
        </div>

        {team.roster.length === 0 ? (
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-surface-overlay rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-heading font-bold text-text-primary mb-2">No Players Yet</h3>
            <p className="text-text-muted mb-6 max-w-md mx-auto">
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
          <div className="bg-surface-glass backdrop-blur-xl border border-border-default rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-page-bg-alt border-b border-border-default">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">#</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Player</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Position</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Height</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">School</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Class</th>
                  <th className="px-5 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {team.roster.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-glass transition-colors">
                    <td className="px-5 py-4 text-text-primary font-mono font-medium">
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
                          <div className="w-10 h-10 bg-surface-overlay rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-text-muted">
                              {entry.player.firstName.charAt(0)}{entry.player.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="font-medium text-text-primary hover:text-[#E31837] transition-colors">
                          {entry.player.firstName} {entry.player.lastName}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {entry.player.primaryPosition || '-'}
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {entry.player.heightFeet && entry.player.heightInches !== null
                        ? `${entry.player.heightFeet}'${entry.player.heightInches}"`
                        : '-'}
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {entry.player.school || '-'}
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {entry.player.graduationYear || '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditPlayerModal(entry.player)}
                          className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
                          title="Edit player"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemovePlayer(
                            entry.player.id,
                            `${entry.player.firstName} ${entry.player.lastName}`
                          )}
                          className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
            resetAddPlayerState()
            setParsedPlayers([])
            setParseError('')
            setUploadFileName('')
            setActiveTab('manual')
            setBatchMatches(new Map())
            setBatchResolutions(new Map())
          }}
          title="Add Players to Roster"
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-border-default mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manual'
                ? 'border-[#E31837] text-white'
                : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload'
                ? 'border-[#E31837] text-white'
                : 'border-transparent text-text-muted hover:text-text-primary'
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
                  <label className="block text-sm font-medium text-text-secondary mb-2">First Name *</label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={playerForm.firstName}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Last Name *</label>
                  <Input
                    type="text"
                    placeholder="Smith"
                    value={playerForm.lastName}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Duplicate player detection panel */}
              {isSearchingDupes && (
                <div className="flex items-center gap-2 text-text-muted text-sm py-2">
                  <div className="animate-spin w-4 h-4 border-2 border-[#E31837] border-t-transparent rounded-full" />
                  Checking for existing players...
                </div>
              )}

              {duplicateMatches.length > 0 && !isSearchingDupes && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    {duplicateMatches.length === 1
                      ? 'A player with this name already exists'
                      : `${duplicateMatches.length} players with this name already exist`}
                  </div>

                  {duplicateMatches.map((match) => (
                    <div
                      key={match.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        match.isOnTargetRoster
                          ? 'border-red-500/30 bg-red-500/5'
                          : duplicateDecision === match.id
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-border-default bg-surface-glass'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-overlay rounded-full flex items-center justify-center flex-shrink-0">
                          {match.profilePhoto ? (
                            <Image src={match.profilePhoto} alt="" width={40} height={40} className="rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-text-muted">
                              {match.firstName.charAt(0)}{match.lastName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-text-primary font-medium text-sm flex items-center gap-2">
                            {match.firstName} {match.lastName}
                            {match.hasGuardian && (
                              <Badge variant="info" className="text-[10px] px-1.5 py-0">Claimed</Badge>
                            )}
                          </div>
                          <div className="text-text-muted text-xs flex items-center gap-2 flex-wrap">
                            {match.primaryPosition && <span>{match.primaryPosition}</span>}
                            {match.heightFeet && <span>{match.heightFeet}&apos;{match.heightInches || 0}&quot;</span>}
                            {match.graduationYear && <span>Class {match.graduationYear}</span>}
                          </div>
                          {match.school && (
                            <div className="text-text-muted text-xs">{match.school}</div>
                          )}
                          {match.currentTeams.length > 0 && (
                            <div className="text-text-muted text-xs">
                              {match.currentTeams.map(t => `${t.teamName}${t.programName ? ` (${t.programName})` : ''}`).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>

                      {match.isOnTargetRoster ? (
                        <Badge variant="error" className="text-xs flex-shrink-0">Already on roster</Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant={duplicateDecision === match.id ? 'primary' : 'outline'}
                          onClick={() => setDuplicateDecision(duplicateDecision === match.id ? null : match.id)}
                          className={duplicateDecision === match.id
                            ? ''
                            : 'border-border-default text-text-secondary'}
                        >
                          <Link2 className="w-3 h-3 mr-1" />
                          {duplicateDecision === match.id ? 'Selected' : 'Use This Player'}
                        </Button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setDuplicateDecision(duplicateDecision === 'new' ? null : 'new')}
                    className={`w-full text-center text-sm py-2 rounded-lg border transition-colors ${
                      duplicateDecision === 'new'
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                        : 'border-border-default text-text-muted hover:text-text-primary hover:bg-surface-glass'
                    }`}
                  >
                    {duplicateDecision === 'new' ? '+ Creating new player' : '+ Create new player instead'}
                  </button>
                </div>
              )}

              {/* Hide remaining fields when linking existing player */}
              {duplicateDecision && duplicateDecision !== 'new' ? (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Jersey Number</label>
                  <Input
                    type="text"
                    placeholder="23"
                    value={playerForm.jerseyNumber}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                    maxLength={3}
                  />
                  <p className="text-text-muted text-xs mt-2">Other details will be pulled from the existing player profile.</p>
                </div>
              ) : (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Jersey Number</label>
                  <Input
                    type="text"
                    placeholder="23"
                    value={playerForm.jerseyNumber}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                    maxLength={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Position</label>
                  <div className="relative">
                    <select
                      value={playerForm.primaryPosition}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, primaryPosition: e.target.value }))}
                      className="w-full appearance-none bg-surface-glass border border-border-default text-text-primary px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                    >
                      {positionOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-page-bg-alt">{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Height</label>
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
                  <label className="block text-sm font-medium text-text-secondary mb-2">School</label>
                  <Input
                    type="text"
                    placeholder="School name"
                    value={playerForm.school}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, school: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Class (Grad Year)</label>
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
              </>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border-default text-text-secondary hover:bg-surface-overlay"
                  onClick={() => {
                    setIsAddPlayerOpen(false)
                    resetAddPlayerState()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={duplicateMatches.length > 0 && duplicateDecision === null}
                  className="flex-1 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530]"
                >
                  {duplicateDecision && duplicateDecision !== 'new' ? 'Add to Roster' : 'Add Player'}
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
                <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center hover:border-white/30 transition-colors">
                  <input
                    type="file"
                    id="roster-upload"
                    accept=".csv,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="roster-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-white mx-auto mb-3" />
                    <p className="text-text-secondary text-sm mb-1">
                      Include: First Name, Last Name, Number, Position, Height, Grad Year, School
                    </p>
                    <p className="text-text-muted text-xs mb-4">
                      (any order - AI will figure it out)
                    </p>
                    <p className="text-text-primary font-medium mb-2">
                      Drop your roster file here or click to browse
                    </p>
                    <p className="text-text-muted text-sm">
                      Supports CSV, PNG, and JPG files
                    </p>
                  </label>
                </div>
              )}

              {isParsing && (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-text-primary font-medium">Analyzing {uploadFileName}...</p>
                  <p className="text-text-muted text-sm mt-1">
                    Using AI to extract player information
                  </p>
                </div>
              )}

              {isCheckingBatchDupes && (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-[#E31837] border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-text-muted text-sm">Checking for existing players...</p>
                </div>
              )}

              {parsedPlayers.length > 0 && !isParsing && !isCheckingBatchDupes && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-white" />
                      <span className="text-text-primary font-medium">
                        {parsedPlayers.length} players found
                      </span>
                      {uploadFileName && (
                        <span className="text-text-muted text-sm">from {uploadFileName}</span>
                      )}
                      {batchMatches.size > 0 && (
                        <Badge variant="warning" className="text-xs">
                          {batchMatches.size} possible {batchMatches.size === 1 ? 'match' : 'matches'}
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setParsedPlayers([])
                        setUploadFileName('')
                        setBatchMatches(new Map())
                        setBatchResolutions(new Map())
                      }}
                      className="text-text-muted hover:text-text-primary text-sm"
                    >
                      Upload different file
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto border border-border-default rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-page-bg-alt sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-text-muted font-medium">Name</th>
                          <th className="px-3 py-2 text-left text-text-muted font-medium">#</th>
                          <th className="px-3 py-2 text-left text-text-muted font-medium">Pos</th>
                          <th className="px-3 py-2 text-left text-text-muted font-medium">Class</th>
                          <th className="px-3 py-2 text-left text-text-muted font-medium">Status</th>
                          <th className="px-3 py-2 text-right text-text-muted font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {parsedPlayers.map((player, index) => {
                          const matches = batchMatches.get(index)
                          const resolution = batchResolutions.get(index)
                          const hasMatch = matches && matches.length > 0
                          const linkedPlayer = hasMatch && resolution?.resolution === 'existing'
                            ? matches.find(m => m.id === resolution.playerId)
                            : null

                          return (
                            <tr key={index} className={`${hasMatch ? 'bg-amber-500/5' : ''} hover:bg-surface-glass`}>
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={player.firstName}
                                    onChange={(e) => updateParsedPlayer(index, 'firstName', e.target.value)}
                                    className="w-20 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-text-primary px-1 outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={player.lastName}
                                    onChange={(e) => updateParsedPlayer(index, 'lastName', e.target.value)}
                                    className="w-24 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-text-primary px-1 outline-none"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={player.jerseyNumber || ''}
                                  onChange={(e) => updateParsedPlayer(index, 'jerseyNumber', e.target.value || null)}
                                  className="w-10 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-text-primary px-1 outline-none"
                                  placeholder="-"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={player.primaryPosition || ''}
                                  onChange={(e) => updateParsedPlayer(index, 'primaryPosition', e.target.value || null)}
                                  className="w-10 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-text-primary px-1 outline-none"
                                  placeholder="-"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={player.graduationYear || ''}
                                  onChange={(e) => updateParsedPlayer(index, 'graduationYear', e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-12 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-[#E31837] text-text-primary px-1 outline-none"
                                  placeholder="-"
                                />
                              </td>
                              <td className="px-3 py-2">
                                {!hasMatch ? (
                                  <span className="text-text-muted text-xs">New</span>
                                ) : linkedPlayer ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Toggle back to "create new"
                                      setBatchResolutions(prev => {
                                        const next = new Map(prev)
                                        next.delete(index)
                                        return next
                                      })
                                    }}
                                    className="text-xs text-green-400 flex items-center gap-1 hover:text-green-300"
                                    title={`Linking to ${linkedPlayer.firstName} ${linkedPlayer.lastName} on ${linkedPlayer.currentTeams[0]?.teamName || 'another team'}`}
                                  >
                                    <Link2 className="w-3 h-3" />
                                    Linking
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const bestMatch = matches!.find(m => !m.isOnTargetRoster)
                                      if (bestMatch) {
                                        setBatchResolutions(prev => {
                                          const next = new Map(prev)
                                          next.set(index, { resolution: 'existing', playerId: bestMatch.id })
                                          return next
                                        })
                                      }
                                    }}
                                    className="text-xs text-amber-400 flex items-center gap-1 hover:text-amber-300"
                                    title={`Match found: ${matches![0].currentTeams[0]?.teamName || 'existing player'}${matches![0].school ? ` - ${matches![0].school}` : ''}${matches![0].graduationYear ? ` - Class ${matches![0].graduationYear}` : ''}`}
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    Match
                                  </button>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => removeParsedPlayer(index)}
                                  className="text-text-muted hover:text-red-400 transition-colors"
                                  title="Remove player"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {batchMatches.size > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
                      <AlertCircle className="w-3 h-3 inline-block mr-1" />
                      {batchMatches.size} player{batchMatches.size !== 1 ? 's' : ''} matched existing profiles.
                      Players marked &quot;Linking&quot; will be added to your roster from their existing profile.
                      Click &quot;Linking&quot; to switch to creating a new profile, or &quot;Match&quot; to link instead.
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border-default text-text-secondary hover:bg-surface-overlay"
                      onClick={() => {
                        setIsAddPlayerOpen(false)
                        setParsedPlayers([])
                        setUploadFileName('')
                        setActiveTab('manual')
                        setBatchMatches(new Map())
                        setBatchResolutions(new Map())
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
                    className="border-border-default text-text-secondary hover:bg-surface-overlay"
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
              <label className="block text-sm font-medium text-text-secondary mb-2">Team Name *</label>
              <Input
                type="text"
                placeholder="e.g., Houston Elite 17U"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Division</label>
              <div className="relative">
                <select
                  value={editForm.division}
                  onChange={(e) => setEditForm(prev => ({ ...prev, division: e.target.value }))}
                  className="w-full appearance-none bg-surface-glass border border-border-default text-text-primary px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                >
                  {divisionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-page-bg-alt">{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Coach Name</label>
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
                className="border-border-default text-text-secondary hover:bg-surface-overlay"
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
                <label className="block text-sm font-medium text-text-secondary mb-2">First Name *</label>
                <Input
                  type="text"
                  placeholder="John"
                  value={editPlayerForm.firstName}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Last Name *</label>
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
                <label className="block text-sm font-medium text-text-secondary mb-2">Jersey Number</label>
                <Input
                  type="text"
                  placeholder="23"
                  value={editPlayerForm.jerseyNumber}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Position</label>
                <div className="relative">
                  <select
                    value={editPlayerForm.primaryPosition}
                    onChange={(e) => setEditPlayerForm(prev => ({ ...prev, primaryPosition: e.target.value }))}
                    className="w-full appearance-none bg-surface-glass border border-border-default text-text-primary px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]/50 transition-all cursor-pointer"
                  >
                    {positionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-page-bg-alt">{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Height</label>
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
                <label className="block text-sm font-medium text-text-secondary mb-2">School</label>
                <Input
                  type="text"
                  placeholder="School name"
                  value={editPlayerForm.school}
                  onChange={(e) => setEditPlayerForm(prev => ({ ...prev, school: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Class (Grad Year)</label>
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
                className="border-border-default text-text-secondary hover:bg-surface-overlay"
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
      {/* Push to Exposure Modal */}

    </div>
  )
}
