import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Public endpoint for Scorekeeper Hub
    const { id } = await params

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        homeTeam: {
          include: {
            roster: {
              where: { leftAt: null },
              include: {
                player: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    jerseyNumber: true,
                  },
                },
              },
            },
          },
        },
        awayTeam: {
          include: {
            roster: {
              where: { leftAt: null },
              include: {
                player: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    jerseyNumber: true,
                  },
                },
              },
            },
          },
        },
        event: {
          select: { name: true },
        },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Transform roster to players array
    const transformedGame = {
      ...game,
      homeTeam: {
        id: game.homeTeam.id,
        name: game.homeTeam.name,
        players: game.homeTeam.roster.map((r: any) => ({
          id: r.player.id,
          firstName: r.player.firstName,
          lastName: r.player.lastName,
          jerseyNumber: r.jerseyNumber || r.player.jerseyNumber,
        })),
      },
      awayTeam: {
        id: game.awayTeam.id,
        name: game.awayTeam.name,
        players: game.awayTeam.roster.map((r: any) => ({
          id: r.player.id,
          firstName: r.player.firstName,
          lastName: r.player.lastName,
          jerseyNumber: r.jerseyNumber || r.player.jerseyNumber,
        })),
      },
    }

    return NextResponse.json({ game: transformedGame })
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}
