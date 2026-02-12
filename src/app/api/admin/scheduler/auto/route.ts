import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SchedulerEngine, SchedulerSettings, UnscheduledGame, Court } from '@/lib/scheduler/engine'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, date, venueIds, settings, mode = 'PREVIEW' } = body

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // The date string will be passed directly to the engine for Pacific timezone handling
    const dateStr: string = date

    // Verify the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch unscheduled games for this event (games without courtId assigned)
    const unscheduledGamesRaw = await prisma.game.findMany({
      where: {
        eventId,
        courtId: null,
        status: { not: 'CANCELED' },
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: [
        { gameType: 'asc' },
        { bracketRound: 'asc' },
        { bracketPosition: 'asc' },
      ],
    })

    // Transform to UnscheduledGame format
    const unscheduledGames: UnscheduledGame[] = unscheduledGamesRaw.map((game) => ({
      id: game.id,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      gameType: game.gameType as UnscheduledGame['gameType'],
      division: game.division,
      bracketRound: game.bracketRound,
      bracketPosition: game.bracketPosition,
    }))

    // Get courts from specified venues (or fall back to event venues if not provided)
    let courts: Court[] = []

    if (venueIds && Array.isArray(venueIds) && venueIds.length > 0) {
      // Fetch the specified venues with their courts
      const selectedVenues = await prisma.venue.findMany({
        where: { id: { in: venueIds } },
        include: { courts: true },
      })

      courts = selectedVenues.flatMap((venue) =>
        venue.courts.map((court) => ({
          id: court.id,
          name: court.name,
          venueId: court.venueId,
          venue: { id: venue.id, name: venue.name },
        }))
      )
    } else {
      // Fallback: try to get courts from event-linked venues
      const eventWithVenues = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          venues: {
            include: { courts: true },
          },
        },
      })

      if (eventWithVenues?.venues) {
        courts = eventWithVenues.venues.flatMap((venue) =>
          venue.courts.map((court) => ({
            id: court.id,
            name: court.name,
            venueId: court.venueId,
            venue: { id: venue.id, name: venue.name },
          }))
        )
      }
    }

    if (courts.length === 0) {
      return NextResponse.json({
        error: 'No courts available. Please select at least one venue with courts.',
      }, { status: 400 })
    }

    if (unscheduledGames.length === 0) {
      return NextResponse.json({
        error: 'No unscheduled games found for this event.',
      }, { status: 400 })
    }

    // Parse scheduler settings - dateStr is required for Pacific timezone handling
    const schedulerSettings: Partial<SchedulerSettings> = {
      startTime: settings?.startTime || '08:00',
      endTime: settings?.endTime || '22:00',
      gameDuration: settings?.gameDuration || 60,
      minRestMinutes: settings?.minRestMinutes || 60,
      dateStr: dateStr,
    }

    // Run the scheduler - pass the date string for Pacific timezone handling
    const engine = new SchedulerEngine(
      unscheduledGames,
      courts,
      dateStr,
      schedulerSettings
    )

    const result = engine.schedule()

    // If mode is APPLY, save the changes to the database
    if (mode === 'APPLY') {
      const updates = result.scheduled.map((update) =>
        prisma.game.update({
          where: { id: update.gameId },
          data: {
            courtId: update.courtId,
            scheduledAt: update.scheduledAt,
          },
        })
      )

      await prisma.$transaction(updates)

      return NextResponse.json({
        success: true,
        message: `Successfully scheduled ${result.stats.scheduledCount} games`,
        stats: result.stats,
        unscheduled: result.unscheduled.map((u) => ({
          gameId: u.game.id,
          homeTeam: u.game.homeTeam.name,
          awayTeam: u.game.awayTeam.name,
          reason: u.reason,
        })),
      })
    }

    // PREVIEW mode - return the proposed schedule without saving
    return NextResponse.json({
      success: true,
      mode: 'PREVIEW',
      scheduled: result.scheduled.map((s) => ({
        gameId: s.gameId,
        courtId: s.courtId,
        courtName: s.court.name,
        venueName: s.court.venue?.name || 'Unknown Venue',
        scheduledAt: s.scheduledAt.toISOString(),
        timeSlot: s.timeSlot,
        homeTeam: s.game.homeTeam.name,
        awayTeam: s.game.awayTeam.name,
        gameType: s.game.gameType,
        division: s.game.division,
      })),
      unscheduled: result.unscheduled.map((u) => ({
        gameId: u.game.id,
        homeTeam: u.game.homeTeam.name,
        awayTeam: u.game.awayTeam.name,
        gameType: u.game.gameType,
        reason: u.reason,
      })),
      stats: result.stats,
      settings: schedulerSettings,
    })
  } catch (error) {
    console.error('Error in auto-scheduler:', error)
    return NextResponse.json(
      { error: 'Failed to run auto-scheduler' },
      { status: 500 }
    )
  }
}
