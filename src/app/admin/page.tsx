'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  UsersRound,
  Calendar,
  BarChart3,
  Trophy,
  Activity,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

interface Stats {
  totalPlayers: number
  totalTeams: number
  totalEvents: number
  totalGames: number
  activeSubscriptions: number
  recentGames: any[]
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin')
    } else if (session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
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

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  const quickLinks = [
    {
      href: '/admin/players',
      icon: Users,
      label: 'Manage Players',
      description: 'Add, edit, or verify players',
      count: stats?.totalPlayers || 0,
    },
    {
      href: '/admin/teams',
      icon: UsersRound,
      label: 'Manage Teams',
      description: 'Manage team rosters and info',
      count: stats?.totalTeams || 0,
    },
    {
      href: '/admin/events',
      icon: Calendar,
      label: 'Manage Events',
      description: 'Create and manage events',
      count: stats?.totalEvents || 0,
    },
    {
      href: '/admin/games',
      icon: Activity,
      label: 'Manage Games',
      description: 'Schedule and manage games',
      count: stats?.totalGames || 0,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Admin Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Manage players, teams, events, and stats
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalPlayers || 0}</p>
              <p className="text-sm text-gray-500">Players</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalTeams || 0}</p>
              <p className="text-sm text-gray-500">Teams</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalEvents || 0}</p>
              <p className="text-sm text-gray-500">Events</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.activeSubscriptions || 0}</p>
              <p className="text-sm text-gray-500">Subscribers</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card variant="hover" className="p-6 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                    <link.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{link.label}</h3>
                    <p className="text-sm text-gray-500">{link.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{link.count}</Badge>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/players/new">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Player
            </Button>
          </Link>
          <Link href="/admin/teams/new">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Team
            </Button>
          </Link>
          <Link href="/admin/events/new">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </Link>
          <Link href="/admin/games/new">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Schedule Game
            </Button>
          </Link>
          <Link href="/scorekeeper">
            <Button className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Scorekeeper Mode
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
