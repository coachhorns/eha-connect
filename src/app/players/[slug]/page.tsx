import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin,
  GraduationCap,
  ShieldCheck,
  Trophy,
  Users,
  ExternalLink,
  Camera,
  Link as LinkIcon,
  UserPlus,
  FileText,
  Globe,
  PlayCircle,
} from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Badge, Button, Card, VerifiedBadge } from '@/components/ui'
import { formatHeight, formatPosition, formatDate } from '@/lib/utils'
import { achievementBadges } from '@/lib/constants'
import { canViewStats } from '@/lib/permissions'
import StatsPaywall from '@/components/players/StatsPaywall'
import ShareProfileButton from '@/components/players/ShareProfileButton'
import FilmRoomSection from '@/components/players/FilmRoomSection'
import PhotoGallery from '@/components/players/PhotoGallery'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getPlayer(slug: string) {
  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
      guardians: {
        select: { id: true, userId: true },
      },
      achievements: {
        orderBy: { earnedAt: 'desc' },
      },
      media: {
        where: { isPublic: true },
        orderBy: { uploadedAt: 'desc' },
      },
      teamRosters: {
        include: {
          team: true,
        },
        orderBy: { joinedAt: 'desc' },
      },
      gameStats: {
        include: {
          game: {
            include: {
              event: {
                select: { name: true, slug: true },
              },
              homeTeam: {
                select: { name: true, slug: true },
              },
              awayTeam: {
                select: { name: true, slug: true },
              },
            },
          },
        },
        orderBy: {
          game: {
            scheduledAt: 'desc',
          },
        },
        take: 20,
      },
    },
  })

  if (!player) return null

  // Calculate career stats
  const statsAgg = await prisma.gameStats.aggregate({
    where: { playerId: player.id },
    _sum: {
      points: true,
      rebounds: true,
      assists: true,
      steals: true,
      blocks: true,
      fg3Made: true,
      fg3Attempted: true,
      fgMade: true,
      fgAttempted: true,
      ftMade: true,
      ftAttempted: true,
      turnovers: true,
    },
    _count: true,
  })

  const gamesPlayed = statsAgg._count || 0

  const careerStats = gamesPlayed > 0 ? {
    gamesPlayed,
    totals: {
      points: statsAgg._sum.points || 0,
      rebounds: statsAgg._sum.rebounds || 0,
      assists: statsAgg._sum.assists || 0,
      steals: statsAgg._sum.steals || 0,
      blocks: statsAgg._sum.blocks || 0,
      fg3Made: statsAgg._sum.fg3Made || 0,
    },
    averages: {
      ppg: (statsAgg._sum.points || 0) / gamesPlayed,
      rpg: (statsAgg._sum.rebounds || 0) / gamesPlayed,
      apg: (statsAgg._sum.assists || 0) / gamesPlayed,
      spg: (statsAgg._sum.steals || 0) / gamesPlayed,
      bpg: (statsAgg._sum.blocks || 0) / gamesPlayed,
    },
    shooting: {
      fgPct: statsAgg._sum.fgAttempted
        ? ((statsAgg._sum.fgMade || 0) / statsAgg._sum.fgAttempted) * 100
        : 0,
      fg3Pct: statsAgg._sum.fg3Attempted
        ? ((statsAgg._sum.fg3Made || 0) / statsAgg._sum.fg3Attempted) * 100
        : 0,
      ftPct: statsAgg._sum.ftAttempted
        ? ((statsAgg._sum.ftMade || 0) / statsAgg._sum.ftAttempted) * 100
        : 0,
    },
  } : null

  return { player, careerStats }
}

export default async function PlayerProfilePage(props: PageProps) {
  const { slug } = await props.params
  const searchParams = await props.searchParams
  const data = await getPlayer(slug)

  if (!data) {
    notFound()
  }

  const { player, careerStats } = data
  const currentTeam = player.teamRosters.find((r: any) => !r.leftAt)
  const videos = player.media.filter((m: any) => m.type === 'VIDEO')

  // Check if user can view stats
  const session = await getServerSession(authOptions)
  const permission = await canViewStats(session?.user?.id, player.id)
  const isRecruit = searchParams?.recruit === 'true'
  const canView = permission.canView || isRecruit

  // Verified = has guardians or userId
  const isVerified = (player.guardians?.length > 0) || !!player.userId

  // Check if current user owns this profile (player or guardian)
  const isOwner = session?.user?.id && (
    player.userId === session.user.id ||
    player.guardians?.some((g: { userId: string }) => g.userId === session.user.id)
  )

  return (

    <div className="min-h-screen">
      {/* Header Section */}
      <header className="pt-32 lg:pt-36 relative overflow-hidden bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-white/5">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-12 lg:py-16 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-end">
            {/* Profile Photo */}
            <div className="relative shrink-0 mx-auto md:mx-0">
              <div className="w-48 h-60 lg:w-56 lg:h-64 bg-[#1a3a6e] rounded-sm border-4 border-white/10 overflow-hidden relative group shadow-2xl">
                {player.profilePhoto ? (
                  <Image
                    src={player.profilePhoto}
                    alt={`${player.firstName} ${player.lastName}`}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/30">
                    <Users className="w-20 h-20" />
                  </div>
                )}
                {isVerified && (
                  <div className="absolute bottom-0 left-0 right-0 bg-eha-red py-2 text-center">
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-[0.2em] flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Athlete
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Player Info */}
            <div className="flex-1 pb-2 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                {player.graduationYear && (
                  <span className="px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20">
                    Class of {player.graduationYear}
                  </span>
                )}
                <span className="text-white/60 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  {player.primaryPosition ? formatPosition(player.primaryPosition) : 'Athlete'}
                  {player.heightFeet && ` • ${formatHeight(player.heightFeet, player.heightInches)}`}
                  {player.weight && ` • ${player.weight} lbs`}
                </span>
              </div>

              <h1 className="text-5xl lg:text-7xl mb-4 tracking-tighter font-bold text-white uppercase">
                {player.firstName} <span className="text-white/90">{player.lastName}</span>
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 lg:gap-8 text-white/80">
                {(player.school || player.city) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-eha-red" />
                    <span className="font-bold text-sm uppercase tracking-wider">
                      {[player.school, player.city, player.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {currentTeam && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-eha-red" />
                    <Link href={`/teams/${currentTeam.team.slug}`} className="font-bold text-sm uppercase tracking-wider hover:text-white transition-colors">
                      {currentTeam.team.name}
                    </Link>
                  </div>
                )}
                {player.jerseyNumber && (
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full font-bold text-sm border border-white/10">
                      #{player.jerseyNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Recruiting Links */}
              {(player.maxPrepsUrl || player.hudlUrl || player.youtubeUrl) && (
                <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {player.maxPrepsUrl && (
                    <a
                      href={player.maxPrepsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 hover:bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-sm transition-colors"
                    >
                      <Image src="/images/logos/maxpreps.png" alt="MaxPreps" width={16} height={16} className="w-4 h-4 object-contain" />
                      MaxPreps
                    </a>
                  )}
                  {player.hudlUrl && (
                    <a
                      href={player.hudlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 hover:bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-sm transition-colors"
                    >
                      <Image src="/images/logos/hudl.png" alt="Hudl" width={16} height={16} className="w-4 h-4 object-contain" />
                      Hudl
                    </a>
                  )}
                  {player.youtubeUrl && (
                    <a
                      href={player.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 hover:bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-sm transition-colors"
                    >
                      <Image src="/images/logos/youtube.png" alt="YouTube" width={16} height={16} className="w-4 h-4 object-contain" />
                      YouTube
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-4 pb-2 w-full md:w-auto">
              {/* If unverified, show Claim button instead of Share */}
              {!isVerified ? (
                <Link href={`/claim-player?playerId=${player.id}&name=${encodeURIComponent(`${player.firstName} ${player.lastName}`)}`} className="w-full md:w-auto">
                  <Button className="w-full md:w-auto bg-[#FFD700] hover:bg-[#FDB931] text-[#0A1D37] border-0">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Claim Profile
                  </Button>
                </Link>
              ) : (
                <ShareProfileButton playerName={`${player.firstName} ${player.lastName}`} />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-12">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* Main Column (Stats & Graphics) */}
          <div className="lg:col-span-8 space-y-12">

            {/* Season Averages */}
            <section>
              <div className="flex items-baseline justify-between mb-8">
                <h2 className="text-2xl text-white uppercase tracking-tight font-bold">Season Averages</h2>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Verified by EHA Circuit Officials
                </span>
              </div>

              {careerStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Points */}
                  <div className="bg-[#152e50]/50 border border-white/5 p-6 rounded-sm hover:border-eha-red hover:-translate-y-0.5 transition-all group relative overflow-hidden">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Points</span>
                    <span className="text-4xl font-extrabold text-white">{careerStats.averages.ppg.toFixed(1)}</span>
                    <div className="mt-2 text-[10px] font-bold text-eha-red/80 uppercase">Per Game</div>
                  </div>
                  {/* Assists */}
                  <div className="bg-[#152e50]/50 border border-white/5 p-6 rounded-sm hover:border-eha-red hover:-translate-y-0.5 transition-all">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assists</span>
                    <span className="text-4xl font-extrabold text-white">{careerStats.averages.apg.toFixed(1)}</span>
                    <div className="mt-2 text-[10px] font-bold text-gray-500 uppercase">Per Game</div>
                  </div>
                  {/* Rebounds */}
                  <div className="bg-[#152e50]/50 border border-white/5 p-6 rounded-sm hover:border-eha-red hover:-translate-y-0.5 transition-all">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Rebounds</span>
                    <span className="text-4xl font-extrabold text-white">{careerStats.averages.rpg.toFixed(1)}</span>
                    <div className="mt-2 text-[10px] font-bold text-gray-500 uppercase">Per Game</div>
                  </div>
                  {/* Efficiency (Mock for now, using FG%) */}
                  <div className="bg-[#152e50]/50 border border-white/5 p-6 rounded-sm hover:border-eha-red hover:-translate-y-0.5 transition-all">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Efficiency</span>
                    <span className="text-4xl font-extrabold text-eha-red">{careerStats.shooting.fgPct.toFixed(1)}</span>
                    <div className="mt-2 text-[10px] font-bold text-eha-red uppercase">Elite Tier</div>
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-dashed border-white/10 rounded-sm text-center">
                  <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">No verified stats recorded yet</p>
                </div>
              )}
            </section>

            {/* Game Log */}
            <section>
              <h3 className="text-2xl text-white mb-8 font-bold uppercase tracking-tight">Recent Game Log</h3>
              <div className="bg-[#152e50]/30 border border-white/5 rounded-sm overflow-hidden">
                <div className={!canView ? 'blur-md pointer-events-none select-none relative' : ''}>
                  <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Date</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Opponent</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">PTS</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">AST</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">REB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {player.gameStats.length > 0 ? player.gameStats.map((stat) => (
                        <tr key={stat.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-5 text-sm font-bold text-white">{formatDate(stat.game.scheduledAt)}</td>
                          <td className="px-6 py-5 text-sm text-gray-400">
                            {stat.game.homeTeamId === currentTeam?.teamId
                              ? `vs ${stat.game.awayTeam?.name || 'Opponent'}`
                              : `@ ${stat.game.homeTeam?.name || 'Opponent'}`}
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-white">{stat.points}</td>
                          <td className="px-6 py-5 text-sm text-gray-400">{stat.assists}</td>
                          <td className="px-6 py-5 text-sm text-gray-400">{stat.rebounds}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No recent games recorded</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {!canView && <StatsPaywall playerId={player.id} />}
              </div>
            </section>

            {/* Film Room (Highlights) */}
            {(videos.length > 0 || player.hudlUrl || player.youtubeUrl || player.highlightUrl) && (
              <section>
                <div className="flex items-baseline justify-between mb-8">
                  <h3 className="text-2xl text-white font-bold uppercase tracking-tight">Film Room</h3>
                </div>
                {videos.length > 0 ? (
                  <FilmRoomSection
                    videos={videos.map((v: any) => ({
                      id: v.id,
                      url: v.url,
                      title: v.title,
                      thumbnail: v.thumbnail,
                    }))}
                  />
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <a href={player.highlightUrl || player.youtubeUrl || player.hudlUrl || '#'} target="_blank" rel="noopener noreferrer" className="group relative aspect-video bg-[#0A1D37] rounded-sm overflow-hidden border border-white/10 cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1D37] to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-eha-red rounded-full flex items-center justify-center text-white shadow-xl shadow-eha-red/20 transform group-hover:scale-110 transition-transform">
                          <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[16px] border-l-white border-b-8 border-b-transparent ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className="inline-block text-[10px] font-extrabold text-eha-red uppercase tracking-widest bg-white px-2 py-0.5 rounded-sm mb-2">Featured</span>
                        <p className="text-white font-bold truncate">Official Highlights Playlist</p>
                      </div>
                    </a>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-10">

            {/* Athlete Bio/Info */}
            <section className="bg-white border border-white/10 rounded-sm p-8 shadow-lg">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#0A1D37] mb-6">Athlete Info</h4>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Age</span>
                  <span className="text-xs font-bold text-[#0A1D37]">{player.dateOfBirth ? new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Height</span>
                  <span className="text-xs font-bold text-[#0A1D37]">{formatHeight(player.heightFeet, player.heightInches)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Position</span>
                  <span className="text-xs font-bold text-[#0A1D37]">{formatPosition(player.primaryPosition)}</span>
                </div>
                {player.gpa && (
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">GPA</span>
                    <span className="text-xs font-bold text-[#0A1D37]">{player.gpa.toFixed(2)}</span>
                  </div>
                )}
                {/* Transcript Download */}
                {player.transcriptUrl && (
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <a
                      href={player.transcriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-[#0A1D37] hover:bg-eha-red text-white text-xs font-extrabold uppercase tracking-widest rounded-sm transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Download Transcript (PDF)
                    </a>
                  </div>
                )}
                {/* Bio Text if available */}
                {player.bio && (
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <p className="text-xs leading-relaxed text-slate-600">
                      {player.bio}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Photos (Vertical Stack in Sidebar) */}
            {player.media.filter(m => m.type === 'PHOTO').length > 0 && (
              <section>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-6">Photos</h4>
                <PhotoGallery
                  photos={player.media
                    .filter((m: any) => m.type === 'PHOTO')
                    .slice(0, 4)
                    .map((item: any) => ({
                      id: item.id,
                      url: item.url,
                      title: item.title,
                    }))}
                />
              </section>
            )}

          </div>
        </div>
      </main>

      {/* Footer is global, no need to add here */}
    </div>

  )
}
