'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui'
import {
  Trophy,
  ClipboardCheck,
  UserCircle,
  GraduationCap,
  BarChart3,
  Handshake,
  TrendingUp,
  ArrowRight,
  Zap,
} from 'lucide-react'

// ============================================================================
// DATA
// ============================================================================

interface LeaderEntry {
  name: string
  initials: string
  team: string
  value: string
  slug?: string
}

const features = [
  {
    icon: ClipboardCheck,
    title: 'Verified Game Stats',
    description: 'Points, rebounds, assists, steals, blocks, and shooting splits — all tracked live by official scorekeepers.',
  },
  {
    icon: UserCircle,
    title: 'Player Profiles',
    description: 'Build your verified athlete profile with stats, bio, and a shareable link designed for college coaches.',
  },
  {
    icon: GraduationCap,
    title: 'Recruiting Portal',
    description: 'Direct access to 10,000+ college coaches across all divisions. Email coaches right from your profile.',
  },
  {
    icon: BarChart3,
    title: 'Leaderboards & Rankings',
    description: 'See where you stack up. Division leaderboards rank athletes across every major statistical category.',
  },
]

const newsItems = [
  { label: 'NEW', text: 'Spring Showcase Registration Open' },
  { icon: Zap, text: 'Combine Registration Open' },
  { label: 'RISING', text: 'Class of 2027 Rankings Updated' },
  { icon: Trophy, text: 'Nationals Schedule Released' },
  { label: 'NEW', text: 'Updated Class of 2026 Rankings' },
]

// ============================================================================
// COMPONENTS
// ============================================================================

interface LeaderboardCardProps {
  title: string
  icon: React.ElementType
  leaders: LeaderEntry[]
  stat: string
  isLoading?: boolean
}

function LeaderboardCard({ title, icon: Icon, leaders, stat, isLoading }: LeaderboardCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-[#0A1D37] p-4 flex justify-between items-center">
        <h3 className="font-heading font-bold text-white tracking-wide">{title}</h3>
        <Icon className="w-5 h-5 text-white/30" />
      </div>
      <div>
        <div className="grid grid-cols-6 px-4 py-2 bg-slate-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-slate-100">
          <span className="col-span-1">Rk</span>
          <span className="col-span-3">Player</span>
          <span className="col-span-2 text-right">{stat}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-6 px-4 py-4 items-center">
                <span className="col-span-1">
                  <div className="w-6 h-5 bg-slate-200 rounded animate-pulse" />
                </span>
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-3.5 bg-slate-200 rounded animate-pulse" />
                    <div className="w-16 h-2.5 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="w-10 h-5 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : leaders.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No stats recorded yet for this division.
            </div>
          ) : (
            leaders.map((leader, idx) => {
              const content = (
                <div
                  className="grid grid-cols-6 px-4 py-4 items-center hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <span
                    className={`col-span-1 font-heading font-bold text-lg ${idx === 0 ? 'text-[#E31837]' : 'text-[#0A1D37]/50'}`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-[#0A1D37]">
                      {leader.initials}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-[#0A1D37] group-hover:text-[#E31837] transition-colors">
                        {leader.name}
                      </span>
                      <span className="block text-[10px] text-gray-400">{leader.team}</span>
                    </div>
                  </div>
                  <span className="col-span-2 text-right font-heading font-bold text-[#0A1D37] text-xl">
                    {leader.value}
                  </span>
                </div>
              )
              return leader.slug ? (
                <Link key={idx} href={`/players/${leader.slug}`}>{content}</Link>
              ) : (
                <div key={idx}>{content}</div>
              )
            })
          )}
        </div>
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
          <Link
            href="/leaderboards"
            className="text-[10px] font-bold text-[#E31837] uppercase tracking-widest hover:text-[#0A1D37] transition-colors"
          >
            View Full Leaderboard
          </Link>
        </div>
      </div>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ElementType
  title: string
  description: string
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white p-10 hover:bg-slate-50 transition-colors group">
      <div className="w-12 h-12 bg-[#0A1D37]/5 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-[#0A1D37] group-hover:text-[#E31837] transition-colors" />
      </div>
      <h3 className="font-heading font-bold text-lg text-[#0A1D37] mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'EPL 17' | 'EPL 16' | 'EPL 15'>('EPL 17')
  const [scoringLeaders, setScoringLeaders] = useState<LeaderEntry[]>([])
  const [assistLeaders, setAssistLeaders] = useState<LeaderEntry[]>([])
  const [reboundLeaders, setReboundLeaders] = useState<LeaderEntry[]>([])
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(true)

  const fetchLeaders = useCallback(async (division: string) => {
    setIsLoadingLeaders(true)
    try {
      const res = await fetch(`/api/leaderboard?division=${encodeURIComponent(division)}`)
      const data = await res.json()
      const players = data.players || []

      const toEntry = (p: any, statValue: number): LeaderEntry => ({
        name: p.name,
        initials: p.initials,
        team: p.team || '-',
        value: statValue.toFixed(1),
        slug: p.slug,
      })

      // PPG — already sorted by default
      setScoringLeaders(players.slice(0, 4).map((p: any) => toEntry(p, p.ppg)))

      // APG — sort by assists
      const byApg = [...players].sort((a: any, b: any) => b.apg - a.apg)
      setAssistLeaders(byApg.slice(0, 4).map((p: any) => toEntry(p, p.apg)))

      // RPG — sort by rebounds
      const byRpg = [...players].sort((a: any, b: any) => b.rpg - a.rpg)
      setReboundLeaders(byRpg.slice(0, 4).map((p: any) => toEntry(p, p.rpg)))
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      setScoringLeaders([])
      setAssistLeaders([])
      setReboundLeaders([])
    } finally {
      setIsLoadingLeaders(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaders(activeTab)
  }, [activeTab, fetchLeaders])

  return (
    <div className="min-h-screen">
      {/* ========== HERO SECTION ========== */}
      <section
        className="relative bg-[#0A1D37] pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)' }}
      >
        {/* Court Pattern Overlay */}
        <div className="absolute inset-0 opacity-30 court-pattern" />

        {/* Blur Circles */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E31837] blur-[120px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[100px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

        <div className="container mx-auto px-6 relative z-10 max-w-[1440px]">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="lg:col-span-7 space-y-8">
              {/* Live Badge */}
              <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                  Live Scouting Season 2026
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-8xl text-white leading-[0.9] tracking-tighter">
                PROVE IT <br />
                <span className="text-stroke">ON THE COURT.</span> <br />
                <span className="text-[#E31837]">OWN THE DATA.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-gray-400 max-w-xl font-light leading-relaxed">
                The only official verified analytics platform for the Elite Hoops Association.
                Connect your game stats directly to college recruiters.
              </p>

              {/* CTA Button */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/claim-player">
                  <Button
                    size="lg"
                    className="px-8 py-4 text-sm font-bold uppercase tracking-widest shadow-lg shadow-eha-red/20 hover:bg-white hover:text-[#0A1D37] transition-all"
                  >
                    Claim Athlete Profile
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Stats Row */}
              <div className="pt-8 flex flex-wrap items-center gap-8 border-t border-white/10">
                <div>
                  <span className="block font-heading font-bold text-3xl text-white">400+</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Colleges
                  </span>
                </div>
                <div className="w-px h-12 bg-white/10 hidden sm:block" />
                <div>
                  <span className="block font-heading font-bold text-3xl text-white">12k</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Athletes
                  </span>
                </div>
                <div className="w-px h-12 bg-white/10 hidden sm:block" />
                <div>
                  <span className="block font-heading font-bold text-3xl text-white">2.5M</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Data Points
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column - Glass Profile Card */}
            <div className="lg:col-span-5 relative hidden lg:block">
              <div
                className="relative rounded-2xl p-6 transform -rotate-2 transition-transform hover:rotate-0 duration-500 group"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {/* Profile Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full border-2 border-white/20 flex items-center justify-center overflow-hidden">
                      <span className="font-heading font-bold text-[#0A1D37] text-xl">JD</span>
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-xl text-white">Jalen Davis</h3>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <span>Cali Rebels</span>
                        <span className="w-1 h-1 rounded-full bg-gray-500" />
                        <span>PG</span>
                        <span className="w-1 h-1 rounded-full bg-gray-500" />
                        <span>&apos;25</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#E31837] px-3 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                    Top 100
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#162a4a]/50 rounded-lg p-3 border border-white/5 text-center">
                    <span className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                      PPG
                    </span>
                    <span className="font-heading font-bold text-2xl text-white">24.5</span>
                  </div>
                  <div className="bg-[#162a4a]/50 rounded-lg p-3 border border-white/5 text-center">
                    <span className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                      AST
                    </span>
                    <span className="font-heading font-bold text-2xl text-white">8.2</span>
                  </div>
                  <div className="bg-[#162a4a]/50 rounded-lg p-3 border border-white/5 text-center">
                    <span className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                      PER
                    </span>
                    <span className="font-heading font-bold text-2xl text-green-400">28.4</span>
                  </div>
                </div>

                {/* Shot Chart Placeholder */}
                <div className="relative h-48 bg-[#162a4a]/30 rounded-lg border border-white/5 p-4 flex items-center justify-center">
                  <svg
                    viewBox="0 0 100 80"
                    className="w-full h-full opacity-30 stroke-white fill-none"
                    strokeWidth={0.5}
                  >
                    <path d="M0,80 L0,0 L100,0 L100,80" />
                    <path d="M35,0 L35,15 L65,15 L65,0" />
                    <circle cx="50" cy="15" r="5" />
                    <path d="M10,0 Q50,40 90,0" />
                  </svg>
                  {/* Shot markers */}
                  <div className="absolute top-4 left-1/3 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <div className="absolute top-8 right-1/4 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <div className="absolute top-12 left-1/2 w-2 h-2 bg-red-500 rounded-full opacity-50" />
                </div>
              </div>

              {/* Floating "Stock Rising" Card */}
              <div
                className="absolute -bottom-6 -right-6 bg-white p-4 rounded-lg shadow-xl transform rotate-3"
                style={{ animation: 'bounce 3s ease-in-out infinite' }}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-[#E31837]" />
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Stock Rising
                    </span>
                    <span className="block font-heading font-bold text-[#0A1D37]">
                      +14% this week
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== NEWS MARQUEE ========== */}
      <div className="bg-[#E31837] text-white py-3 overflow-hidden relative z-20 -mt-10 mx-6 lg:mx-20 rounded shadow-lg transform -skew-x-6">
        <div className="flex gap-12 whitespace-nowrap transform skew-x-6 px-4 animate-marquee">
          {[...newsItems, ...newsItems].map((item, idx) => (
            <span
              key={idx}
              className="flex items-center gap-2 font-bold text-sm tracking-wider uppercase"
            >
              {item.label && (
                <span className="bg-white/20 px-1.5 rounded text-[10px]">{item.label}</span>
              )}
              {item.icon && <item.icon className="w-4 h-4" />}
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* ========== CIRCUIT LEADERS SECTION ========== */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-[1440px] mx-auto px-6">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
            <div>
              <h2 className="font-heading font-black text-4xl text-[#0A1D37] mb-2">
                CIRCUIT LEADERS
              </h2>
              <p className="text-gray-500">
                Live updated statistics from verified events across the country.
              </p>
            </div>
            {/* Tab Switcher */}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              {(['EPL 17', 'EPL 16', 'EPL 15'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === tab
                    ? 'bg-[#0A1D37] text-white'
                    : 'text-gray-500 hover:text-[#0A1D37]'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            <LeaderboardCard
              title="SCORING LEADERS"
              icon={Trophy}
              leaders={scoringLeaders}
              stat="PPG"
              isLoading={isLoadingLeaders}
            />
            <LeaderboardCard
              title="ASSISTS LEADERS"
              icon={Handshake}
              leaders={assistLeaders}
              stat="APG"
              isLoading={isLoadingLeaders}
            />
            <LeaderboardCard
              title="REBOUND LEADERS"
              icon={TrendingUp}
              leaders={reboundLeaders}
              stat="RPG"
              isLoading={isLoadingLeaders}
            />
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-[1440px] mx-auto px-6">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#E31837] font-bold text-xs uppercase tracking-widest">
              Complete Ecosystem
            </span>
            <h2 className="font-heading font-black text-4xl text-[#0A1D37] mt-2">
              NOT JUST A SCOREBOARD
            </h2>
            <p className="text-gray-500 mt-4 text-lg">
              A comprehensive suite of tools designed for the modern athlete, coach, and recruiter.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
            {features.map((feature, idx) => (
              <FeatureCard key={idx} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="relative bg-[#0A1D37] overflow-hidden">
        {/* Action photo — right half background */}
        <div className="absolute inset-0 hidden lg:block">
          <div className="absolute top-0 bottom-0 right-0 w-1/2">
            <Image
              src="/images/cta-shooter.jpg"
              alt="EHA basketball action"
              fill
              className="object-cover object-[center_35%]"
              sizes="50vw"
            />
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 relative z-10 py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading font-black text-5xl lg:text-7xl text-white mb-6">
                <span className="text-[#E31837]">SO GOOD,</span> <br />
                WE&apos;LL NEVER <br />
                FORCE YOU <br />
                TO <span className="text-stroke">BUY IT.</span>
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-md">
                Join the fastest growing verified basketball network in the country. Your journey
                to the next level starts with a profile.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/claim-player">
                  <Button
                    size="lg"
                    className="px-8 py-4 bg-white text-[#0A1D37] font-bold uppercase tracking-widest rounded hover:bg-[#E31837] hover:text-white transition-all"
                  >
                    Claim Your Profile
                  </Button>
                </Link>
                <Link href="/auth/role-selection">
                  <button className="px-8 py-4 bg-[#0A1D37]/20 border border-white/20 text-white font-bold uppercase tracking-widest rounded hover:bg-white/10 transition-all">
                    For Coaches
                  </button>
                </Link>
              </div>
            </div>

            {/* Spacer for right column */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </section>
    </div>
  )
}
