'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  ShieldOff,
  MoreVertical,
} from 'lucide-react'
import { Button, Badge, Avatar, Modal } from '@/components/ui'
import { formatHeight, formatPosition } from '@/lib/utils'

interface Player {
  id: string
  slug: string
  firstName: string
  lastName: string
  profilePhoto?: string | null
  primaryPosition?: string | null
  heightFeet?: number | null
  heightInches?: number | null
  school?: string | null
  graduationYear?: number | null
  isVerified: boolean
  isActive: boolean
  guardians?: { id: string }[]
  userId?: string | null
}

const isPlayerVerified = (player: Player): boolean => {
  return player.isVerified || (player.guardians != null && player.guardians.length > 0) || !!player.userId
}

export default function AdminPlayersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/players')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchPlayers()
  }, [search])

  const fetchPlayers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('limit', '50')

      const res = await fetch(`/api/players?${params}`)
      const data = await res.json()
      setPlayers(data.players || [])
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleVerification = async (player: Player) => {
    try {
      await fetch(`/api/admin/players/${player.id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !isPlayerVerified(player) }),
      })
      fetchPlayers()
    } catch (error) {
      console.error('Error updating verification:', error)
    }
  }

  const deletePlayer = async () => {
    if (!selectedPlayer) return

    try {
      await fetch(`/api/admin/players/${selectedPlayer.id}`, {
        method: 'DELETE',
      })
      setShowDeleteModal(false)
      setSelectedPlayer(null)
      fetchPlayers()
    } catch (error) {
      console.error('Error deleting player:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen">
      <header className="pt-32 lg:pt-36 relative overflow-hidden bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-white/5">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">Admin Panel</span>
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-white uppercase tracking-tighter">Manage Players</h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">Add, edit, and verify player profiles</p>
            </div>
            <Link href="/admin/players/new">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Player
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10">

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-sm px-4 py-3 pl-11 text-sm focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
          />
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-[#152e50]/30 border border-white/5 rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-4 border-b border-white/5">
                <div className="w-10 h-10 bg-white/10 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-1/4 mb-2" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">No players found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Player
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Position
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    School
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Class
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {players.map((player) => (
                  <tr key={player.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5">
                      <Link href={`/players/${player.slug}`} className="flex items-center gap-3 hover:text-eha-red">
                        <Avatar
                          src={player.profilePhoto}
                          fallback={`${player.firstName} ${player.lastName}`}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-white">
                            {player.firstName} {player.lastName}
                          </p>
                          {player.heightFeet && (
                            <p className="text-sm text-gray-500">
                              {formatHeight(player.heightFeet, player.heightInches)}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-5 text-gray-400">
                      {formatPosition(player.primaryPosition)}
                    </td>
                    <td className="px-6 py-5 text-gray-400">
                      {player.school || '-'}
                    </td>
                    <td className="px-6 py-5 text-gray-400">
                      {player.graduationYear || '-'}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {isPlayerVerified(player) ? (
                        <Badge variant="success" size="sm" className="flex items-center gap-1 w-fit mx-auto">
                          <Shield className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm" className="flex items-center gap-1 w-fit mx-auto">
                          <ShieldOff className="w-3 h-3" />
                          Unverified
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVerification(player)}
                          title={isPlayerVerified(player) ? 'Remove verification' : 'Verify player'}
                        >
                          {isPlayerVerified(player) ? (
                            <ShieldOff className="w-4 h-4 text-white" />
                          ) : (
                            <Shield className="w-4 h-4 text-white" />
                          )}
                        </Button>
                        <Link href={`/admin/players/${player.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPlayer(player)
                            setShowDeleteModal(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedPlayer(null)
        }}
        title="Delete Player"
      >
        <p className="text-gray-400 mb-6">
          Are you sure you want to delete{' '}
          <span className="text-white font-semibold">
            {selectedPlayer?.firstName} {selectedPlayer?.lastName}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteModal(false)
              setSelectedPlayer(null)
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={deletePlayer}>
            Delete Player
          </Button>
        </div>
      </Modal>

      </main>
    </div>
  )
}
