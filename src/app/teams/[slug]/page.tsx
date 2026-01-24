import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Users, MapPin, Trophy, Building2 } from 'lucide-react'
import prisma from '@/lib/prisma'
import { Badge } from '@/components/ui'
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
        },
      },
      roster: {
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#1a3a6e]/50 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Team Logo / Icon */}
            <div className="w-32 h-32 rounded-2xl bg-[#1a3a6e] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {team.logo ? (
                <Image
                  src={team.logo}
                  alt={team.name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-16 h-16 text-white/50" />
              )}
            </div>

            {/* Team Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold text-white uppercase tracking-wider">
                  {team.name}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  {team.ageGroup && (
                    <Badge variant="info">{team.ageGroup}</Badge>
                  )}
                  {team.division && (
                    <Badge variant="default">{team.division}</Badge>
                  )}
                </div>
              </div>

              {team.program && (
                <Link
                  href={`/programs/${team.program.slug}`}
                  className="inline-flex items-center gap-2 text-lg text-gray-400 hover:text-eha-red transition-colors mb-2"
                >
                  <Building2 className="w-5 h-5" />
                  {team.program.name}
                </Link>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-gray-400">
                {(team.city || team.state) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>
                      {team.city}
                      {team.city && team.state ? ', ' : ''}
                      {team.state}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  <span className="text-white font-bold">
                    {team.wins}-{team.losses}
                  </span>
                  <span>Record</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{team.roster.length} Players</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamTabs
          roster={team.roster}
          games={allGames}
          teamId={team.id}
        />
      </div>
    </div>
  )
}
