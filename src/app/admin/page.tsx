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
  ChevronRight,
  MapPin,
  Building2,
  UserCog,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

interface Stats {
  totalPlayers: number
  totalTeams: number
  totalEvents: number
  totalGames: number
  activeSubscriptions: number
  totalVenues: number
  totalPrograms: number
  totalUsers: number
  recentGames: any[]
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

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
      href: '/admin/users',
      icon: UserCog,
      label: 'Manage Users',
      description: 'View and manage registered users',
      count: stats?.totalUsers || 0,
    },
    {
      href: '/admin/programs',
      icon: Building2,
      label: 'Manage Programs',
      description: 'Manage clubs and their teams',
      count: stats?.totalPrograms || 0,
    },
    {
      href: '/admin/players',
      icon: Users,
      label: 'Manage Players',
      description: 'Add, edit, or verify players',
      count: stats?.totalPlayers || 0,
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
    {
      href: '/admin/venues',
      icon: MapPin,
      label: 'Manage Venues',
      description: 'Configure courts and locations',
      count: stats?.totalVenues || 0,
    },
  ]

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Admin Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Manage players, teams, events, and stats
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Link href="/admin/programs">
          <Card className="p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.totalPrograms || 0}</p>
                <p className="text-sm text-gray-500">Programs</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/players">
          <Card className="p-4 hover:bg-white/5 transition-colors">
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
        </Link>

        <Link href="/admin/teams">
          <Card className="p-4 hover:bg-white/5 transition-colors">
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
        </Link>

        <Link href="/admin/events">
          <Card className="p-4 hover:bg-white/5 transition-colors">
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
        </Link>

        <Link href="/admin/settings/payments">
          <Card className="p-4 hover:bg-white/5 transition-colors">
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
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {quickLinks.map((link, index) => (
          <Link key={`${link.href}-${index}`} href={link.href}>
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
                  {link.count !== null && (
                    <Badge variant="default">{link.count}</Badge>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Live Game Management */}
      <Card className="p-6 bg-gradient-to-br from-eha-red to-red-900 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Live Game Management</h2>
            <p className="text-white/80">Enter Scorekeeper Mode to manage live games</p>
          </div>
          <Link href="/scorekeeper">
            <Button className="flex items-center gap-3 bg-white text-eha-red hover:bg-white/90 px-6 py-3 text-lg font-semibold">
              <BarChart3 className="w-6 h-6" />
              Scorekeeper Mode
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
