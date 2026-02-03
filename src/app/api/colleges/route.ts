import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SKIP_WORDS = new Set(['of', 'the', 'at', 'and', 'in', 'for'])

function getInitials(name: string): string {
  return name
    .split(/[\s,.\-()]+/)
    .filter((w) => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join('')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const search = searchParams.get('search')
    const division = searchParams.get('division')
    const state = searchParams.get('state')
    const conference = searchParams.get('conference')

    // If schoolId is provided, return that college + its coaches
    if (schoolId) {
      const college = await prisma.college.findUnique({
        where: { id: schoolId },
        include: {
          coaches: {
            orderBy: { lastName: 'asc' },
          },
        },
      })

      if (!college) {
        return NextResponse.json({ error: 'College not found' }, { status: 404 })
      }

      // Deduplicate coaches by firstName + lastName
      const seen = new Set<string>()
      const uniqueCoaches = college.coaches.filter((c) => {
        const key = `${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return NextResponse.json({ college: { ...college, coaches: uniqueCoaches } })
    }

    // Search by school name (supports abbreviations like "UCI", "UC Irvine")
    if (search && search.length >= 2) {
      const allColleges = await prisma.college.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          conference: true,
          division: true,
        },
        orderBy: { name: 'asc' },
      })

      const searchLower = search.toLowerCase().trim()
      const words = searchLower.split(/\s+/).filter((w) => w.length > 0)

      const scored = allColleges
        .map((college) => {
          const nameLower = college.name.toLowerCase()
          const initials = getInitials(college.name)
          const initialsLower = initials.toLowerCase()
          let score = 0

          // Full string matching
          if (nameLower === searchLower) score += 100
          else if (nameLower.startsWith(searchLower)) score += 80
          else if (nameLower.includes(searchLower)) score += 60

          // Initials matching (e.g. "UCI" → "University of California, Irvine")
          if (initialsLower === searchLower) score += 90
          else if (initialsLower.startsWith(searchLower)) score += 70

          // Per-word matching (e.g. "UC Irvine" → word "irvine" + initials "UC")
          for (const word of words) {
            if (nameLower.includes(word)) score += 15
            if (initialsLower.startsWith(word)) score += 30
          }

          return { ...college, score }
        })
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map(({ score, ...college }) => college)

      return NextResponse.json({ colleges: scored })
    }

    // If any filters are provided, return matching colleges
    if (division || state || conference) {
      const where: any = {}
      if (division) where.division = division
      if (state) where.state = state
      if (conference) where.conference = conference

      const colleges = await prisma.college.findMany({
        where,
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          conference: true,
          division: true,
        },
        orderBy: { name: 'asc' },
      })

      return NextResponse.json({ colleges })
    }

    // No params: return distinct filter options
    const [divisions, states] = await Promise.all([
      prisma.college.findMany({
        select: { division: true },
        distinct: ['division'],
        orderBy: { division: 'asc' },
      }),
      prisma.college.findMany({
        where: { state: { not: null } },
        select: { state: true },
        distinct: ['state'],
        orderBy: { state: 'asc' },
      }),
    ])

    return NextResponse.json({
      divisions: divisions.map((d) => d.division),
      states: states.map((s) => s.state).filter(Boolean),
    })
  } catch (error) {
    console.error('Error fetching colleges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch college data' },
      { status: 500 }
    )
  }
}
