import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Users, MapPin, Building2, Shield } from 'lucide-react'
import prisma from '@/lib/prisma'
import { TeamTabs } from './TeamTabs'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getTeam(slug: string) {
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      },
      roster: {
        where: { leftAt: null },
        include: {
          player: {
            select: {
              id: true,
              slug: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              primaryPosition: true,
              jerseyNumber: true,
              heightFeet: true,
              heightInches: true,
              graduationYear: true,
              school: true,
              isVerified: true,
              userId: true,
              guardians: {
                select: { id: true },
              },
              gameStats: {
                select: {
                  points: true,
                  rebounds: true,
                  assists: true,
                  steals: true,
                  blocks: true,
                },
              },
            },
          },
        },
        orderBy: {
          player: {
            lastName: 'asc',
          },
        },
      },
      homeGames: {
        take: 10,
        orderBy: { scheduledAt: 'desc' },
        include: {
          event: { select: { id: true, name: true } },
          homeTeam: { select: { id: true, name: true, slug: true } },
          awayTeam: { select: { id: true, name: true, slug: true } },
        },
      },
      awayGames: {
        take: 10,
        orderBy: { scheduledAt: 'desc' },
        include: {
          event: { select: { id: true, name: true } },
          homeTeam: { select: { id: true, name: true, slug: true } },
          awayTeam: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  })

  return team
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const team = await getTeam(slug)

  if (!team) {
    return { title: 'Team Not Found' }
  }

  return {
    title: `${team.name} | EHA Connect`,
    description: `View ${team.name}'s roster, schedule, and stats on EHA Connect.`,
  }
}

export default async function TeamPage({ params }: PageProps) {
  const { slug } = await params
  const team = await getTeam(slug)

  if (!team) {
    notFound()
  }

  // Combine and sort all games by date
  const allGames = [...team.homeGames, ...team.awayGames]
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 10)

  // Calculate win streak
  const recentGames = allGames.filter(g => g.status === 'FINAL')
  let streak = 0
  let streakType = 'W'
  for (const game of recentGames) {
    const isHome = game.homeTeam.id === team.id
    const teamScore = isHome ? game.homeScore : game.awayScore
    const oppScore = isHome ? game.awayScore : game.homeScore
    const won = teamScore > oppScore

    if (streak === 0) {
      streakType = won ? 'W' : 'L'
      streak = 1
    } else if ((streakType === 'W' && won) || (streakType === 'L' && !won)) {
      streak++
    } else {
      break
    }
  }

  const location = [team.city, team.state].filter(Boolean).join(', ')
  const logoUrl = team.logo || team.program?.logo

  return (
    <div className="min-h-screen bg-[#0A1D37]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0a1628] pt-32 pb-16 border-b border-white/5">
        {/* Radial Dot Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative z-10 w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
            {/* Left: Logo + Team Info */}
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Team Logo */}
              <div className="w-32 h-32 bg-white rounded-sm flex items-center justify-center p-4 shadow-xl flex-shrink-0 overflow-hidden">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={team.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Shield className="w-16 h-16 text-[#0A1D37]" />
                )}
              </div>

              {/* Team Details */}
              <div className="space-y-3 text-center sm:text-left">
                {/* Badges */}
                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  {team.division && (
                    <span className="px-3 py-1 text-[10px] font-black tracking-widest uppercase bg-eha-red text-white">
                      {team.division}
                    </span>
                  )}
                </div>

                {/* Team Name */}
                <h1 className="text-4xl lg:text-5xl font-heading font-bold tracking-tighter text-white">
                  {team.name}
                </h1>

                {/* Location & Program */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-slate-400">
                  {location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {location}
                    </span>
                  )}
                  {team.program && (
                    <Link
                      href={`/programs/${team.program.slug}`}
                      className="flex items-center gap-1.5 hover:text-eha-red transition-colors"
                    >
                      <Building2 className="w-4 h-4" />
                      {team.program.name}
                    </Link>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {team.roster.length} Players
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex gap-6 sm:gap-8">
              <div className="text-center sm:text-right border-r border-white/10 pr-6 sm:pr-8">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Overall Record
                </span>
                <span className="text-3xl sm:text-4xl font-black text-white font-heading">
                  {team.wins}-{team.losses}
                </span>
              </div>
              <div className="text-center sm:text-right">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {streakType === 'W' ? 'Win Streak' : 'Loss Streak'}
                </span>
                <span className={`text-3xl sm:text-4xl font-black font-heading ${streakType === 'W' ? 'text-green-400' : 'text-eha-red'}`}>
                  {streakType}{streak}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 sm:py-12">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <TeamTabs
            roster={team.roster}
            games={allGames}
            teamId={team.id}
            teamName={team.name}
          />
        </div>
      </section>
    </div>
  )
}
