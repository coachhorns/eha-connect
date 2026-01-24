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
    const { eventId, date, settings, mode = 'PREVIEW' } = body

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Parse the date
    const scheduleDate = new Date(date)
    if (isNaN(scheduleDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Fetch the event with its venues
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venues: {
          include: {
            courts: true,
          },
        },
      },
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
      ageGroup: game.ageGroup,
      division: game.division,
      bracketRound: game.bracketRound,
      bracketPosition: game.bracketPosition,
    }))

    // Get all courts from event venues
    const courts: Court[] = event.venues.flatMap((venue) =>
      venue.courts.map((court) => ({
        id: court.id,
        name: court.name,
        venueId: court.venueId,
        venue: { id: venue.id, name: venue.name },
      }))
    )

    if (courts.length === 0) {
      return NextResponse.json({
        error: 'No courts available for this event. Please add venues with courts first.',
      }, { status: 400 })
    }

    if (unscheduledGames.length === 0) {
      return NextResponse.json({
        error: 'No unscheduled games found for this event.',
      }, { status: 400 })
    }

    // Parse scheduler settings
    const schedulerSettings: Partial<SchedulerSettings> = {
      startTime: settings?.startTime || '08:00',
      endTime: settings?.endTime || '22:00',
      gameDuration: settings?.gameDuration || 60,
      minRestMinutes: settings?.minRestMinutes || 60,
    }

    // Run the scheduler
    const engine = new SchedulerEngine(
      unscheduledGames,
      courts,
      scheduleDate,
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
        ageGroup: s.game.ageGroup,
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
