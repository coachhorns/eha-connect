'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { Card, Button } from '@/components/ui'

interface InviteData {
  id: string
  email: string
  role: string
  expiresAt: string
  player: {
    id: string
    firstName: string
    lastName: string
    slug: string
    profilePhoto: string | null
  }
  inviter: {
    name: string | null
    email: string
  }
}

type InviteStatus = 'loading' | 'valid' | 'expired' | 'accepted' | 'not_found' | 'error'

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('loading')
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptResult, setAcceptResult] = useState<{
    success: boolean
    message: string
    player?: InviteData['player']
  } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInvite()
  }, [token])

  const fetchInvite = async () => {
    try {
      const res = await fetch(`/api/guardians/invite/${token}`)
      const data = await res.json()

      if (res.status === 404) {
        setInviteStatus('not_found')
      } else if (res.status === 410) {
        setInviteStatus('expired')
      } else if (data.accepted) {
        setInviteStatus('accepted')
      } else if (res.ok) {
        setInvite(data.invite)
        setInviteStatus('valid')
      } else {
        setError(data.error || 'Failed to load invite')
        setInviteStatus('error')
      }
    } catch (err) {
      setError('Failed to load invite')
      setInviteStatus('error')
    }
  }

  const handleAccept = async () => {
    if (!session) {
      // Redirect to sign in with callback to this page
      router.push(`/auth/signin?callbackUrl=/invite/${token}`)
      return
    }

    setIsAccepting(true)
    setError('')

    try {
      const res = await fetch(`/api/guardians/invite/${token}`, {
        method: 'POST',
      })

      const data = await res.json()

      if (data.requiresAuth) {
        router.push(`/auth/signin?callbackUrl=/invite/${token}`)
        return
      }

      if (res.ok) {
        setAcceptResult({
          success: true,
          message: data.message,
          player: data.player,
        })
      } else {
        setError(data.error || 'Failed to accept invite')
      }
    } catch (err) {
      setError('Failed to accept invite')
    } finally {
      setIsAccepting(false)
    }
  }

  // Loading state
  if (inviteStatus === 'loading' || authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <Card className="p-8">
          {/* Not Found */}
          {inviteStatus === 'not_found' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Invite Not Found</h2>
              <p className="text-gray-400 mb-6">
                This invite link is invalid or has been removed.
              </p>
              <Link href="/">
                <Button>Go Home</Button>
              </Link>
            </div>
          )}

          {/* Expired */}
          {inviteStatus === 'expired' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Invite Expired</h2>
              <p className="text-gray-400 mb-6">
                This invite has expired. Please ask for a new invite link.
              </p>
              <Link href="/">
                <Button>Go Home</Button>
              </Link>
            </div>
          )}

          {/* Already Accepted */}
          {inviteStatus === 'accepted' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Already Accepted</h2>
              <p className="text-gray-400 mb-6">
                This invite has already been used.
              </p>
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          )}

          {/* Error */}
          {inviteStatus === 'error' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button onClick={fetchInvite}>Try Again</Button>
            </div>
          )}

          {/* Valid Invite - Show Accept Form */}
          {inviteStatus === 'valid' && invite && !acceptResult && (
            <div className="text-center">
              <div className="w-20 h-20 bg-eha-red/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="w-10 h-10 text-eha-red" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Co-Parent Invitation
              </h2>
              <p className="text-gray-400 mb-6">
                <span className="text-white font-medium">
                  {invite.inviter.name || invite.inviter.email}
                </span>{' '}
                has invited you to become a guardian of:
              </p>

              {/* Player Card */}
              <div className="bg-[#1a3a6e]/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                    {invite.player.profilePhoto ? (
                      <Image
                        src={invite.player.profilePhoto}
                        alt={`${invite.player.firstName} ${invite.player.lastName}`}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-500">
                        {invite.player.firstName[0]}{invite.player.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-white">
                      {invite.player.firstName} {invite.player.lastName}
                    </p>
                    <p className="text-sm text-gray-400">
                      You'll be added as a {invite.role.toLowerCase()} guardian
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {!session ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Sign in or create an account to accept this invitation
                  </p>
                  <Button onClick={handleAccept} className="w-full">
                    Sign In to Accept
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      Accept Invitation
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Success State */}
          {acceptResult?.success && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome!</h2>
              <p className="text-gray-400 mb-6">{acceptResult.message}</p>
              <div className="flex gap-3 justify-center">
                {acceptResult.player && (
                  <Link href={`/players/${acceptResult.player.slug}`}>
                    <Button variant="outline">View Player</Button>
                  </Link>
                )}
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
