import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const division = searchParams.get('division') || ''
    const state = searchParams.get('state') || ''
    const sort = searchParams.get('sort') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { program: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (division) {
      where.division = division
    }

    if (state) {
      where.state = state
    }

    const [allTeams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          program: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
          _count: {
            select: { roster: { where: { leftAt: null } } },
          },
        },
      }),
      prisma.team.count({ where }),
    ])

    // Helper to extract numeric age from division string (e.g., "EPL 17" -> 17, "Gold 14" -> 14)
    const getAgeNumber = (division: string | null): number => {
      if (!division) return 0
      const match = division.match(/(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }

    // Helper to get division priority (EPL first, then others alphabetically)
    const getDivisionPriority = (division: string | null): number => {
      if (!division) return 999
      const lower = division.toLowerCase()
      if (lower.startsWith('epl') || lower.startsWith('eha premier')) return 0
      if (lower.startsWith('gold')) return 1
      if (lower.startsWith('silver')) return 2
      return 3
    }

    // Sort teams based on sort parameter
    const sortedTeams = allTeams.sort((a, b) => {
      switch (sort) {
        case 'name':
          // Sort by team name alphabetically
          return (a.name || '').localeCompare(b.name || '')

        case 'program':
          // Sort by program name, then team name
          const programA = a.program?.name || ''
          const programB = b.program?.name || ''
          if (programA !== programB) return programA.localeCompare(programB)
          return (a.name || '').localeCompare(b.name || '')

        case 'age':
          // Sort by age (descending), then name
          const ageA = getAgeNumber(a.division)
          const ageB = getAgeNumber(b.division)
          if (ageA !== ageB) return ageB - ageA
          return (a.name || '').localeCompare(b.name || '')

        default:
          // Default: EPL first, then by age (17U -> 8U), then by name
          const divPriorityA = getDivisionPriority(a.division)
          const divPriorityB = getDivisionPriority(b.division)
          if (divPriorityA !== divPriorityB) return divPriorityA - divPriorityB

          const defaultAgeA = getAgeNumber(a.division)
          const defaultAgeB = getAgeNumber(b.division)
          if (defaultAgeA !== defaultAgeB) return defaultAgeB - defaultAgeA

          return (a.name || '').localeCompare(b.name || '')
      }
    })

    // Apply pagination to sorted results
    const teams = sortedTeams.slice(skip, skip + limit)

    return NextResponse.json({
      teams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}
