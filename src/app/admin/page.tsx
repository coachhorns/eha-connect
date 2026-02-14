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
  GraduationCap,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'

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
    {
      href: '/admin/colleges/import',
      icon: GraduationCap,
      label: 'Import College Data',
      description: 'Upload CSVs for college coaches database',
      count: null,
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <header className="pt-32 lg:pt-36 relative overflow-hidden bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-border-subtle">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
          <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">
            Admin Panel
          </span>
          <h1 className="font-heading font-bold text-4xl lg:text-5xl text-text-primary uppercase tracking-tighter">
            Dashboard
          </h1>
          <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">
            Manage players, teams, events, and stats
          </p>
        </div>
      </header>

      <main className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10">

        {/* Stats Overview */}
        <section className="mb-10">
          <h2 className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest mb-6">Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { href: '/admin/programs', icon: Building2, value: stats?.totalPrograms || 0, label: 'Programs' },
              { href: '/admin/players', icon: Users, value: stats?.totalPlayers || 0, label: 'Players' },
              { href: '/admin/teams', icon: UsersRound, value: stats?.totalTeams || 0, label: 'Teams' },
              { href: '/admin/events', icon: Calendar, value: stats?.totalEvents || 0, label: 'Events' },
              { href: '/admin/settings/payments', icon: Trophy, value: stats?.activeSubscriptions || 0, label: 'Subscribers' },
            ].map((stat) => (
              <Link key={stat.href} href={stat.href}>
                <div className="bg-surface-raised/50 border border-border-subtle p-6 rounded-sm hover:border-eha-red hover:-translate-y-0.5 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <stat.icon className="w-5 h-5 text-text-muted group-hover:text-eha-red transition-colors" />
                  </div>
                  <span className="block text-3xl font-extrabold text-text-primary">{stat.value}</span>
                  <span className="block mt-1 text-[10px] font-bold text-text-muted uppercase tracking-widest">{stat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="mb-10">
          <h2 className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {quickLinks.map((link, index) => (
              <Link key={`${link.href}-${index}`} href={link.href}>
                <div className="bg-surface-raised/30 border border-border-subtle rounded-sm p-6 hover:border-eha-red/50 hover:-translate-y-0.5 transition-all group h-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-surface-glass border border-border-default rounded-sm flex items-center justify-center group-hover:border-eha-red/30 transition-colors">
                        <link.icon className="w-5 h-5 text-text-muted group-hover:text-eha-red transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary text-sm">{link.label}</h3>
                        <p className="text-xs text-text-muted mt-0.5">{link.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {link.count !== null && (
                        <Badge variant="default">{link.count}</Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-eha-red transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Live Game Management */}
        <section>
          <div className="relative overflow-hidden rounded-sm border border-eha-red/30 bg-gradient-to-br from-eha-red to-red-900 p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
              <div>
                <h2 className="font-heading font-bold text-xl text-white uppercase tracking-tight mb-1">Live Game Management</h2>
                <p className="text-white/70 text-sm font-bold uppercase tracking-widest">Enter Scorekeeper Mode to manage live games</p>
              </div>
              <Link href="/scorekeeper">
                <Button className="flex items-center gap-3 bg-white text-eha-red hover:bg-white/90">
                  <BarChart3 className="w-5 h-5" />
                  Scorekeeper Mode
                </Button>
              </Link>
            </div>
          </div>
        </section>


        {/* Exposure Events Integration Guide */}
        <section className="mt-10">
          <div className="bg-gradient-to-r from-amber-900/20 to-amber-800/20 border border-amber-500/30 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/exposure-logo.png"
                  alt="Exposure Basketball"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight mb-2">Exposure Events Integration</h3>
                <p className="text-text-secondary text-sm mb-4">
                  This platform is integrated with Exposure Events. You can push registered teams and their rosters directly to the live tournament system.
                </p>

                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-black/20 p-3 rounded border border-border-subtle">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-black font-bold">1</div>
                      <span className="text-xs font-bold text-text-muted uppercase">Review</span>
                    </div>
                    <p className="text-sm text-text-primary font-medium">Check Roster Status</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded border border-border-subtle">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-black font-bold">2</div>
                      <span className="text-xs font-bold text-text-muted uppercase">Sync</span>
                    </div>
                    <p className="text-sm text-text-primary font-medium">Use Event Dashboard</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded border border-border-subtle">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[10px] text-black font-bold">3</div>
                      <span className="text-xs font-bold text-text-muted uppercase">Push</span>
                    </div>
                    <p className="text-sm text-text-primary font-medium">Push to Live Event</p>
                  </div>
                </div>

                <div className="bg-amber-500/5 p-3 rounded border border-amber-500/10 mb-4">
                  <p className="text-xs text-amber-400">
                    <strong>How to Push:</strong> Go to <Link href="/admin/events" className="underline hover:text-text-primary">Manage Events</Link> {'>'} Select Event {'>'} <strong>Exposure Integration</strong> Tab.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
