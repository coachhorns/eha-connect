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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Welcome back, {session?.user.name || session?.user.email}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Card for Parents/Players with no linked players */}
          {profiles.length === 0 && (session?.user.role === 'PARENT' || session?.user.role === 'PLAYER') && (
            <Card className="border-2 border-eha-gold/50 bg-gradient-to-br from-[#0a1628] to-[#1a3a6e]">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-eha-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-eha-gold" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to EHA Connect!
                </h2>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Let's find your athlete in our system and link them to your account.
                </p>
                <Link href="/claim-player">
                  <Button size="lg" className="flex items-center gap-2 mx-auto">
                    <Search className="w-5 h-5" />
                    Find Your Athlete
                  </Button>
                </Link>
                <p className="text-gray-500 text-sm mt-4">
                  Your child's coach or program director should have already added them to a team roster.
                </p>
              </div>
            </Card>
          )}

          {/* Player Profiles - hidden for PARENT/PLAYER with no profiles (they see the Welcome card instead) */}
          {!((session?.user.role === 'PARENT' || session?.user.role === 'PLAYER') && profiles.length === 0) && (
            <Card>
              <div className="p-4 border-b border-[#1a3a6e] flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-white" />
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
                  <p className="text-gray-400 mb-4">No player profiles yet</p>
                  <Link href="/dashboard/players/new">
                    <Button>Create Player Profile</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#1a3a6e]">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar
                          src={profile.profilePhoto}
                          fallback={`${profile.firstName} ${profile.lastName}`}
                          size="lg"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {profile.firstName} {profile.lastName}
                            </h3>
                            {profile.isVerified && (
                              <Badge variant="success" size="sm">Verified</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {profile.school && `${profile.school} • `}
                            {profile.graduationYear && `Class of ${profile.graduationYear}`}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-3.5 h-3.5" />
                              {profile._count.gameStats} games
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5" />
                              {profile._count.achievements} achievements
                            </span>
                          </div>

                          {/* Connected Users */}
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Access:</span>
                            <div className="flex items-center gap-2">
                              {/* Creator/Primary User */}
                              {profile.user && (
                                <div className="relative group cursor-help">
                                  <Avatar
                                    src={profile.user.image}
                                    fallback={profile.user.name || 'U'}
                                    className="w-6 h-6 border border-[#1a3a6e] ring-2 ring-[#0a1628]"
                                  />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    {profile.user.name} (Creator)
                                  </div>
                                </div>
                              )}

                              {/* Guardians & Player Access */}
                              {profile.guardians.map((g) => (
                                <div key={g.user.id} className="relative group cursor-help">
                                  <Avatar
                                    src={g.user.image}
                                    fallback={g.user.name || 'U'}
                                    className={`w-6 h-6 border border-[#1a3a6e] ring-2 ring-[#0a1628] ${g.role === 'PLAYER' ? 'ring-eha-gold/50' : ''}`}
                                  />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    {g.user.name} ({g.role === 'PLAYER' ? 'Player Access' : 'Guardian'})
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInviteModal(profile.id, `${profile.firstName} ${profile.lastName}`, 'PARENT')}
                          title="Add Parent/Guardian"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInviteModal(profile.id, `${profile.firstName} ${profile.lastName}`, 'PLAYER')}
                          title="Give Player Access"
                        >
                          <Smartphone className="w-4 h-4" />
                        </Button>
                        <Link href={`/players/${profile.slug}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/players/${profile.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <div className="p-4 border-b border-[#1a3a6e]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-white" />
                Recent Activity
              </h2>
            </div>
            <div className="p-6 text-center text-gray-400">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Game stats will appear here after events</p>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription - only for non-admin users */}
          {session?.user.role !== 'ADMIN' && (
            <Card>
              <div className="p-4 border-b border-[#1a3a6e]">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-white" />
                  Subscription
                </h2>
              </div>
              <div className="p-4">
                {subscription ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Status</span>
                      <Badge
                        variant={subscription.status === 'active' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {subscription.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Plan</span>
                      <span className="text-sm text-white">
                        {subscription.plan.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Renewal Date</span>
                      <span className="text-sm text-white">
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
                    <p className="text-gray-400 text-sm mb-4">No active subscription</p>
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
          <Card>
            <div className="p-4 border-b border-[#1a3a6e]">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-white" />
                Quick Links
              </h2>
            </div>
            <div className="p-2">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-[#1a3a6e] hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
                Account Settings
              </Link>
              <Link
                href="/leaderboards"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-[#1a3a6e] hover:text-white transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Stat Leaderboards
              </Link>
              <Link
                href="/events"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-[#1a3a6e] hover:text-white transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Upcoming Events
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
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 bg-[#0a1628] border border-[#1a3a6e] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-eha-gold"
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
