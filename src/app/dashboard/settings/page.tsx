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
  Star,
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
  guardianRole: 'PRIMARY' | 'SECONDARY' | 'SELF'
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
  const selfPlayer = players.find((p) => p.guardianRole === 'SELF')
  const avatarSrc = selfPlayer?.profilePhoto || session.user.image

  return (
    <div className="min-h-screen">
      <header className="pt-32 lg:pt-36 relative overflow-hidden bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">User Dashboard</span>
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-white uppercase tracking-tighter">Account Settings</h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">Manage your profile and account preferences</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Profile Card */}
        <Card className="rounded-sm p-0">
          <div className="flex items-center gap-6 p-8 border-b border-white/5">
            <Avatar
              src={avatarSrc}
              fallback={session.user.name?.[0] || 'U'}
              size="lg"
              className="w-24 h-24 text-3xl"
            />
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{session.user.name}</h2>
              <p className="text-gray-400">{session.user.email}</p>
              <div className="mt-2">
                <Badge variant={session.user.role === 'ADMIN' ? 'error' : 'default'}>
                  {session.user.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red">Personal Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <div className="p-3 rounded-sm bg-[#152e50]/50 border border-white/5 text-white text-sm font-medium">
                  {session.user.name}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <div className="p-3 rounded-sm bg-[#152e50]/50 border border-white/5 text-white text-sm font-medium">
                  {session.user.email}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Account Role
                </label>
                <div className="p-3 rounded-sm bg-[#152e50]/50 border border-white/5 text-white text-sm font-medium">
                  {session.user.role}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* My Players Section */}
        <Card className="rounded-sm p-0">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red flex items-center gap-2">
                <Users className="w-4 h-4 text-eha-red" />
                My Players
              </h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
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
            <div className="text-center p-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h4 className="text-white font-bold uppercase tracking-wide mb-2">No Players Linked</h4>
              <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-4">
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
            <div className="p-6 space-y-3">
              {players.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.slug}`}
                  className="flex items-center justify-between p-5 bg-[#152e50]/50 border border-white/5 rounded-sm hover:border-eha-red hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-sm overflow-hidden bg-white/10 flex-shrink-0">
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
                        <p className="font-bold text-white uppercase tracking-wide">
                          {player.firstName} {player.lastName}
                        </p>
                        {player.guardianRole === 'SELF' ? (
                          <Badge variant="info" size="sm" className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Athlete
                          </Badge>
                        ) : player.guardianRole === 'PRIMARY' ? (
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
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
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
          <Card className="rounded-sm p-8 border-eha-red/30">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-eha-red mb-6">
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
      </main>

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
