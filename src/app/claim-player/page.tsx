'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  User,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Info,
  Mail,
} from 'lucide-react'
import { Card, Button, Input, Badge, Select } from '@/components/ui'
import { formatPosition } from '@/lib/utils'

interface Team {
  id: string
  name: string
  slug: string
  ageGroup: string | null
  program?: {
    name: string
  } | null
}

interface PlayerResult {
  id: string
  firstName: string
  lastName: string
  slug: string
  profilePhoto: string | null
  graduationYear: number | null
  primaryPosition: string | null
  currentTeam: Team | null
  hasPrimaryGuardian: boolean
}

type Step = 'info' | 'team' | 'search' | 'results' | 'success' | 'approval'

export default function ClaimPlayerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [step, setStep] = useState<Step>('info')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)
  const [players, setPlayers] = useState<PlayerResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState('')
  const [claimedPlayer, setClaimedPlayer] = useState<PlayerResult | null>(null)
  const [needsApprovalPlayer, setNeedsApprovalPlayer] = useState<PlayerResult | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/claim-player')
    }
  }, [status, router])

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams?active=true&limit=500')
      const data = await res.json()
      if (res.ok) {
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setIsLoadingTeams(false)
    }
  }

  const handleSearchPlayers = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name')
      return
    }

    if (!selectedTeamId) {
      setError('Please select a team')
      return
    }

    setError('')
    setIsSearching(true)
    setStep('search')

    try {
      const params = new URLSearchParams({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        teamId: selectedTeamId,
      })

      const res = await fetch(`/api/claim-player?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search')
      }

      setPlayers(data.players)
      setStep('results')
    } catch (err: any) {
      setError(err.message || 'Failed to search for players')
      setStep('team')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClaimPlayer = async (player: PlayerResult) => {
    setIsClaiming(true)
    setError('')

    try {
      const res = await fetch('/api/claim-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim player')
      }

      if (data.needsApproval) {
        setNeedsApprovalPlayer(player)
        setStep('approval')
      } else {
        setClaimedPlayer(player)
        setStep('success')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to claim player')
    } finally {
      setIsClaiming(false)
    }
  }

  const resetWizard = () => {
    setStep('info')
    setFirstName('')
    setLastName('')
    setSelectedTeamId('')
    setPlayers([])
    setError('')
    setClaimedPlayer(null)
    setNeedsApprovalPlayer(null)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId)

  // Group teams by program for better organization
  const teamOptions = teams.map((team) => ({
    value: team.id,
    label: team.program
      ? `${team.name} (${team.program.name}${team.ageGroup ? ` - ${team.ageGroup}` : ''})`
      : `${team.name}${team.ageGroup ? ` - ${team.ageGroup}` : ''}`,
  }))

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider">
            Find Your Athlete
          </h1>
          <p className="mt-2 text-gray-400">
            Link your account to your child's official player profile
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Player Info', 'Select Team', 'Confirm'].map((label, index) => {
            const stepMap = ['info', 'team', 'results']
            const currentStepIndex = stepMap.indexOf(step)
            const isActive = index <= currentStepIndex || step === 'success' || step === 'approval' || step === 'search'
            const isCurrent = stepMap[index] === step || (step === 'search' && index === 2)

            return (
              <div key={label} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive
                      ? 'bg-eha-red text-white'
                      : 'bg-white/10 text-gray-500'
                  } ${isCurrent ? 'ring-2 ring-eha-red ring-offset-2 ring-offset-dark-bg' : ''}`}
                >
                  {index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      isActive && index < currentStepIndex ? 'bg-eha-red' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <Card className="p-8">
          {/* Step 1: Player Info */}
          {step === 'info' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-eha-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-eha-red" />
                </div>
                <h2 className="text-xl font-bold text-white">Enter Player Name</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Enter your child's name exactly as it appears on their team roster
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={() => {
                  if (!firstName.trim() || !lastName.trim()) {
                    setError('Please enter both first and last name')
                    return
                  }
                  setError('')
                  setStep('team')
                }}
                disabled={!firstName.trim() || !lastName.trim()}
                className="w-full"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Team Selection */}
          {step === 'team' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-eha-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-eha-red" />
                </div>
                <h2 className="text-xl font-bold text-white">Select Team</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Choose the team that <span className="text-white font-medium">{firstName} {lastName}</span> is currently on
                </p>
              </div>

              {isLoadingTeams ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-eha-red animate-spin" />
                </div>
              ) : (
                <Select
                  label="Team"
                  options={[
                    { value: '', label: 'Select a team...' },
                    ...teamOptions,
                  ]}
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                />
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep('info')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSearchPlayers}
                  className="flex-1"
                  disabled={!selectedTeamId}
                >
                  Find Player
                  <Search className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Searching */}
          {step === 'search' && isSearching && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-eha-red animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white">Searching...</h2>
              <p className="text-gray-400 text-sm mt-1">
                Looking for {firstName} {lastName} on {selectedTeam?.name}
              </p>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-eha-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {players.length > 0 ? (
                    <Users className="w-8 h-8 text-eha-red" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {players.length === 0 ? 'Player Not Found' : `Found ${players.length} Player${players.length > 1 ? 's' : ''}`}
                </h2>
              </div>

              {players.length === 0 ? (
                <div className="space-y-6">
                  {/* Helpful message for no results */}
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-5">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-200 font-medium mb-2">
                          We couldn't find a player matching "{firstName} {lastName}" on {selectedTeam?.name}.
                        </p>
                        <p className="text-yellow-200/80 text-sm">
                          Please contact your <strong>Program Director</strong> or <strong>Coach</strong> to ensure your child has been added to the official roster. Player profiles must be created by team staff before they can be claimed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1a3a6e]/30 rounded-lg p-5">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Need Help?
                    </h3>
                    <ul className="text-gray-400 text-sm space-y-2">
                      <li>• Double-check the spelling of the first and last name</li>
                      <li>• Make sure you selected the correct team</li>
                      <li>• Contact your coach if the player was recently added</li>
                      <li>• Players must be on the official team roster to be claimed</li>
                    </ul>
                  </div>

                  <Button variant="outline" onClick={resetWizard} className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Try Different Search
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm text-center mb-4">
                    Select the player you want to claim
                  </p>
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-4 bg-[#1a3a6e]/30 rounded-lg hover:bg-[#1a3a6e]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10">
                          {player.profilePhoto ? (
                            <Image
                              src={player.profilePhoto}
                              alt={`${player.firstName} ${player.lastName}`}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500">
                              {player.firstName[0]}{player.lastName[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {player.firstName} {player.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            {player.primaryPosition && (
                              <span>{formatPosition(player.primaryPosition)}</span>
                            )}
                            {player.graduationYear && (
                              <span>Class of {player.graduationYear}</span>
                            )}
                            {player.currentTeam && (
                              <span>• {player.currentTeam.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.hasPrimaryGuardian && (
                          <Badge variant="warning" size="sm">Has Guardian</Badge>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleClaimPlayer(player)}
                          disabled={isClaiming}
                        >
                          {isClaiming ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Claim'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {players.length > 0 && (
                <Button variant="ghost" onClick={resetWizard} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Search Again
                </Button>
              )}
            </div>
          )}

          {/* Success State */}
          {step === 'success' && claimedPlayer && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
              <p className="text-gray-400 mb-6">
                You are now the primary guardian of{' '}
                <span className="text-white font-medium">
                  {claimedPlayer.firstName} {claimedPlayer.lastName}
                </span>
              </p>
              <div className="flex gap-3 justify-center">
                <Link href={`/players/${claimedPlayer.slug}`}>
                  <Button variant="outline">View Profile</Button>
                </Link>
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}

          {/* Needs Approval State */}
          {step === 'approval' && needsApprovalPlayer && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Approval Needed</h2>
              <p className="text-gray-400 mb-6">
                <span className="text-white font-medium">
                  {needsApprovalPlayer.firstName} {needsApprovalPlayer.lastName}
                </span>{' '}
                already has a primary guardian. The primary guardian will need to invite you as a co-parent from their account settings.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={resetWizard}>
                  Search Another Player
                </Button>
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* Help Text */}
        <div className="text-center text-gray-500 text-sm mt-6 space-y-2">
          <p>
            Player profiles are created by Program Directors and Coaches.
          </p>
          <p>
            If you can't find your athlete, please contact your team's staff.
          </p>
        </div>
      </div>
    </div>
  )
}
