'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  User,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Info,
  Mail,
  Shield,
  GraduationCap,
  UserPlus,
  Smartphone,
  Share2,
  Check,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { formatPosition } from '@/lib/utils'

interface PlayerResult {
  id: string
  firstName: string
  lastName: string
  slug: string
  profilePhoto: string | null
  graduationYear: number | null
  primaryPosition: string | null
  currentTeam: {
    id: string
    name: string
    slug: string
    division: string | null
    program: {
      id: string
      name: string
    } | null
  } | null
  hasPrimaryGuardian: boolean
}

type Step = 'info' | 'search' | 'results' | 'invite-parent' | 'invite-player' | 'success' | 'approval'

const PROGRESS_LABELS = ['Find', 'Claim', 'Invite', 'Done']

function getStepIndex(step: Step): number {
  switch (step) {
    case 'info':
    case 'search':
      return 0
    case 'results':
      return 1
    case 'invite-parent':
    case 'invite-player':
      return 2
    case 'success':
      return 3
    case 'approval':
      return 3
    default:
      return 0
  }
}

function ClaimPlayerContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for direct claim from player profile
  const directPlayerId = searchParams.get('playerId')
  const directPlayerName = searchParams.get('name')

  const [step, setStep] = useState<Step>('info')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [players, setPlayers] = useState<PlayerResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState('')
  const [claimedPlayer, setClaimedPlayer] = useState<PlayerResult | null>(null)
  const [needsApprovalPlayer, setNeedsApprovalPlayer] = useState<PlayerResult | null>(null)
  const [directPlayer, setDirectPlayer] = useState<PlayerResult | null>(null)
  const [isLoadingDirect, setIsLoadingDirect] = useState(false)

  // Step 3 - Co-Parent invite
  const [coParentEmail, setCoParentEmail] = useState('')
  const [coParentStatus, setCoParentStatus] = useState<{ success?: string; error?: string } | null>(null)
  const [isSendingCoParent, setIsSendingCoParent] = useState(false)
  const [showCoParentEmail, setShowCoParentEmail] = useState(false)

  // Step 4 - Player invite
  const [playerEmail, setPlayerEmail] = useState('')
  const [playerInviteStatus, setPlayerInviteStatus] = useState<{ success?: string; error?: string } | null>(null)
  const [isSendingPlayerInvite, setIsSendingPlayerInvite] = useState(false)
  const [showPlayerEmail, setShowPlayerEmail] = useState(false)

  // Detect mobile (touch device with small screen = real mobile share sheet)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(hasTouchScreen && isSmallScreen)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      const callbackUrl = directPlayerId
        ? `/claim-player?playerId=${directPlayerId}&name=${encodeURIComponent(directPlayerName || '')}`
        : '/claim-player'
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    }
  }, [status, router, directPlayerId, directPlayerName])

  // Fetch player directly if playerId is provided
  useEffect(() => {
    if (directPlayerId && status === 'authenticated' && !directPlayer && !isLoadingDirect) {
      setIsLoadingDirect(true)
      fetch(`/api/claim-player?playerId=${directPlayerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.player) {
            setDirectPlayer(data.player)
          } else if (data.players?.length > 0) {
            setDirectPlayer(data.players[0])
          } else {
            setError('Player not found')
          }
        })
        .catch(() => setError('Failed to load player'))
        .finally(() => setIsLoadingDirect(false))
    }
  }, [directPlayerId, status, directPlayer, isLoadingDirect])

  const handleSearchPlayers = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name')
      return
    }

    setError('')
    setIsSearching(true)
    setStep('search')

    try {
      const params = new URLSearchParams({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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
      setStep('info')
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
        setStep('invite-parent')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to claim player')
    } finally {
      setIsClaiming(false)
    }
  }

  const handleSendInvite = async (type: 'PARENT' | 'PLAYER', email: string) => {
    if (!claimedPlayer || !email.trim()) return

    const isParent = type === 'PARENT'
    if (isParent) {
      setIsSendingCoParent(true)
      setCoParentStatus(null)
    } else {
      setIsSendingPlayerInvite(true)
      setPlayerInviteStatus(null)
    }

    try {
      const res = await fetch('/api/guardians/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: claimedPlayer.id,
          email: email.trim(),
          type,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      if (isParent) {
        setCoParentStatus({ success: data.message || `Invite sent to ${email}` })
      } else {
        setPlayerInviteStatus({ success: data.message || `Invite sent to ${email}` })
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send invite'
      if (isParent) {
        setCoParentStatus({ error: errorMsg })
      } else {
        setPlayerInviteStatus({ error: errorMsg })
      }
    } finally {
      if (isParent) {
        setIsSendingCoParent(false)
      } else {
        setIsSendingPlayerInvite(false)
      }
    }
  }

  const handleShareInvite = async (type: 'PARENT' | 'PLAYER') => {
    if (!claimedPlayer) return

    const isParent = type === 'PARENT'
    if (isParent) {
      setIsSendingCoParent(true)
      setCoParentStatus(null)
    } else {
      setIsSendingPlayerInvite(true)
      setPlayerInviteStatus(null)
    }

    try {
      const res = await fetch('/api/guardians/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: claimedPlayer.id,
          type,
          shareOnly: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invite link')
      }

      const inviteUrl = data.inviteUrl
      const playerName = `${claimedPlayer.firstName} ${claimedPlayer.lastName}`
      const shareText = isParent
        ? `You've been invited to manage ${playerName}'s profile on EHA Connect. Accept your invite here:`
        : `You've been invited to claim your athlete profile for ${playerName} on EHA Connect. Accept your invite here:`

      // Only called on mobile where navigator.share is available
      await navigator.share({
        title: 'EHA Connect Invite',
        text: shareText,
        url: inviteUrl,
      })

      const successMsg = 'Invite link shared!'
      if (isParent) {
        setCoParentStatus({ success: successMsg })
      } else {
        setPlayerInviteStatus({ success: successMsg })
      }
    } catch (err: any) {
      // User cancelled native share — not an error, just reset loading
      if (err?.name === 'AbortError') {
        // Don't set any status — user just dismissed the share sheet
      } else {
        const errorMsg = err.message || 'Failed to share invite'
        if (isParent) {
          setCoParentStatus({ error: errorMsg })
        } else {
          setPlayerInviteStatus({ error: errorMsg })
        }
      }
    } finally {
      if (isParent) {
        setIsSendingCoParent(false)
      } else {
        setIsSendingPlayerInvite(false)
      }
    }
  }

  const resetWizard = () => {
    setStep('info')
    setFirstName('')
    setLastName('')
    setPlayers([])
    setError('')
    setClaimedPlayer(null)
    setNeedsApprovalPlayer(null)
    setCoParentEmail('')
    setCoParentStatus(null)
    setShowCoParentEmail(false)
    setPlayerEmail('')
    setPlayerInviteStatus(null)
    setShowPlayerEmail(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  const currentStepIndex = getStepIndex(step)

  return (
    <div className="min-h-screen bg-page-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-12 border-b border-border-subtle">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="max-w-2xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-overlay rounded-full border border-border-default backdrop-blur-sm mb-6">
            <UserPlus className="w-4 h-4 text-eha-red" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-primary">
              Claim Profile
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-heading font-bold tracking-tighter text-text-primary mb-4">
            Find Your Athlete
          </h1>
          <p className="text-lg text-text-muted font-light">
            Link your account to your child&apos;s official player profile
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-2xl mx-auto px-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-1 sm:gap-3 mb-10">
            {PROGRESS_LABELS.map((label, index) => {
              const isActive = index <= currentStepIndex
              const isCurrent = index === currentStepIndex && step !== 'approval'

              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-sm flex items-center justify-center text-sm font-black transition-all ${
                        isActive
                          ? 'bg-eha-red text-white shadow-lg shadow-eha-red/20'
                          : 'bg-surface-raised text-text-muted border border-border-default'
                      } ${isCurrent ? 'ring-2 ring-eha-red ring-offset-2 ring-offset-[#0A1D37]' : ''}`}
                    >
                      {index === 3 && step === 'success' ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-2 ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                      {label}
                    </span>
                  </div>
                  {index < PROGRESS_LABELS.length - 1 && (
                    <div
                      className={`w-8 sm:w-16 h-0.5 mx-2 sm:mx-4 mb-6 ${
                        index < currentStepIndex ? 'bg-eha-red' : 'bg-surface-overlay'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step Content Card */}
          <div className="bg-page-bg-alt border border-border-default rounded-sm p-8 shadow-xl">
            {/* Direct Claim Flow (when coming from player profile) */}
            {directPlayerId && step !== 'success' && step !== 'approval' && step !== 'invite-parent' && step !== 'invite-player' && (
              <div className="space-y-6">
                {isLoadingDirect ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-12 h-12 text-eha-red animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-text-primary font-heading">Loading Player...</h2>
                  </div>
                ) : directPlayer ? (
                  <>
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-eha-red/20 rounded-sm flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-eha-red" />
                      </div>
                      <h2 className="text-2xl font-bold text-text-primary font-heading uppercase tracking-tight">
                        Confirm Your Athlete
                      </h2>
                      <p className="text-text-muted text-sm mt-2">
                        You&apos;re about to claim this player profile
                      </p>
                    </div>

                    <div className="p-5 bg-surface-raised/50 border border-border-default rounded-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-sm overflow-hidden bg-page-bg-alt border border-border-default flex-shrink-0">
                          {directPlayer.profilePhoto ? (
                            <Image
                              src={directPlayer.profilePhoto}
                              alt={`${directPlayer.firstName} ${directPlayer.lastName}`}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-text-muted">
                              {directPlayer.firstName[0]}{directPlayer.lastName[0]}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-lg font-bold text-text-primary font-heading">
                              {directPlayer.firstName} {directPlayer.lastName}
                            </p>
                            {directPlayer.hasPrimaryGuardian && (
                              <Badge variant="warning" size="sm">
                                <Shield className="w-3 h-3 mr-1" />
                                Has Guardian
                              </Badge>
                            )}
                          </div>

                          {directPlayer.currentTeam && (
                            <p className="text-sm text-text-secondary mt-1 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 flex-shrink-0 text-eha-red" />
                              <span className="font-medium">{directPlayer.currentTeam.name}</span>
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-text-muted mt-2 flex-wrap">
                            {directPlayer.currentTeam?.division && (
                              <span className="bg-surface-glass px-2 py-1 rounded-sm font-bold uppercase tracking-wider">
                                {directPlayer.currentTeam.division}
                              </span>
                            )}
                            {directPlayer.primaryPosition && (
                              <span className="bg-surface-glass px-2 py-1 rounded-sm font-bold uppercase tracking-wider">
                                {formatPosition(directPlayer.primaryPosition)}
                              </span>
                            )}
                            {directPlayer.graduationYear && (
                              <span className="flex items-center gap-1 bg-surface-glass px-2 py-1 rounded-sm font-bold uppercase tracking-wider">
                                <GraduationCap className="w-3 h-3" />
                                {directPlayer.graduationYear}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-4">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}

                    <Button
                      onClick={() => handleClaimPlayer(directPlayer)}
                      disabled={isClaiming}
                      className="w-full py-4"
                    >
                      {isClaiming ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Claim This Profile
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => router.push('/claim-player')}
                      className="w-full"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Search for a Different Player
                    </Button>
                  </>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-text-primary mb-2 font-heading">Player Not Found</h2>
                    <p className="text-text-muted mb-6">{error}</p>
                    <Button onClick={() => router.push('/claim-player')}>
                      Search for Player
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Step 1: Player Info (only show if not direct claim) */}
            {!directPlayerId && step === 'info' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-eha-red/20 rounded-sm flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-eha-red" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary font-heading uppercase tracking-tight">
                    Enter Player Name
                  </h2>
                  <p className="text-text-muted text-sm mt-2">
                    Enter your child&apos;s name exactly as it appears on their team roster
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full bg-surface-raised border border-border-default rounded-sm px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-eha-red/50 focus:border-eha-red/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Smith"
                      className="w-full bg-surface-raised border border-border-default rounded-sm px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-eha-red/50 focus:border-eha-red/50 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleSearchPlayers}
                  disabled={!firstName.trim() || !lastName.trim()}
                  className="w-full py-4"
                >
                  Find Player
                  <Search className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Searching */}
            {step === 'search' && isSearching && (
              <div className="py-12 text-center">
                <Loader2 className="w-12 h-12 text-eha-red animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-text-primary font-heading">Searching...</h2>
                <p className="text-text-muted text-sm mt-1">
                  Looking for {firstName} {lastName}
                </p>
              </div>
            )}

            {/* Results */}
            {step === 'results' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className={`w-16 h-16 rounded-sm flex items-center justify-center mx-auto mb-4 ${players.length > 0 ? 'bg-eha-red/20' : 'bg-yellow-500/20'}`}>
                    {players.length > 0 ? (
                      <Users className="w-8 h-8 text-eha-red" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-yellow-500" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary font-heading uppercase tracking-tight">
                    {players.length === 0 ? 'Player Not Found' : `Found ${players.length} Player${players.length > 1 ? 's' : ''}`}
                  </h2>
                </div>

                {players.length === 0 ? (
                  <div className="space-y-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-sm p-5">
                      <div className="flex gap-3">
                        <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-yellow-200 font-medium mb-2">
                            We couldn&apos;t find a player matching &quot;{firstName} {lastName}&quot;.
                          </p>
                          <p className="text-yellow-200/80 text-sm">
                            Please contact your <strong>Program Director</strong> or <strong>Coach</strong> to ensure your child has been added to the official roster.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-raised/50 border border-border-default rounded-sm p-5">
                      <h3 className="text-text-primary font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Mail className="w-4 h-4 text-eha-red" />
                        Need Help?
                      </h3>
                      <ul className="text-text-muted text-sm space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-eha-red">•</span>
                          Double-check the spelling of the first and last name
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-eha-red">•</span>
                          Contact your coach if the player was recently added
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-eha-red">•</span>
                          Players must be on the official team roster to be claimed
                        </li>
                      </ul>
                    </div>

                    <Button variant="outline" onClick={resetWizard} className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Try Different Search
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center mb-4">
                      Select the correct player to claim
                    </p>
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="p-4 bg-surface-raised/50 border border-border-default rounded-sm hover:border-eha-red/50 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-sm overflow-hidden bg-page-bg-alt border border-border-default flex-shrink-0">
                            {player.profilePhoto ? (
                              <Image
                                src={player.profilePhoto}
                                alt={`${player.firstName} ${player.lastName}`}
                                width={56}
                                height={56}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-text-muted">
                                {player.firstName[0]}{player.lastName[0]}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-text-primary font-heading">
                                {player.firstName} {player.lastName}
                              </p>
                              {player.hasPrimaryGuardian && (
                                <Badge variant="warning" size="sm">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Has Guardian
                                </Badge>
                              )}
                            </div>

                            {player.currentTeam && (
                              <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 flex-shrink-0 text-eha-red" />
                                <span className="font-medium">{player.currentTeam.name}</span>
                                {player.currentTeam.program && (
                                  <span className="text-text-muted">
                                    — {player.currentTeam.program.name}
                                  </span>
                                )}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-[10px] text-text-muted mt-1 flex-wrap">
                              {player.currentTeam?.division && (
                                <span className="bg-surface-glass px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                                  {player.currentTeam.division}
                                </span>
                              )}
                              {player.primaryPosition && (
                                <span className="font-bold uppercase tracking-wider">{formatPosition(player.primaryPosition)}</span>
                              )}
                              {player.graduationYear && (
                                <span className="flex items-center gap-1 font-bold uppercase tracking-wider">
                                  <GraduationCap className="w-3 h-3" />
                                  {player.graduationYear}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleClaimPlayer(player)}
                            disabled={isClaiming}
                            className="flex-shrink-0"
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
                  <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-4">
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

            {/* Step 3: Invite Co-Parent */}
            {step === 'invite-parent' && claimedPlayer && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-sm flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary font-heading uppercase tracking-tight">
                    Invite a Co-Parent
                  </h2>
                  <p className="text-text-muted text-sm mt-2">
                    Share access to {claimedPlayer.firstName}&apos;s profile with another parent or guardian
                  </p>
                </div>

                {/* Action Buttons */}
                {!showCoParentEmail && !coParentStatus?.success && (
                  <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button
                      onClick={() => setShowCoParentEmail(true)}
                      className="flex flex-col items-center gap-3 p-6 bg-surface-raised/50 border border-border-default rounded-sm hover:border-blue-500/50 hover:bg-surface-glass transition-all"
                    >
                      <Mail className="w-8 h-8 text-blue-400" />
                      <span className="text-sm font-bold text-text-primary uppercase tracking-wider">Send Email</span>
                      <span className="text-[10px] text-text-muted">Send a branded invite email</span>
                    </button>
                    {isMobile && (
                      <button
                        onClick={() => handleShareInvite('PARENT')}
                        disabled={isSendingCoParent}
                        className="flex flex-col items-center gap-3 p-6 bg-surface-raised/50 border border-border-default rounded-sm hover:border-blue-500/50 hover:bg-surface-glass transition-all disabled:opacity-50"
                      >
                        {isSendingCoParent ? (
                          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        ) : (
                          <Share2 className="w-8 h-8 text-blue-400" />
                        )}
                        <span className="text-sm font-bold text-text-primary uppercase tracking-wider">Share Link</span>
                        <span className="text-[10px] text-text-muted">Text, iMessage, WhatsApp, etc.</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Email Input (shown when "Send Email" clicked) */}
                {showCoParentEmail && !coParentStatus?.success && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                        Co-Parent&apos;s Email Address
                      </label>
                      <input
                        type="email"
                        value={coParentEmail}
                        onChange={(e) => setCoParentEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="w-full bg-surface-raised border border-border-default rounded-sm px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && coParentEmail.trim()) {
                            handleSendInvite('PARENT', coParentEmail)
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowCoParentEmail(false)
                          setCoParentEmail('')
                          setCoParentStatus(null)
                        }}
                        className="flex-shrink-0"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                      <Button
                        onClick={() => handleSendInvite('PARENT', coParentEmail)}
                        disabled={isSendingCoParent || !coParentEmail.trim()}
                        className="flex-1"
                      >
                        {isSendingCoParent ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Invite
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {coParentStatus?.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-4">
                    <p className="text-red-400 text-sm">{coParentStatus.error}</p>
                  </div>
                )}
                {coParentStatus?.success && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="text-green-400 text-sm font-medium">{coParentStatus.success}</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                  <button
                    onClick={() => setStep('invite-player')}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors font-bold uppercase tracking-widest"
                  >
                    Skip
                  </button>
                  {coParentStatus?.success && (
                    <Button onClick={() => setStep('invite-player')}>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Invite Athlete */}
            {step === 'invite-player' && claimedPlayer && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-sm flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary font-heading uppercase tracking-tight">
                    Give Your Athlete Access
                  </h2>
                  <p className="text-text-muted text-sm mt-2">
                    Let {claimedPlayer.firstName} manage their own bio, socials, and highlights
                  </p>
                </div>

                {/* Action Buttons */}
                {!showPlayerEmail && !playerInviteStatus?.success && (
                  <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button
                      onClick={() => setShowPlayerEmail(true)}
                      className="flex flex-col items-center gap-3 p-6 bg-surface-raised/50 border border-border-default rounded-sm hover:border-amber-500/50 hover:bg-surface-glass transition-all"
                    >
                      <Mail className="w-8 h-8 text-amber-400" />
                      <span className="text-sm font-bold text-text-primary uppercase tracking-wider">Send Email</span>
                      <span className="text-[10px] text-text-muted">Send a branded invite email</span>
                    </button>
                    {isMobile && (
                      <button
                        onClick={() => handleShareInvite('PLAYER')}
                        disabled={isSendingPlayerInvite}
                        className="flex flex-col items-center gap-3 p-6 bg-surface-raised/50 border border-border-default rounded-sm hover:border-amber-500/50 hover:bg-surface-glass transition-all disabled:opacity-50"
                      >
                        {isSendingPlayerInvite ? (
                          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        ) : (
                          <Share2 className="w-8 h-8 text-amber-400" />
                        )}
                        <span className="text-sm font-bold text-text-primary uppercase tracking-wider">Share Link</span>
                        <span className="text-[10px] text-text-muted">Text, iMessage, WhatsApp, etc.</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Email Input */}
                {showPlayerEmail && !playerInviteStatus?.success && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                        Athlete&apos;s Email Address
                      </label>
                      <input
                        type="email"
                        value={playerEmail}
                        onChange={(e) => setPlayerEmail(e.target.value)}
                        placeholder="athlete@example.com"
                        className="w-full bg-surface-raised border border-border-default rounded-sm px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && playerEmail.trim()) {
                            handleSendInvite('PLAYER', playerEmail)
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowPlayerEmail(false)
                          setPlayerEmail('')
                          setPlayerInviteStatus(null)
                        }}
                        className="flex-shrink-0"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                      <Button
                        onClick={() => handleSendInvite('PLAYER', playerEmail)}
                        disabled={isSendingPlayerInvite || !playerEmail.trim()}
                        className="flex-1"
                      >
                        {isSendingPlayerInvite ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Invite
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {playerInviteStatus?.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-4">
                    <p className="text-red-400 text-sm">{playerInviteStatus.error}</p>
                  </div>
                )}
                {playerInviteStatus?.success && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="text-green-400 text-sm font-medium">{playerInviteStatus.success}</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                  <button
                    onClick={() => setStep('success')}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors font-bold uppercase tracking-widest"
                  >
                    Skip
                  </button>
                  {playerInviteStatus?.success && (
                    <Button onClick={() => setStep('success')}>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Success */}
            {step === 'success' && claimedPlayer && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-sm flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2 font-heading uppercase tracking-tight">You&apos;re All Set!</h2>
                <p className="text-text-muted mb-8">
                  You are now the primary guardian of{' '}
                  <span className="text-text-primary font-medium">
                    {claimedPlayer.firstName} {claimedPlayer.lastName}
                  </span>
                </p>

                {/* Summary of what was done */}
                {(coParentStatus?.success || playerInviteStatus?.success) && (
                  <div className="mb-8 space-y-2">
                    {coParentStatus?.success && (
                      <div className="flex items-center gap-2 justify-center text-sm text-text-muted">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>Co-parent invite sent</span>
                      </div>
                    )}
                    {playerInviteStatus?.success && (
                      <div className="flex items-center gap-2 justify-center text-sm text-text-muted">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>Athlete invite sent</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <Link href={`/dashboard/players/${claimedPlayer.id}/edit`}>
                    <Button>Edit Profile</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline">Go to Dashboard</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Needs Approval State */}
            {step === 'approval' && needsApprovalPlayer && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-yellow-500/20 rounded-sm flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2 font-heading uppercase tracking-tight">Approval Needed</h2>
                <p className="text-text-muted mb-8">
                  <span className="text-text-primary font-medium">
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
          </div>

          {/* Help Text */}
          <div className="text-center mt-8 space-y-2">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Player profiles are created by Program Directors and Coaches.
            </p>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              If you can&apos;t find your athlete, please contact your team&apos;s staff.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function ClaimPlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E31837]" />
      </div>
    }>
      <ClaimPlayerContent />
    </Suspense>
  )
}
