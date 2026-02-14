'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Trash2,
  Trophy,
  Users,
  Calendar,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  GitBranch,
  LayoutGrid,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'

interface Event {
  id: string
  name: string
}

interface Bracket {
  id: string
  name: string
  type: 'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'POOL_PLAY' | 'ROUND_ROBIN'
  event: Event
  teamCount: number
  completedGames: number
  totalGames: number
  progress: number
  createdAt: string
  settings: any
}

const TYPE_LABELS: Record<string, string> = {
  SINGLE_ELIM: 'Single Elimination',
  DOUBLE_ELIM: 'Double Elimination',
  POOL_PLAY: 'Pool Play',
  ROUND_ROBIN: 'Round Robin',
}

const TYPE_ICONS: Record<string, typeof GitBranch> = {
  SINGLE_ELIM: GitBranch,
  DOUBLE_ELIM: GitBranch,
  POOL_PLAY: LayoutGrid,
  ROUND_ROBIN: LayoutGrid,
}

export default function BracketsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [brackets, setBrackets] = useState<Bracket[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [eventFilter, setEventFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/brackets')
    } else if (authStatus === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [authStatus, session, router])

  const fetchBrackets = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (eventFilter) params.append('eventId', eventFilter)

      const res = await fetch(`/api/admin/brackets?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setBrackets(data.brackets)
      setEvents(data.events)
      setError('')
    } catch (err: any) {
      console.error('Error fetching brackets:', err)
      setError(err.message || 'Failed to load brackets')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [eventFilter])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchBrackets()
    }
  }, [authStatus, fetchBrackets])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchBrackets()
  }

  const handleDelete = async (bracketId: string) => {
    if (!confirm('Are you sure you want to delete this bracket? All associated games will also be deleted.')) {
      return
    }

    setDeletingId(bracketId)
    try {
      const res = await fetch('/api/admin/brackets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bracketId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setBrackets(prev => prev.filter(b => b.id !== bracketId))
    } catch (err: any) {
      setError(err.message || 'Failed to delete bracket')
    } finally {
      setDeletingId(null)
    }
  }

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  // Group brackets by type
  const poolBrackets = brackets.filter(b => b.type === 'POOL_PLAY' || b.type === 'ROUND_ROBIN')
  const elimBrackets = brackets.filter(b => b.type === 'SINGLE_ELIM' || b.type === 'DOUBLE_ELIM')

  return (
    <div className="min-h-screen">
      <header className="pt-32 lg:pt-36 relative overflow-hidden bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-border-subtle">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">Admin Panel</span>
              <h1 className="font-heading font-bold text-4xl lg:text-5xl text-text-primary uppercase tracking-tighter">Brackets & Pools</h1>
              <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">Manage tournament brackets and pool play groups</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Link href="/admin/brackets/new">
                <Button className="flex items-center gap-2"><Plus className="w-4 h-4" />New Bracket / Pool</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10">

      {/* Filter */}
      <div className="mb-8 flex items-center gap-4">
        <Calendar className="w-5 h-5 text-text-muted" />
        <select
          className="bg-surface-glass border border-border-default text-text-primary rounded-sm px-4 py-3 text-sm w-64 focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 appearance-none cursor-pointer transition-all"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option className="bg-page-bg text-text-primary" value="">All Events</option>
          {events.map(e => (
            <option className="bg-page-bg text-text-primary" key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <span className="text-sm text-text-muted">
          {brackets.length} bracket{brackets.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            &times;
          </button>
        </div>
      )}

      {/* Content */}
      {brackets.length === 0 ? (
        <div className="bg-surface-raised/30 border border-border-subtle rounded-sm p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">No Brackets Yet</h3>
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            Create your first bracket or pool to start generating matchups for your tournament.
          </p>
          <Link href="/admin/brackets/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create First Bracket
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pool Play Section */}
          {poolBrackets.length > 0 && (
            <div>
              <h2 className="font-heading text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-blue-400" />
                Pool Play Groups
                <Badge variant="default">{poolBrackets.length}</Badge>
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {poolBrackets.map(bracket => (
                  <BracketCard
                    key={bracket.id}
                    bracket={bracket}
                    onDelete={handleDelete}
                    isDeleting={deletingId === bracket.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Elimination Brackets Section */}
          {elimBrackets.length > 0 && (
            <div>
              <h2 className="font-heading text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-green-400" />
                Elimination Brackets
                <Badge variant="default">{elimBrackets.length}</Badge>
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {elimBrackets.map(bracket => (
                  <BracketCard
                    key={bracket.id}
                    bracket={bracket}
                    onDelete={handleDelete}
                    isDeleting={deletingId === bracket.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
    </div>
  )
}

function BracketCard({
  bracket,
  onDelete,
  isDeleting,
}: {
  bracket: Bracket
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const Icon = TYPE_ICONS[bracket.type] || GitBranch

  return (
    <div className="bg-surface-raised/30 border border-border-subtle rounded-sm p-5 hover:border-eha-red/50 hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-surface-overlay rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{bracket.name}</h3>
            <p className="text-sm text-text-muted">{bracket.event.name}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge size="sm" variant="default">
                {TYPE_LABELS[bracket.type]}
              </Badge>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Users className="w-3 h-3" />
                {bracket.teamCount} teams
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(bracket.id)}
            disabled={isDeleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-text-muted mb-1">
          <span>
            {bracket.completedGames} / {bracket.totalGames} games completed
          </span>
          <span>{bracket.progress}%</span>
        </div>
        <div className="h-2 bg-dark-base rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-eha-red to-orange-500 transition-all duration-300"
            style={{ width: `${bracket.progress}%` }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-border-default flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Created {new Date(bracket.createdAt).toLocaleDateString()}
        </span>
        <Link href="/admin/schedule">
          <Button variant="outline" size="sm" className="text-xs">
            Schedule Games
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
