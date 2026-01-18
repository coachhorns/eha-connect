'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Trophy,
  BarChart3,
  CreditCard,
  Settings,
  Plus,
  ExternalLink,
  Calendar,
} from 'lucide-react'
import { Card, Button, Badge, Avatar } from '@/components/ui'
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
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profiles, setProfiles] = useState<PlayerProfile[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user.id) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [profilesRes, subRes] = await Promise.all([
        fetch('/api/user/players'),
        fetch('/api/user/subscription'),
      ])

      const profilesData = await profilesRes.json()
      const subData = await subRes.json()

      setProfiles(profilesData.players || [])
      setSubscription(subData.subscription)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
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
          {/* Player Profiles */}
          <Card>
            <div className="p-4 border-b border-[#252540] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-white" />
                Player Profiles
              </h2>
              <Link href="/dashboard/players/new">
                <Button size="sm" className="flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Add Player
                </Button>
              </Link>
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
              <div className="divide-y divide-[#252540]">
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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

          {/* Recent Activity */}
          <Card>
            <div className="p-4 border-b border-[#252540]">
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
          {/* Subscription Status */}
          <Card>
            <div className="p-4 border-b border-[#252540]">
              <h2 className="font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-white" />
                Subscription
              </h2>
            </div>
            <div className="p-4">
              {subscription ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Status</span>
                    <Badge
                      variant={subscription.status === 'ACTIVE' ? 'success' : 'warning'}
                    >
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-white font-medium">
                      {subscription.plan.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Renews</span>
                    <span className="text-white">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                  <Link href="/dashboard/subscription">
                    <Button variant="outline" className="w-full">
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 mb-4">No active subscription</p>
                  <Link href="/pricing">
                    <Button className="w-full">Get EHA Connect</Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Links */}
          <Card>
            <div className="p-4 border-b border-[#252540]">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-white" />
                Quick Links
              </h2>
            </div>
            <div className="p-2">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-[#252540] hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
                Account Settings
              </Link>
              <Link
                href="/leaderboards"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-[#252540] hover:text-white transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Stat Leaderboards
              </Link>
              <Link
                href="/events"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-[#252540] hover:text-white transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Upcoming Events
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
