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
  const { data: session, status } = useSession()
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

  // Check for existing program
  useEffect(() => {
    const checkExistingProgram = async () => {
      if (status !== 'authenticated' || session?.user?.role !== 'PROGRAM_DIRECTOR') return

      try {
        const res = await fetch('/api/director/program')
        const data = await res.json()

        if (data.program) {
          setProgramId(data.program.id)

          if (data.program.teams.length > 0) {
            // Has teams - check if they have rosters
            const hasEmptyRosters = data.program.teams.some((t: any) => t.rosterCount === 0)

            if (hasEmptyRosters) {
              // Skip to rosters step
              const existingTeams = data.program.teams.map((t: any, i: number) => ({
                id: t.id,
                name: t.name,
                division: t.division || '',
                coachName: t.coachName || '',
              }))
              setTeams(existingTeams)
              setCreatedTeamIds(existingTeams.map((t: any) => t.id))
              setCurrentStep('rosters')
            } else if (callbackUrl) {
              // Complete - redirect to callback
              router.push(callbackUrl)
            } else {
              router.push('/director/dashboard')
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
      <div className="min-h-screen flex items-center justify-center bg-[#0A1D37]">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin?callbackUrl=/director/onboarding')
    return null
  }

  if (session?.user.role !== 'PROGRAM_DIRECTOR') {
    router.push('/')
    return null
  }

  // Handlers for program step
  const handleProgramChange = (field: string, value: string) => {
    setProgramData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

  // Handlers for rosters step
  const addPlayer = () => {
    if (!newPlayer.firstName.trim() || !newPlayer.lastName.trim()) {
      setError('First and last name are required')
      return
    }

    const teamId = createdTeamIds[activeTeamIndex] || teams[activeTeamIndex].id
    const currentRoster = rosters[teamId] || []

    setRosters({
      ...rosters,
      [teamId]: [
        ...currentRoster,
        { ...newPlayer, id: String(Date.now()) },
      ],
    })

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

        setRosters({
          ...rosters,
          [teamId]: [...currentRoster, ...newPlayers],
        })
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

  const handleRostersSubmit = async () => {
    // Validate at least one player per team
    const teamsWithoutPlayers = teams.filter((t, i) => {
      const teamId = createdTeamIds[i]
      const teamRoster = rosters[teamId] || []
      return teamRoster.length === 0
    })

    if (teamsWithoutPlayers.length > 0) {
      setError(`Please add at least one player to: ${teamsWithoutPlayers.map(t => t.name).join(', ')}`)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Submit rosters for each team
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

  const handleComplete = () => {
    if (callbackUrl) {
      router.push(callbackUrl)
    } else {
      router.push('/director/dashboard')
    }
  }

  // Get current team roster
  const currentTeamId = createdTeamIds[activeTeamIndex] || teams[activeTeamIndex]?.id
  const currentRoster = rosters[currentTeamId] || []

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
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E31837] blur-[150px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-32 pb-12">
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
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${currentStep === 'program' ? 'bg-[#E31837] text-white' : 'bg-white/10 text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
              Program
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${currentStep === 'teams' ? 'bg-[#E31837] text-white' : 'bg-white/10 text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
              Teams
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${currentStep === 'rosters' ? 'bg-[#E31837] text-white' : 'bg-white/10 text-gray-400'}`}>
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
            <h1 className="text-2xl font-bold text-white mb-2">Create Your Program</h1>
            <p className="text-gray-400 mb-6">
              Welcome, {session.user.name || 'Director'}! Let's set up your program.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Logo (Optional)
                </label>
                {programData.logo ? (
                  <div className="flex items-start gap-4">
                    <div className="relative w-24 h-24 bg-[#1a3a6e] rounded-lg overflow-hidden">
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
                    className={`border-2 border-dashed border-[#1a3a6e] rounded-lg p-6 text-center cursor-pointer hover:border-[#E31837]/50 transition-colors ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-[#E31837] animate-spin mx-auto" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    )}
                    <p className="text-sm text-gray-400">Click to upload logo</p>
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                  <Input
                    type="text"
                    placeholder="Los Angeles"
                    value={programData.city}
                    onChange={(e) => handleProgramChange('city', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
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
            <h1 className="text-2xl font-bold text-white mb-2">Add Your Teams</h1>
            <p className="text-gray-400 mb-6">
              Add the teams in your program. You need at least one team.
            </p>

            <div className="space-y-4">
              {teams.map((team, index) => (
                <div key={team.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Team {index + 1}
                    </h3>
                    {teams.length > 1 && (
                      <button
                        onClick={() => removeTeam(index)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
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
                      className="w-full bg-[#0a1628] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E31837]"
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
                className="w-full py-3 border-2 border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
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
            <h1 className="text-2xl font-bold text-white mb-2">Add Players</h1>
            <p className="text-gray-400 mb-6">
              Add at least one player to each team. You can add more later.
            </p>

            {/* Team Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {teams.map((team, index) => {
                const teamId = createdTeamIds[index]
                const teamRoster = rosters[teamId] || []
                const hasPlayers = teamRoster.length > 0

                return (
                  <button
                    key={team.id}
                    onClick={() => setActiveTeamIndex(index)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      activeTeamIndex === index
                        ? 'bg-[#E31837] text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    {team.name || `Team ${index + 1}`}
                    {hasPlayers ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Roster Image Upload Banner */}
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Camera className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white mb-1">Quick Tip: Upload a photo of your roster!</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Take a picture of your printed roster or screenshot from your team app. We'll automatically extract player information.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rosterImageRef.current?.click()}
                      disabled={isParsing}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
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
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-4">
                {teams[activeTeamIndex]?.name || `Team ${activeTeamIndex + 1}`} - {currentRoster.length} players
              </h3>

              {currentRoster.length > 0 && (
                <div className="space-y-2 mb-4">
                  {currentRoster.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        {player.jerseyNumber && (
                          <span className="text-sm font-mono text-gray-400 w-8">#{player.jerseyNumber}</span>
                        )}
                        <span className="text-white">{player.firstName} {player.lastName}</span>
                      </div>
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
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
              Complete Setup
              <Check className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* Step 4: Complete */}
        {currentStep === 'complete' && (
          <Card className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">You're All Set!</h1>
            <p className="text-gray-400 mb-6">
              Your program, teams, and rosters have been created. You can now register for events!
            </p>

            {/* Summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Program</span>
                  <span className="text-white font-medium">{programData.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Teams</span>
                  <span className="text-white font-medium">{teams.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Players</span>
                  <span className="text-white font-medium">
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
        <div className="min-h-screen bg-[#0A1D37] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
