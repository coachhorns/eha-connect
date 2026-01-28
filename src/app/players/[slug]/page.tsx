import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin,
  GraduationCap,
  Shield,
  Share2,
  Download,
  Trophy,
  Users,
  Calendar,
  ExternalLink,
  Camera,
  Link as LinkIcon,
} from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Badge, Button, Card } from '@/components/ui'
import { formatHeight, formatPosition, formatDate } from '@/lib/utils'
import { achievementBadges } from '@/lib/constants'
import { canViewStats } from '@/lib/permissions'
import StatsPaywall from '@/components/players/StatsPaywall'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getPlayer(slug: string) {
  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
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

export default async function PlayerProfilePage({ params }: PageProps) {
  const { slug } = await params
  const data = await getPlayer(slug)

  if (!data) {
    notFound()
  }

  const { player, careerStats } = data
  const currentTeam = player.teamRosters.find((r: any) => !r.leftAt)

  // Check if user can view stats
  const session = await getServerSession(authOptions)
  const permission = await canViewStats(session?.user?.id, player.id)
  const canView = permission.canView

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-eha-red/20 to-transparent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Player Photo */}
            <div className="flex-shrink-0">
              <div className="relative w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden bg-white/5 mx-auto lg:mx-0">
                {player.profilePhoto ? (
                  <Image
                    src={player.profilePhoto}
                    alt={`${player.firstName} ${player.lastName}`}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1a3a6e] text-5xl font-bold text-gray-500">
                    {player.firstName[0]}{player.lastName[0]}
                  </div>
                )}
              </div>
            </div>

            {/* Player Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-3">
                {player.isVerified && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
                {player.primaryPosition && (
                  <Badge variant="orange">{formatPosition(player.primaryPosition)}</Badge>
                )}
                {player.jerseyNumber && (
                  <Badge variant="default">#{player.jerseyNumber}</Badge>
                )}
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-white">
                {player.firstName} {player.lastName}
              </h1>

              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-gray-400">
                {player.heightFeet && (
                  <span>{formatHeight(player.heightFeet, player.heightInches)}</span>
                )}
                {player.weight && <span>{player.weight} lbs</span>}
                {player.graduationYear && (
                  <span className="text-eha-red font-semibold">
                    Class of {player.graduationYear}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-gray-400 text-sm">
                {player.school && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    {player.school}
                  </span>
                )}
                {(player.city || player.state) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {[player.city, player.state].filter(Boolean).join(', ')}
                  </span>
                )}
                {currentTeam && (
                  <Link href={`/teams/${currentTeam.team.slug}`} className="flex items-center gap-1.5 hover:text-eha-red">
                    <Users className="w-4 h-4" />
                    {currentTeam.team.name}
                  </Link>
                )}
              </div>

              {/* Social Links */}
              <div className="mt-4 flex items-center justify-center lg:justify-start gap-3">
                {player.twitterHandle && (
                  <a
                    href={`https://twitter.com/${player.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#1a3a6e] rounded-lg text-gray-400 hover:text-white hover:bg-[#1DA1F2]/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                )}
                {player.instagramHandle && (
                  <a
                    href={`https://instagram.com/${player.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#1a3a6e] rounded-lg text-gray-400 hover:text-white hover:bg-[#E4405F]/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                    </svg>
                  </a>
                )}
                {player.hudlUrl && (
                  <a
                    href={player.hudlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#1a3a6e] rounded-lg text-gray-400 hover:text-white hover:bg-eha-red/20 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-center lg:justify-start gap-3">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Profile
                </Button>
                <Button variant="secondary" size="sm" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Stats Summary Card */}
            {careerStats && (
              <Card className="lg:w-72 flex-shrink-0 relative overflow-hidden">
                <div className={!canView ? 'blur-md pointer-events-none select-none' : ''}>
                  <div className="p-4 border-b border-[#1a3a6e]">
                    <h3 className="font-semibold text-white">Career Stats</h3>
                    <p className="text-sm text-gray-500">{careerStats.gamesPlayed} Games</p>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-eha-red">
                        {careerStats.averages.ppg.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">PPG</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">
                        {careerStats.averages.rpg.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">RPG</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">
                        {careerStats.averages.apg.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">APG</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">
                        {careerStats.averages.spg.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">SPG</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">
                        {careerStats.averages.bpg.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">BPG</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">
                        {careerStats.totals.fg3Made}
                      </p>
                      <p className="text-xs text-gray-500">3PM</p>
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-2 border-t border-[#1a3a6e] grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="font-medium text-white">{careerStats.shooting.fgPct.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">FG%</p>
                    </div>
                    <div>
                      <p className="font-medium text-white">{careerStats.shooting.fg3Pct.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">3P%</p>
                    </div>
                    <div>
                      <p className="font-medium text-white">{careerStats.shooting.ftPct.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">FT%</p>
                    </div>
                  </div>
                </div>
                {!canView && <StatsPaywall playerId={player.id} />}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Achievements */}
        {player.achievements.length > 0 && (
          <Card className="mb-8">
            <div className="p-4 border-b border-[#1a3a6e]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FFD700]" />
                Achievements
              </h2>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-3">
                {player.achievements.map((achievement: any) => {
                  const config = achievementBadges[achievement.type as keyof typeof achievementBadges]
                  return (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1a3a6e] rounded-lg"
                    >
                      <div className={`w-8 h-8 rounded-full ${config?.color || 'bg-gray-500'} flex items-center justify-center`}>
                        <Trophy className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{achievement.title}</p>
                        {achievement.eventName && (
                          <p className="text-xs text-gray-500">{achievement.eventName}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Bio */}
        {player.bio && (
          <Card className="mb-8">
            <div className="p-4 border-b border-[#1a3a6e]">
              <h2 className="text-xl font-bold text-white">About</h2>
            </div>
            <div className="p-4">
              <p className="text-gray-300 whitespace-pre-wrap">{player.bio}</p>
            </div>
          </Card>
        )}

        {/* Highlights & Links */}
        {(player.hudlUrl || player.youtubeUrl || player.highlightUrl) && (
          <Card className="mb-8">
            <div className="p-4 border-b border-[#1a3a6e]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-eha-red" />
                Highlights & Links
              </h2>
            </div>
            <div className="p-4 flex flex-wrap gap-3">
              {player.hudlUrl && (
                <a
                  href={player.hudlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a3a6e] rounded-lg text-gray-300 hover:text-white hover:bg-[#1a3a6e]/80 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 3.993L9 16z" />
                  </svg>
                  Hudl Profile
                </a>
              )}
              {player.youtubeUrl && (
                <a
                  href={player.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a3a6e] rounded-lg text-gray-300 hover:text-white hover:bg-[#FF0000]/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  YouTube
                </a>
              )}
              {player.highlightUrl && (
                <a
                  href={player.highlightUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a3a6e] rounded-lg text-gray-300 hover:text-white hover:bg-eha-red/20 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Highlight Reel
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Photo Gallery */}
        {player.media.filter((m: any) => m.type === 'PHOTO').length > 0 && (
          <Card className="mb-8">
            <div className="p-4 border-b border-[#1a3a6e]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-eha-red" />
                Photos
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {player.media
                  .filter((m: any) => m.type === 'PHOTO')
                  .map((item: any) => (
                    <div key={item.id} className="relative rounded-lg overflow-hidden bg-white/5 aspect-square">
                      <Image
                        src={item.url}
                        alt={item.title || 'Player photo'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        )}

        {/* Game Log */}
        {player.gameStats.length > 0 && (
          <Card className="relative overflow-hidden">
            <div className="p-4 border-b border-[#1a3a6e]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-eha-red" />
                Recent Games
              </h2>
            </div>
            <div className={!canView ? 'blur-md pointer-events-none select-none' : ''}>
              <div className="overflow-x-auto">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-left">Event</th>
                      <th>PTS</th>
                      <th>REB</th>
                      <th>AST</th>
                      <th>STL</th>
                      <th>BLK</th>
                      <th>3PM</th>
                      <th>FG%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.gameStats.map((stat: any) => (
                      <tr key={stat.id}>
                        <td className="text-left text-sm">
                          {formatDate(stat.game.scheduledAt)}
                        </td>
                        <td className="text-left text-sm">
                          {stat.game.event?.name || 'Exhibition'}
                        </td>
                        <td className="font-semibold text-eha-red">{stat.points}</td>
                        <td>{stat.rebounds}</td>
                        <td>{stat.assists}</td>
                        <td>{stat.steals}</td>
                        <td>{stat.blocks}</td>
                        <td>{stat.fg3Made}</td>
                        <td>
                          {stat.fgAttempted > 0
                            ? ((stat.fgMade / stat.fgAttempted) * 100).toFixed(0) + '%'
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {!canView && <StatsPaywall playerId={player.id} />}
          </Card>
        )}
      </div>
    </div>
  )
}
