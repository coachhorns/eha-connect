import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const division = searchParams.get('division')
        const region = searchParams.get('region')

        // Build filter query
        const where: any = {
            isActive: true,
        }

        const players = await prisma.player.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true,
                profilePhoto: true,
                isVerified: true,
                userId: true, // Check for legacy claimed status
                guardians: {
                    take: 1
                },
                graduationYear: true,
                heightFeet: true,
                heightInches: true,
                primaryPosition: true,
                teamRosters: {
                    take: 1, // Only get one team for now (primary team)
                    orderBy: { joinedAt: 'desc' },
                    select: {
                        team: {
                            select: {
                                name: true,
                                city: true,
                                state: true,
                            }
                        }
                    }
                },
                gameStats: {
                    include: {
                        game: {
                            select: {
                                isOfficial: true
                            }
                        }
                    }
                }
            }
        })

        // Process and aggregate stats
        const leaderboardData = players.map(player => {
            const stats = player.gameStats || []
            const gamesPlayed = stats.length

            const teamName = player.teamRosters?.[0]?.team?.name || 'Unattached'

            if (gamesPlayed === 0) {
                return {
                    id: player.id,
                    slug: player.slug,
                    rank: 0, // Will assign later
                    headshot: player.profilePhoto, // Add headshot
                    isVerified: player.isVerified || !!player.userId || (player.guardians && player.guardians.length > 0),
                    name: `${player.firstName} ${player.lastName}`,
                    initials: `${player.firstName[0]}${player.lastName[0]}`,
                    class: player.graduationYear ? `Class of ${player.graduationYear}` : '',
                    team: teamName,
                    position: player.primaryPosition || '-',
                    gamesPlayed: 0,
                    ppg: 0,
                    rpg: 0,
                    apg: 0,
                    per: 0,
                    totalPoints: 0,
                    totalRebounds: 0,
                    totalAssists: 0,
                    totalBlocks: 0,
                }
            }

            // Sum stats
            const totals = stats.reduce((acc: any, stat: any) => ({
                points: acc.points + (stat.points || 0),
                rebounds: acc.rebounds + (stat.rebounds || 0),
                assists: acc.assists + (stat.assists || 0),
                blocks: acc.blocks + (stat.blocks || 0),
                steals: acc.steals + (stat.steals || 0),
                turnovers: acc.turnovers + (stat.turnovers || 0),
                fgMade: acc.fgMade + (stat.fgMade || 0),
                fgAttempted: acc.fgAttempted + (stat.fgAttempted || 0),
                fg3Made: acc.fg3Made + (stat.fg3Made || 0),
                fg3Attempted: acc.fg3Attempted + (stat.fg3Attempted || 0),
                ftMade: acc.ftMade + (stat.ftMade || 0),
                ftAttempted: acc.ftAttempted + (stat.ftAttempted || 0),
                plusMinus: acc.plusMinus + (stat.plusMinus || 0),
            }), {
                points: 0, rebounds: 0, assists: 0, blocks: 0, steals: 0, turnovers: 0,
                fgMade: 0, fgAttempted: 0, fg3Made: 0, fg3Attempted: 0, ftMade: 0, ftAttempted: 0, plusMinus: 0
            })

            // Calculate Averages
            const ppg = Number((totals.points / gamesPlayed).toFixed(1))
            const rpg = Number((totals.rebounds / gamesPlayed).toFixed(1))
            const apg = Number((totals.assists / gamesPlayed).toFixed(1))

            const missedFG = totals.fgAttempted - totals.fgMade
            const missedFT = totals.ftAttempted - totals.ftMade
            const rawPER = (totals.points + totals.rebounds + totals.assists + totals.steals + totals.blocks - missedFG - missedFT - totals.turnovers) / gamesPlayed
            const per = Number(Math.max(0, rawPER).toFixed(1))

            return {
                id: player.id,
                slug: player.slug,
                rank: 0, // Placeholder
                headshot: player.profilePhoto, // Add headshot
                isVerified: player.isVerified || !!player.userId || (player.guardians && player.guardians.length > 0),
                name: `${player.firstName} ${player.lastName}`,
                initials: `${player.firstName[0]}${player.lastName[0]}`,
                class: player.graduationYear ? `Class of ${player.graduationYear}` : '',
                team: teamName,
                position: player.primaryPosition || '-',
                gamesPlayed,
                ppg,
                rpg,
                apg,
                per,
                // Expose all totals for frontend calculation
                totalPoints: totals.points,
                totalRebounds: totals.rebounds,
                totalAssists: totals.assists,
                totalBlocks: totals.blocks,
                totalSteals: totals.steals,
                totalTurnovers: totals.turnovers,
                fgMade: totals.fgMade,
                fgAttempted: totals.fgAttempted,
                fg3Made: totals.fg3Made,
                fg3Attempted: totals.fg3Attempted,
                ftMade: totals.ftMade,
                ftAttempted: totals.ftAttempted,
                plusMinus: totals.plusMinus || 0,
            }
        })

        leaderboardData.sort((a, b) => b.ppg - a.ppg)

        // Debug Logging for Verification
        const verifiedPlayers = leaderboardData.filter(p => p.isVerified)
        console.log(`[API/Leaderboard] Total Players: ${leaderboardData.length}, Verified: ${verifiedPlayers.length}`)
        if (verifiedPlayers.length > 0) {
            console.log('[API/Leaderboard] Verified Players:', verifiedPlayers.map(p => p.name).join(', '))
        } else {
            console.log('[API/Leaderboard] No players marked as verified.')
        }

        leaderboardData.forEach((p, index) => {
            p.rank = index + 1
        })

        return NextResponse.json({ players: leaderboardData })
    } catch (error) {
        console.error('Error fetching leaderboard:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 })
    }
}
