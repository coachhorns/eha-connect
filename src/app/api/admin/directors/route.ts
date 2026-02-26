import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const programs = await prisma.program.findMany({
    where: { ownerId: { not: null } },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
      teams: {
        select: {
          id: true,
          name: true,
          division: true,
          coachName: true,
          roster: {
            where: { leftAt: null },
            select: {
              jerseyNumber: true,
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  jerseyNumber: true,
                  primaryPosition: true,
                  graduationYear: true,
                  school: true,
                },
              },
            },
            orderBy: { player: { lastName: 'asc' } },
          },
          _count: {
            select: { roster: true },
          },
        },
        orderBy: { name: 'asc' },
      },
      _count: {
        select: {
          teams: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const entries = programs.map((p) => ({
    id: p.id,
    programName: p.name,
    logo: p.logo,
    city: p.city,
    state: p.state,
    directorName: p.owner?.name || 'Unknown',
    directorEmail: p.owner?.email || '',
    teamCount: p._count.teams,
    createdAt: p.createdAt.toISOString(),
    teams: p.teams.map((t) => ({
      id: t.id,
      name: t.name,
      division: t.division,
      coachName: t.coachName,
      playerCount: t._count.roster,
      players: t.roster.map((r) => ({
        id: r.player.id,
        firstName: r.player.firstName,
        lastName: r.player.lastName,
        jerseyNumber: r.jerseyNumber || r.player.jerseyNumber || null,
        position: r.player.primaryPosition,
        graduationYear: r.player.graduationYear,
        school: r.player.school,
      })),
    })),
  }))

  return NextResponse.json({ entries, total: entries.length })
}
