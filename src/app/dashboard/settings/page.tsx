'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  User,
  Mail,
  Shield,
  Settings as SettingsIcon,
  Users,
  UserPlus,
  ChevronRight,
  Crown,
  UserCheck,
} from 'lucide-react'
import { Card, Button, Avatar, Badge } from '@/components/ui'
import InviteCoParentModal from '@/components/dashboard/InviteCoParentModal'

interface Team {
  id: string
  name: string
  slug: string
}

interface GuardedPlayer {
  id: string
  firstName: string
  lastName: string
  slug: string
  profilePhoto: string | null
  graduationYear: number | null
  primaryPosition: string | null
  guardianRole: 'PRIMARY' | 'SECONDARY'
  isPayer: boolean
  teamRosters: Array<{
    team: Team
  }>
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [players, setPlayers] = useState<GuardedPlayer[]>([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/user/guarded-players')
      const data = await res.json()
      if (res.ok) {
        setPlayers(data.players)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setIsLoadingPlayers(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard/settings')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchPlayers()
    }
  }, [session, fetchPlayers])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  const hasPrimaryGuardianship = players.some((p) => p.guardianRole === 'PRIMARY')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Account Settings</h1>
        <p className="mt-2 text-gray-400">Manage your profile and account preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-6 pb-6 border-b border-white/10">
            <Avatar
              src={session.user.image}
              fallback={session.user.name?.[0] || 'U'}
              size="lg"
              className="w-24 h-24 text-3xl"
            />
            <div>
              <h2 className="text-xl font-bold text-white">{session.user.name}</h2>
              <p className="text-gray-400">{session.user.email}</p>
              <div className="mt-2">
                <Badge variant={session.user.role === 'ADMIN' ? 'error' : 'default'}>
                  {session.user.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">Personal Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <div className="p-3 rounded-lg bg-dark-surface border border-white/10 text-white">
                  {session.user.name}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <div className="p-3 rounded-lg bg-dark-surface border border-white/10 text-white">
                  {session.user.email}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Account Role
                </label>
                <div className="p-3 rounded-lg bg-dark-surface border border-white/10 text-white">
                  {session.user.role}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* My Players Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Users className="w-5 h-5 text-eha-red" />
                My Players
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Players you are linked to as a guardian
              </p>
            </div>
            <div className="flex gap-2">
              {hasPrimaryGuardianship && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Co-Parent
                </Button>
              )}
              <Link href="/claim-player">
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Claim Player
                </Button>
              </Link>
            </div>
          </div>

          {isLoadingPlayers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-eha-red border-t-transparent rounded-full" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h4 className="text-white font-medium mb-2">No Players Linked</h4>
              <p className="text-gray-500 text-sm mb-4">
                Link your account to a player profile to track their stats and achievements
              </p>
              <Link href="/claim-player">
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Claim a Player
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.slug}`}
                  className="flex items-center justify-between p-4 bg-[#1a3a6e]/30 rounded-lg hover:bg-[#1a3a6e]/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">
                          {player.firstName} {player.lastName}
                        </p>
                        {player.guardianRole === 'PRIMARY' ? (
                          <Badge variant="gold" size="sm" className="flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Primary
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm" className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Co-Parent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {player.graduationYear && (
                          <span>Class of {player.graduationYear}</span>
                        )}
                        {player.teamRosters[0]?.team && (
                          <>
                            <span>•</span>
                            <span>{player.teamRosters[0].team.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Admin Quick Actions */}
        {session.user.role === 'ADMIN' && (
          <Card className="p-6 border-eha-red/30">
            <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-4">
              Admin Settings
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Configure API keys and pricing for subscriptions.
            </p>
            <Button
              variant="outline"
              className="border-eha-red text-eha-red hover:bg-eha-red hover:text-white"
              onClick={() => router.push('/admin/settings/payments')}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              Manage Payment Keys
            </Button>
          </Card>
        )}
      </div>

      {/* Invite Co-Parent Modal */}
      <InviteCoParentModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        players={players}
        onInviteSent={fetchPlayers}
      />
    </div>
  )
}
