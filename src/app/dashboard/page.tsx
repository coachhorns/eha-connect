'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Trophy,
  BarChart3,
  Settings,
  Plus,
  ExternalLink,
  Calendar,
  CreditCard,
  Search,
  UserPlus,
  Smartphone,
  ArrowRight,
} from 'lucide-react'
import { Card, Button, Badge, Avatar, Modal } from '@/components/ui'
import { formatDate } from '@/lib/utils'

interface PlayerProfile {
  id: string
  slug: string
  userId: string | null
  firstName: string
  lastName: string
  profilePhoto?: string | null
  primaryPosition?: string | null
  school?: string | null
  graduationYear?: number | null
  isVerified: boolean
  _count: {
    gameStats: number
    achievements: number
  }
  user?: {
    id: string
    name: string | null
    email: string | null
    image: string | null
    role: string
  }
  guardians: Array<{
    role: string
    user: {
      id: string
      name: string | null
      email: string | null
      image: string | null
      role: string
    }
  }>
}

interface Subscription {
  id: string
  status: string
  plan: string
  currentPeriodEnd: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profiles, setProfiles] = useState<PlayerProfile[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [inviteModal, setInviteModal] = useState<{ playerId: string; playerName: string; type: 'PARENT' | 'PLAYER' } | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<{ success?: string; error?: string } | null>(null)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard')
    }
    if (session?.user?.role === 'ADMIN') {
      router.push('/admin')
    }
    if (session?.user?.role === 'PROGRAM_DIRECTOR') {
      router.push('/director/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user.id) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [profilesRes, subscriptionRes] = await Promise.all([
        fetch('/api/user/players'),
        fetch('/api/user/subscription'),
      ])
      const profilesData = await profilesRes.json()
      setProfiles(profilesData.players || [])

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json()
        setSubscription(subscriptionData.subscription || null)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const openInviteModal = (playerId: string, playerName: string, type: 'PARENT' | 'PLAYER') => {
    setInviteEmail('')
    setInviteStatus(null)
    setInviteModal({ playerId, playerName, type })
  }

  const sendInvite = async () => {
    if (!inviteModal || !inviteEmail.trim()) return
    setIsSending(true)
    setInviteStatus(null)
    try {
      const res = await fetch('/api/guardians/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          playerId: inviteModal.playerId,
          type: inviteModal.type,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteStatus({ error: data.error || 'Failed to send invite' })
      } else {
        setInviteStatus({ success: data.message || 'Invite sent!' })
        setInviteEmail('')
      }
    } catch {
      setInviteStatus({ error: 'Something went wrong. Please try again.' })
    } finally {
      setIsSending(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1D37] text-white w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 space-y-8 pt-32 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl lg:text-6xl tracking-tighter font-bold text-white uppercase">Dashboard</h1>
        <p className="mt-3 text-sm text-gray-500 font-bold uppercase tracking-widest">
          Welcome back, {session?.user.name || session?.user.email}
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Welcome Card for Parents/Players with no linked players */}
          {profiles.length === 0 && (session?.user.role === 'PARENT' || session?.user.role === 'PLAYER') && (
            <Card className="rounded-sm p-0 border border-white/5 bg-gradient-to-br from-[#0A1D37] to-[#152e50]">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-eha-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-eha-gold" />
                </div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">
                  Welcome to EHA Connect!
                </h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">
                  Let's find your athlete in our system and link them to your account.
                </p>
                <Link href="/claim-player">
                  <Button size="lg" className="flex items-center gap-2 mx-auto">
                    <Search className="w-5 h-5" />
                    Find Your Athlete
                  </Button>
                </Link>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-4">
                  Your child's coach or program director should have already added them to a team roster.
                </p>
              </div>
            </Card>
          )}

          {/* Player Profiles - hidden for PARENT/PLAYER with no profiles (they see the Welcome card instead) */}
          {!((session?.user.role === 'PARENT' || session?.user.role === 'PLAYER') && profiles.length === 0) && (
            <Card className="rounded-sm p-0">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red flex items-center gap-2">
                  <User className="w-4 h-4 text-eha-red" />
                  Player Profiles
                </h2>
                {session?.user.role === 'PARENT' || session?.user.role === 'PLAYER' ? (
                  <Link href="/claim-player">
                    <Button size="sm" className="flex items-center gap-1">
                      <Search className="w-4 h-4" />
                      Claim Player
                    </Button>
                  </Link>
                ) : profiles.length === 0 ? (
                  <Link href="/dashboard/players/new">
                    <Button size="sm" className="flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Add Player
                    </Button>
                  </Link>
                ) : null}
              </div>

              {profiles.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-4">No player profiles yet</p>
                  <Link href="/dashboard/players/new">
                    <Button>Create Player Profile</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {profiles.map((profile) => {
                    const isOwner = (profile.userId && profile.userId === session?.user?.id) ||
                      profile.user?.id === session?.user?.id ||
                      profile.guardians.some(g => g.user.id === session?.user?.id)
                    return (
                    <div key={profile.id} className="relative group p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                      {/* Clickable Card Link (Stretched Link) */}
                      <Link href={`/players/${profile.slug}`} className="absolute inset-0 z-0">
                        <span className="sr-only">View Profile</span>
                      </Link>

                      <div className="flex items-center gap-4 relative z-10 pointer-events-none">
                        <Avatar
                          src={profile.profilePhoto}
                          fallback={`${profile.firstName} ${profile.lastName}`}
                          size="lg"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white uppercase tracking-wide">
                              {profile.firstName} {profile.lastName}
                            </h3>
                            {profile.isVerified && (
                              <Badge variant="success" size="sm">Verified</Badge>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {profile.school && `${profile.school} • `}
                            {profile.graduationYear && `Class of ${profile.graduationYear}`}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="bg-[#152e50]/50 border border-white/5 rounded-sm px-3 py-1.5 flex items-center gap-1.5">
                              <BarChart3 className="w-3 h-3 text-gray-400" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{profile._count.gameStats} Games</span>
                            </div>
                            <div className="bg-[#152e50]/50 border border-white/5 rounded-sm px-3 py-1.5 flex items-center gap-1.5">
                              <Trophy className="w-3 h-3 text-gray-400" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{profile._count.achievements} Awards</span>
                            </div>
                          </div>

                          {/* Connected Users */}
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Access:</span>
                            <div className="flex items-center gap-2">
                              {/* Creator/Primary User */}
                              {profile.user && (
                                <div className="relative group/access cursor-help pointer-events-auto">
                                  <Avatar
                                    src={profile.user.image}
                                    fallback={profile.user.name || 'U'}
                                    className="w-6 h-6 border border-white/10 ring-2 ring-[#0a1628]"
                                  />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded whitespace-nowrap opacity-0 group-hover/access:opacity-100 transition-opacity pointer-events-none z-10">
                                    {profile.user.name} (Creator)
                                  </div>
                                </div>
                              )}

                              {/* Guardians & Player Access */}
                              {profile.guardians.map((g) => (
                                <div key={g.user.id} className="relative group/access cursor-help pointer-events-auto">
                                  <Avatar
                                    src={g.user.image}
                                    fallback={g.user.name || 'U'}
                                    className={`w-6 h-6 border border-white/10 ring-2 ring-[#0a1628] ${g.role === 'PLAYER' ? 'ring-eha-gold/50' : ''}`}
                                  />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded whitespace-nowrap opacity-0 group-hover/access:opacity-100 transition-opacity pointer-events-none z-10">
                                    {g.user.name} ({g.role === 'PLAYER' ? 'Player Access' : 'Guardian'})
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openInviteModal(profile.id, `${profile.firstName} ${profile.lastName}`, 'PARENT')
                          }}
                          className="flex items-center gap-2 hover:bg-white/10"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span className="hidden sm:inline">Add Parent</span>
                        </Button>

                        {/* Only show "Invite Player" if the user is NOT a player */}
                        {session?.user.role !== 'PLAYER' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openInviteModal(profile.id, `${profile.firstName} ${profile.lastName}`, 'PLAYER')
                            }}
                            className="flex items-center gap-2 hover:bg-white/10"
                          >
                            <Smartphone className="w-4 h-4" />
                            <span className="hidden sm:inline">Player Access</span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            router.push(`/players/${profile.slug}`)
                          }}
                          className="bg-white/5 hover:bg-white/10 border-white/10 text-white flex items-center gap-2"
                        >
                          <span>View Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>

                        {isOwner && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              router.push(`/dashboard/players/${profile.id}/edit`)
                            }}
                            className="flex items-center gap-2"
                          >
                            <span>Edit</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Recent Activity */}
          <Card className="rounded-sm p-0">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-2xl text-white uppercase tracking-tight font-bold">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="p-8 border border-dashed border-white/10 rounded-sm text-center">
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">No recent activity</p>
                <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">Game stats will appear here after events</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Subscription - only for non-admin users */}
          {session?.user.role !== 'ADMIN' && (
            <Card className="rounded-sm p-0">
              <div className="p-6 border-b border-white/5">
                <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Subscription
                </h4>
              </div>
              <div className="p-6">
                {subscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
                      <Badge
                        variant={subscription.status === 'active' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {subscription.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</span>
                      <span className="text-sm font-bold text-white">
                        {subscription.plan.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Renewal</span>
                      <span className="text-sm font-bold text-white">
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>
                    <Link href="/dashboard/subscription" className="block mt-4">
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Subscription
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-4">No active subscription</p>
                    <Link href="/pricing">
                      <Button size="sm" className="w-full">
                        Get EHA Connect
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Links */}
          <Card className="rounded-sm p-0">
            <div className="p-6 border-b border-white/5">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red">Quick Links</h4>
            </div>
            <div>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 p-4 text-gray-400 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Account Settings</span>
              </Link>
              <Link
                href="/leaderboards"
                className="flex items-center gap-3 p-4 text-gray-400 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Stat Leaderboards</span>
              </Link>
              <Link
                href="/events"
                className="flex items-center gap-3 p-4 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Upcoming Events</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={!!inviteModal}
        onClose={() => setInviteModal(null)}
        title={inviteModal?.type === 'PARENT' ? 'Invite Co-Parent' : 'Give Player Access'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            {inviteModal?.type === 'PARENT'
              ? `Send an invitation to another parent/guardian to view and manage ${inviteModal.playerName}'s profile.`
              : `Send an invitation to ${inviteModal?.playerName} so they can create an account and edit their own profile (Bio, Socials, Media).`}
          </p>
          <div>
            <label htmlFor="invite-email" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 bg-[#0a1628] border border-white/10 rounded-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-eha-gold"
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendInvite()
              }}
            />
          </div>
          {inviteStatus?.error && (
            <p className="text-sm text-red-400">{inviteStatus.error}</p>
          )}
          {inviteStatus?.success && (
            <p className="text-sm text-green-400">{inviteStatus.success}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setInviteModal(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={sendInvite}
              disabled={isSending || !inviteEmail.trim()}
              className="flex items-center gap-1"
            >
              {isSending ? 'Sending...' : 'Send Invite'}
              {!isSending && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
