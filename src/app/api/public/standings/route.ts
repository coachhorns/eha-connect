import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const division = searchParams.get('division')

    if (eventId) {
      // Event-specific standings
      const eventTeams = await prisma.eventTeam.findMany({
        where: { eventId },
        include: {
          team: {
            select: {
              id: true,
              slug: true,
              name: true,
              logo: true,
              division: true,
              city: true,
              state: true,
              program: {
                select: { logo: true }
              }
            },
          },
        },
        orderBy: [
          { eventWins: 'desc' },
          { pointsFor: 'desc' },
        ],
      })

      // Group by pool if available
      const byPool = eventTeams.reduce((acc, et) => {
        const pool = et.pool || 'Overall'
        if (!acc[pool]) acc[pool] = []
        acc[pool].push({
          teamId: et.team.id,
          teamSlug: et.team.slug,
          teamName: et.team.name,
          teamLogo: et.team.logo || (et.team as any).program?.logo,
          city: et.team.city,
          state: et.team.state,
          wins: et.eventWins,
          losses: et.eventLosses,
          pointsFor: et.pointsFor,
          pointsAgainst: et.pointsAgainst,
          pointDiff: et.pointsFor - et.pointsAgainst,
          seed: et.seed,
        })
        return acc
      }, {} as Record<string, any[]>)

      // Sort each pool by wins, then point differential
      Object.keys(byPool).forEach(pool => {
        byPool[pool].sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins
          return b.pointDiff - a.pointDiff
        })
      })

      return NextResponse.json({ standings: byPool, type: 'event' })
    }

    // Overall standings (team records)
    const whereClause: any = { isActive: true }
    if (division) whereClause.division = division

    const teams = await prisma.team.findMany({
      where: whereClause,
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        division: true,
        city: true,
        state: true,
        program: {
          select: { logo: true }
        },
        wins: true,
        losses: true,
      },
      orderBy: [
        { wins: 'desc' },
        { losses: 'asc' },
      ],
    })

    // Group by division
    const byDivision = teams.reduce((acc, team) => {
      const group = team.division || 'Other'
      if (!acc[group]) acc[group] = []
      acc[group].push({
        teamId: team.id,
        teamSlug: team.slug,
        teamName: team.name,
        teamLogo: team.logo || (team as any).program?.logo,
        division: team.division,
        city: team.city,
        state: team.state,
        wins: team.wins,
        losses: team.losses,
        winPct: team.wins + team.losses > 0
          ? (team.wins / (team.wins + team.losses)).toFixed(3).substring(1)
          : '.000',
      })
      return acc
    }, {} as Record<string, any[]>)

    // Get available filters
    const divisions = await prisma.team.findMany({
      where: { isActive: true, division: { not: null } },
      select: { division: true },
      distinct: ['division'],
    })

    // Get recent events for filter
    const events = await prisma.event.findMany({
      where: { isPublished: true },
      select: { id: true, name: true, slug: true },
      orderBy: { startDate: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      standings: byDivision,
      type: 'overall',
      filters: {
        divisions: divisions.map(d => d.division).filter(Boolean),
        events,
      },
    })
  } catch (error) {
    console.error('Error fetching standings:', error)
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
  }
}
