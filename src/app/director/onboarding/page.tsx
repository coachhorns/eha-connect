'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Loader2,
  ImageIcon,
  X,
  Plus,
  Trash2,
  Users,
  Camera,
  Check,
  ChevronRight,
  Building2,
  AlertCircle,
  Upload,
} from 'lucide-react'
import { Card, Button, Input, Badge } from '@/components/ui'
import { divisions } from '@/lib/constants'

interface TeamData {
  id: string
  name: string
  division: string
  coachName: string
}

interface PlayerData {
  id: string
  firstName: string
  lastName: string
  jerseyNumber: string
}

interface TeamWithRoster extends TeamData {
  players: PlayerData[]
}

type OnboardingStep = 'program' | 'teams' | 'rosters' | 'complete'

function OnboardingContent() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rosterImageRef = useRef<HTMLInputElement>(null)

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('program')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState('')
  const [programId, setProgramId] = useState<string | null>(null)
  const [createdTeamIds, setCreatedTeamIds] = useState<string[]>([])

  // Step 1: Program data
  const [programData, setProgramData] = useState({
    name: '',
    city: '',
    state: '',
    logo: '',
  })

  // Step 2: Teams data
  const [teams, setTeams] = useState<TeamData[]>([
    { id: '1', name: '', division: '', coachName: '' },
  ])

  // Step 3: Rosters data (keyed by team index)
  const [rosters, setRosters] = useState<Record<string, PlayerData[]>>({})
  const [activeTeamIndex, setActiveTeamIndex] = useState(0)
  const [newPlayer, setNewPlayer] = useState<PlayerData>({
    id: '',
    firstName: '',
    lastName: '',
    jerseyNumber: '',
  })
  const [showIncompleteModal, setShowIncompleteModal] = useState(false)

  // Auto-upgrade PARENT/PLAYER users to PROGRAM_DIRECTOR (Google OAuth from join page)
  const [isUpgrading, setIsUpgrading] = useState(false)
  useEffect(() => {
    const upgradeRole = async () => {
      if (status !== 'authenticated') return
      const role = session?.user?.role
      if (role === 'PARENT' || role === 'PLAYER') {
        setIsUpgrading(true)
        try {
          await fetch('/api/user/upgrade-to-director', { method: 'POST' })
          await update() // Refresh JWT with new role
        } catch (err) {
          console.error('Failed to upgrade role:', err)
        }
        setIsUpgrading(false)
      }
    }
    upgradeRole()
  }, [status, session?.user?.role, update])

  // Check for existing program
  useEffect(() => {
    const checkExistingProgram = async () => {
      if (status !== 'authenticated') return
      if (session?.user?.role !== 'PROGRAM_DIRECTOR' && session?.user?.role !== 'ADMIN') return

      try {
        const res = await fetch('/api/director/program')
        const data = await res.json()

        if (data.program) {
          setProgramId(data.program.id)

          if (data.program.teams.length > 0) {
            // Has teams - check if they have rosters
            const hasEmptyRosters = data.program.teams.some((t: any) => t.rosterCount === 0)

            if (hasEmptyRosters) {
              // Skip to rosters step and load existing rosters
              const existingTeams = data.program.teams.map((t: any, i: number) => ({
                id: t.id,
                name: t.name,
                division: t.division || '',
                coachName: t.coachName || '',
              }))
              setTeams(existingTeams)
              setCreatedTeamIds(existingTeams.map((t: any) => t.id))

              // Populate rosters state with any previously saved players
              const existingRosters: Record<string, PlayerData[]> = {}
              for (const t of data.program.teams) {
                if (t.roster && t.roster.length > 0) {
                  existingRosters[t.id] = t.roster.map((r: any, i: number) => ({
                    id: r.playerId || String(Date.now() + i),
                    firstName: r.firstName || '',
                    lastName: r.lastName || '',
                    jerseyNumber: r.jerseyNumber != null ? String(r.jerseyNumber) : '',
                  }))
                }
              }
              setRosters(existingRosters)

              setCurrentStep('rosters')
            } else if (callbackUrl) {
              // Complete - redirect to callback
              router.push(callbackUrl)
            } else {
              router.push('/director/welcome')
            }
          } else {
            // Has program but no teams - skip to teams step
            setCurrentStep('teams')
          }
        }
      } catch (err) {
        console.error('Error checking existing program:', err)
      }
    }

    checkExistingProgram()
  }, [status, session, router, callbackUrl])

  // Strict auth check
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page-bg">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin?callbackUrl=/director/onboarding')
    return null
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR' && session?.user.role !== 'ADMIN') {
    // Still upgrading — show loading instead of redirecting
    if (isUpgrading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A1D37]">
          <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
        </div>
      )
    }
    router.push('/')
    return null
  }

  // Handlers for program step
  const handleProgramChange = (field: string, value: string) => {
    setProgramData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const uploadLogo = async (file: File) => {
    setIsUploading(true)
    setError('')

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()

      if (res.ok) {
        setProgramData(prev => ({ ...prev, logo: data.url }))
      } else {
        setError(data.error || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadLogo(file)
  }

  const handleRemoveLogo = () => {
    setProgramData(prev => ({ ...prev, logo: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handlers for teams step
  const handleTeamChange = (index: number, field: keyof TeamData, value: string) => {
    const newTeams = [...teams]
    newTeams[index] = { ...newTeams[index], [field]: value }
    setTeams(newTeams)
    setError('')
  }

  const addTeam = () => {
    setTeams([...teams, { id: String(Date.now()), name: '', division: '', coachName: '' }])
  }

  const removeTeam = (index: number) => {
    if (teams.length === 1) return
    const newTeams = teams.filter((_, i) => i !== index)
    setTeams(newTeams)
  }

  // Auto-save a team's roster to the backend (batch API skips duplicates)
  const saveRosterToBackend = async (teamId: string, players: PlayerData[]) => {
    if (!teamId || players.length === 0) return
    try {
      await fetch(`/api/director/teams/${teamId}/roster/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: players.map(p => ({
            firstName: p.firstName,
            lastName: p.lastName,
            jerseyNumber: p.jerseyNumber || null,
            primaryPosition: null,
            graduationYear: null,
            heightFeet: null,
            heightInches: null,
            school: null,
          })),
        }),
      })
    } catch (err) {
      console.error('Auto-save roster failed:', err)
    }
  }

  // Handlers for rosters step
  const addPlayer = () => {
    if (!newPlayer.firstName.trim() || !newPlayer.lastName.trim()) {
      setError('First and last name are required')
      return
    }

    const teamId = createdTeamIds[activeTeamIndex] || teams[activeTeamIndex].id
    const currentRoster = rosters[teamId] || []
    const playerToAdd = { ...newPlayer, id: String(Date.now()) }

    setRosters({
      ...rosters,
      [teamId]: [...currentRoster, playerToAdd],
    })

    // Auto-save to backend immediately
    saveRosterToBackend(teamId, [playerToAdd])

    setNewPlayer({ id: '', firstName: '', lastName: '', jerseyNumber: '' })
    setError('')
  }

  const removePlayer = (playerId: string) => {
    const teamId = createdTeamIds[activeTeamIndex] || teams[activeTeamIndex].id
    const currentRoster = rosters[teamId] || []
    setRosters({
      ...rosters,
      [teamId]: currentRoster.filter(p => p.id !== playerId),
    })
  }

  const handleRosterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const teamId = createdTeamIds[activeTeamIndex]
      if (!teamId) {
        setError('Team not found')
        setIsParsing(false)
        return
      }

      const res = await fetch(`/api/director/teams/${teamId}/roster/parse`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok && data.players) {
        // Add parsed players to the roster
        const currentRoster = rosters[teamId] || []
        const newPlayers: PlayerData[] = data.players.map((p: any, i: number) => ({
          id: String(Date.now() + i),
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          jerseyNumber: p.jerseyNumber || '',
        })).filter((p: PlayerData) => p.firstName && p.lastName)

        const updatedRosters = {
          ...rosters,
          [teamId]: [...currentRoster, ...newPlayers],
        }
        setRosters(updatedRosters)

        // Auto-save to backend immediately
        if (newPlayers.length > 0) {
          saveRosterToBackend(teamId, newPlayers)
        }

        // Auto-advance to next empty team
        if (newPlayers.length > 0) {
          const nextEmpty = teams.findIndex((_, i) => {
            if (i === activeTeamIndex) return false
            const tid = createdTeamIds[i]
            return !tid || (updatedRosters[tid] || []).length === 0
          })
          if (nextEmpty !== -1) {
            setTimeout(() => setActiveTeamIndex(nextEmpty), 600)
          }
        }
      } else {
        setError(data.error || 'Failed to parse roster image')
      }
    } catch (err) {
      console.error('Error parsing roster:', err)
      setError('Failed to parse roster image')
    } finally {
      setIsParsing(false)
      if (rosterImageRef.current) {
        rosterImageRef.current.value = ''
      }
    }
  }

  // Submit handlers
  const handleProgramSubmit = async () => {
    if (!programData.name.trim()) {
      setError('Program name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: programData.name.trim(),
          directorName: session.user.name || null,
          directorEmail: session.user.email || null,
          directorPhone: null,
          city: programData.city.trim() || null,
          state: programData.state.trim() || null,
          logo: programData.logo || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setProgramId(data.program.id)
        setCurrentStep('teams')
      } else {
        setError(data.error || 'Failed to create program')
      }
    } catch (err) {
      console.error('Error creating program:', err)
      setError('Failed to create program')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTeamsSubmit = async () => {
    // Validate at least one team with a name
    const validTeams = teams.filter(t => t.name.trim())
    if (validTeams.length === 0) {
      setError('At least one team with a name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const newTeamIds: string[] = []

      for (const team of validTeams) {
        const res = await fetch('/api/director/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: team.name.trim(),
            division: team.division || null,
            coachName: team.coachName.trim() || null,
            programId,
          }),
        })

        const data = await res.json()

        if (res.ok) {
          newTeamIds.push(data.team.id)
        } else {
          throw new Error(data.error || 'Failed to create team')
        }
      }

      // Update teams with their IDs and move to rosters step
      setCreatedTeamIds(newTeamIds)
      setTeams(validTeams)
      setCurrentStep('rosters')
    } catch (err) {
      console.error('Error creating teams:', err)
      setError(err instanceof Error ? err.message : 'Failed to create teams')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitRosters = async () => {
    setIsSubmitting(true)
    setError('')
    setShowIncompleteModal(false)

    try {
      // Submit rosters for each team that has players
      for (let i = 0; i < createdTeamIds.length; i++) {
        const teamId = createdTeamIds[i]
        const teamRoster = rosters[teamId] || []

        if (teamRoster.length > 0) {
          const res = await fetch(`/api/director/teams/${teamId}/roster/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              players: teamRoster.map(p => ({
                firstName: p.firstName,
                lastName: p.lastName,
                jerseyNumber: p.jerseyNumber || null,
                primaryPosition: null,
                graduationYear: null,
                heightFeet: null,
                heightInches: null,
                school: null,
              })),
            }),
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Failed to add players')
          }
        }
      }

      setCurrentStep('complete')
    } catch (err) {
      console.error('Error adding players:', err)
      setError(err instanceof Error ? err.message : 'Failed to add players')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRostersSubmit = async () => {
    // If some teams are empty, show the warning modal first
    if (emptyTeams.length > 0) {
      setShowIncompleteModal(true)
      return
    }
    // All teams have players — submit directly
    await submitRosters()
  }

  const handleComplete = () => {
    if (callbackUrl) {
      router.push(callbackUrl)
    } else {
      router.push('/director/welcome')
    }
  }

  // Get current team roster
  const currentTeamId = createdTeamIds[activeTeamIndex] || teams[activeTeamIndex]?.id
  const currentRoster = rosters[currentTeamId] || []

  // Roster progress tracking
  const teamsWithPlayers = teams.filter((_, i) => {
    const teamId = createdTeamIds[i]
    return teamId && (rosters[teamId] || []).length > 0
  })
  const readyCount = teamsWithPlayers.length
  const totalTeams = teams.length
  const allTeamsReady = readyCount === totalTeams

  const emptyTeams = teams
    .map((t, i) => ({ ...t, index: i }))
    .filter((t) => {
      const teamId = createdTeamIds[t.index]
      return !teamId || (rosters[teamId] || []).length === 0
    })

  const advanceToNextEmpty = () => {
    const nextEmpty = teams.findIndex((_, i) => {
      if (i === activeTeamIndex) return false
      const teamId = createdTeamIds[i]
      return !teamId || (rosters[teamId] || []).length === 0
    })
    if (nextEmpty !== -1) setActiveTeamIndex(nextEmpty)
  }

  return (
    <div className="min-h-screen relative overflow-hidden [&_input]:!bg-white/5 [&_select]:!bg-white/5">
      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E31837] blur-[150px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-12 pb-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/images/main.png"
            alt="EHA Connect"
            width={200}
            height={200}
            className="w-auto h-32 mx-auto mb-4 object-contain"
            priority
          />

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${currentStep === 'program' ? 'bg-[#E31837] text-white' : 'bg-surface-overlay text-text-muted'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
              Program
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${currentStep === 'teams' ? 'bg-[#E31837] text-white' : 'bg-surface-overlay text-text-muted'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
              Teams
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${currentStep === 'rosters' ? 'bg-[#E31837] text-white' : 'bg-surface-overlay text-text-muted'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">3</span>
              Rosters
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        {/* Step 1: Program */}
        {currentStep === 'program' && (
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Create Your Program</h1>
            <p className="text-text-muted mb-6">
              Welcome, {session.user.name || 'Director'}! Let's set up your program.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Program Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Cali Rebels"
                  value={programData.name}
                  onChange={(e) => handleProgramChange('name', e.target.value)}
                  required
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Program Logo *
                </label>
                {programData.logo ? (
                  <div className="flex items-start gap-4">
                    <div className="relative w-24 h-24 bg-surface-raised rounded-lg overflow-hidden">
                      <img
                        src={programData.logo}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.classList.add('!border-[#E31837]/50')
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.classList.remove('!border-[#E31837]/50')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.classList.remove('!border-[#E31837]/50')
                      const file = e.dataTransfer.files?.[0]
                      if (file && file.type.startsWith('image/')) {
                        uploadLogo(file)
                      }
                    }}
                    className={`border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-[#E31837]/50 transition-colors ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-[#E31837] animate-spin mx-auto" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    )}
                    <p className="text-sm text-text-muted">Click or drag & drop to upload logo</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">City</label>
                  <Input
                    type="text"
                    placeholder="Los Angeles"
                    value={programData.city}
                    onChange={(e) => handleProgramChange('city', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">State</label>
                  <Input
                    type="text"
                    placeholder="CA"
                    value={programData.state}
                    onChange={(e) => handleProgramChange('state', e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>

              <Button
                onClick={handleProgramSubmit}
                isLoading={isSubmitting}
                disabled={isUploading}
                className="w-full"
              >
                Continue to Teams
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Teams */}
        {currentStep === 'teams' && (
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Add Your Teams</h1>
            <p className="text-text-muted mb-6">
              Add the teams in your program. You need at least one team.
            </p>

            <div className="space-y-4">
              {teams.map((team, index) => (
                <div key={team.id} className="bg-surface-glass border border-border-default rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                      Team {index + 1}
                    </h3>
                    {teams.length > 1 && (
                      <button
                        onClick={() => removeTeam(index)}
                        className="text-text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Team Name *"
                      value={team.name}
                      onChange={(e) => handleTeamChange(index, 'name', e.target.value)}
                    />

                    <select
                      value={team.division}
                      onChange={(e) => handleTeamChange(index, 'division', e.target.value)}
                      className="w-full bg-page-bg-alt border border-border-default rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-[#E31837]"
                    >
                      <option value="">Division</option>
                      {divisions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <Input
                      type="text"
                      placeholder="Coach Name"
                      value={team.coachName}
                      onChange={(e) => handleTeamChange(index, 'coachName', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={addTeam}
                className="w-full py-3 border-2 border-dashed border-border-default rounded-xl text-text-muted hover:text-text-primary hover:border-white/40 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Another Team
              </button>

              <Button
                onClick={handleTeamsSubmit}
                isLoading={isSubmitting}
                className="w-full"
              >
                Continue to Rosters
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Rosters */}
        {currentStep === 'rosters' && (
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Add Players</h1>
            <p className="text-text-muted mb-4">
              Add at least one player to <span className="text-white font-semibold">each</span> of your {totalTeams} teams. You can add more later.
            </p>

            {/* Progress Bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${allTeamsReady ? 'text-green-400' : 'text-text-muted'}`}>
                  {allTeamsReady ? 'All teams ready!' : `${readyCount} of ${totalTeams} teams ready`}
                </span>
                {!allTeamsReady && (
                  <span className="text-xs text-amber-400 font-medium">
                    {totalTeams - readyCount} remaining
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {teams.map((_, i) => {
                  const teamId = createdTeamIds[i]
                  const filled = teamId && (rosters[teamId] || []).length > 0
                  return (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        filled ? 'bg-green-500' : 'bg-white/10'
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {/* Team Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {teams.map((team, index) => {
                const teamId = createdTeamIds[index]
                const teamRoster = rosters[teamId] || []
                const hasPlayers = teamRoster.length > 0
                const playerCount = teamRoster.length

                return (
                  <button
                    key={team.id}
                    onClick={() => setActiveTeamIndex(index)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 border ${
                      activeTeamIndex === index
                        ? 'bg-[#E31837] text-white border-[#E31837]'
                        : hasPlayers
                          ? 'bg-surface-overlay text-text-primary border-green-500/30 hover:border-green-500/50'
                          : 'bg-surface-overlay text-text-muted border-amber-500/30 hover:border-amber-500/50'
                    }`}
                  >
                    {team.name || `Team ${index + 1}`}
                    {hasPlayers ? (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTeamIndex === index ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-400'
                      }`}>
                        <Check className="w-3 h-3" />
                        {playerCount}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                        activeTeamIndex === index ? 'text-white/80' : 'text-amber-400'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Empty
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Roster Image Upload Banner */}
            <div className="bg-gradient-to-r from-[#E31837]/15 to-[#E31837]/5 border border-[#E31837]/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Camera className="w-6 h-6 text-[#E31837] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-text-primary mb-1">Quick Tip: Save Time — Upload Your Roster</h3>
                  <p className="text-sm text-text-muted mb-2">
                    Upload a photo of your roster, a screenshot from Google Sheets or Excel, or even a handwritten document — our AI will automatically extract player info.
                  </p>
                  <p className="text-xs text-white font-bold mb-3">
                    Include (in no particular order): <span className="text-text-primary font-medium">first name, last name, jersey number, and graduating class</span> for best results.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rosterImageRef.current?.click()}
                      disabled={isParsing}
                      className="px-4 py-2 bg-[#E31837] hover:bg-[#c01530] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isParsing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isParsing ? 'Processing...' : 'Upload Image'}
                    </button>
                  </div>
                </div>
              </div>
              <input
                ref={rosterImageRef}
                type="file"
                accept="image/*"
                onChange={handleRosterImageUpload}
                className="hidden"
              />
            </div>

            {/* Current Team Roster */}
            <div className="bg-surface-glass border border-border-default rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                {teams[activeTeamIndex]?.name || `Team ${activeTeamIndex + 1}`} - {currentRoster.length} players
              </h3>

              {currentRoster.length > 0 && (
                <div className="space-y-2 mb-4">
                  {currentRoster.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-surface-glass rounded-lg">
                      <div className="flex items-center gap-3">
                        {player.jerseyNumber && (
                          <span className="text-sm font-mono text-text-muted w-8">#{player.jerseyNumber}</span>
                        )}
                        <span className="text-text-primary">{player.firstName} {player.lastName}</span>
                      </div>
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="text-text-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Player Form */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="First Name"
                  value={newPlayer.firstName}
                  onChange={(e) => setNewPlayer({ ...newPlayer, firstName: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="text"
                  placeholder="Last Name"
                  value={newPlayer.lastName}
                  onChange={(e) => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="text"
                  placeholder="#"
                  value={newPlayer.jerseyNumber}
                  onChange={(e) => setNewPlayer({ ...newPlayer, jerseyNumber: e.target.value })}
                  className="w-16"
                />
                <Button onClick={addPlayer} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleRostersSubmit}
              isLoading={isSubmitting}
              className="w-full"
            >
              {allTeamsReady ? (
                <>Complete Setup <Check className="w-4 h-4 ml-2" /></>
              ) : (
                <>Complete Setup ({readyCount} of {totalTeams} teams ready)</>
              )}
            </Button>
          </Card>
        )}

        {/* Incomplete Teams Warning Modal */}
        {showIncompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIncompleteModal(false)} />
            <div className="relative bg-[#0D2B5B] border border-border-default rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Some teams still need players</h3>
                  <p className="text-sm text-text-muted">{emptyTeams.length} of {totalTeams} teams have no roster</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {emptyTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setActiveTeamIndex(team.index)
                      setShowIncompleteModal(false)
                    }}
                    className="w-full flex items-center justify-between p-3 bg-white/5 border border-amber-500/20 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-sm font-medium text-text-primary">
                        {team.name || `Team ${team.index + 1}`}
                      </span>
                    </div>
                    <span className="text-xs text-amber-400 font-medium">Add players →</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setActiveTeamIndex(emptyTeams[0].index)
                    setShowIncompleteModal(false)
                  }}
                  className="w-full"
                >
                  Add Rosters Now
                </Button>
                <button
                  onClick={() => submitRosters()}
                  className="w-full px-4 py-2.5 text-sm text-text-muted hover:text-text-primary border border-border-default rounded-lg hover:bg-white/5 transition-colors"
                >
                  Skip for now — I&apos;ll add rosters later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 'complete' && (
          <Card className="p-6 text-center !bg-white/5 !border-white/10 !shadow-none">
            <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-400" />
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-2">You're All Set!</h1>
            <p className="text-text-muted mb-6">
              Your program, teams, and rosters have been created. You can now register for events!
            </p>

            {/* Summary */}
            <div className="bg-surface-glass border border-border-default rounded-xl p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Program</span>
                  <span className="text-text-primary font-medium">{programData.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Teams</span>
                  <span className="text-text-primary font-medium">{teams.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Players</span>
                  <span className="text-text-primary font-medium">
                    {Object.values(rosters).reduce((sum, r) => sum + r.length, 0)}
                  </span>
                </div>
              </div>
            </div>

            <Button onClick={handleComplete} className="w-full">
              {callbackUrl ? 'Continue to Event Registration' : 'Go to Dashboard'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function DirectorOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page-bg flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
