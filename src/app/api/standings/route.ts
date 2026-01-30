import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const ageGroup = searchParams.get('ageGroup')
        const division = searchParams.get('division')

        const where: any = {
            isActive: true,
        }

        if (ageGroup && ageGroup !== 'All') {
            where.ageGroup = ageGroup
        }

        if (division && division !== 'All Divisions') {
            where.division = division
        }

        const teams = await prisma.team.findMany({
            where,
            select: {
                id: true,
                name: true,
                logo: true,
                ageGroup: true,
                division: true,
                city: true,
                state: true,
                wins: true,
                losses: true,
            }
        })

        // Calculate Standing Data (PCT, Streak, L10 - simplified for now since we have no games)
        const standingData = teams.map(team => {
            const totalGames = team.wins + team.losses
            const pct = totalGames > 0 ? (team.wins / totalGames).toFixed(3) : '.000'
            const pctDisplay = pct.startsWith('0') ? pct.substring(1) : pct // remove leading zero if < 1

            return {
                id: team.id,
                pos: 0, // Assigned later
                name: team.name,
                abbr: team.name.substring(0, 3).toUpperCase(), // Approximate
                wins: team.wins,
                losses: team.losses,
                pct: pctDisplay === '1.000' ? '1.000' : pctDisplay,
                streak: '-', // Needs game history to calc
                streakType: 'N',
                lastTen: '-', // Needs game history
                division: team.division,
                ageGroup: team.ageGroup,
                logo: team.logo
            }
        })

        // Sort by Wins desc, then PCT desc, then Alphabetical
        standingData.sort((a, b) => {
            // First by Win %
            const pctA = parseFloat(a.pct)
            const pctB = parseFloat(b.pct)
            if (pctA !== pctB) return pctB - pctA

            // Then by Wins
            if (a.wins !== b.wins) return b.wins - a.wins

            // Then by Name
            return a.name.localeCompare(b.name)
        })

        // Assign Positions
        standingData.forEach((team, index) => {
            team.pos = index + 1
        })

        return NextResponse.json({ teams: standingData })

    } catch (error) {
        console.error('Error fetching standings:', error)
        return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
    }
}
