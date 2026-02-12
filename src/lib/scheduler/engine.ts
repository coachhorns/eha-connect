/**
 * Auto-Scheduler Engine
 * Implements a greedy first-fit algorithm for scheduling games to courts and time slots
 */

import { fromZonedTime } from 'date-fns-tz'
import { PACIFIC_TIMEZONE } from '@/lib/timezone'

export interface UnscheduledGame {
  id: string
  homeTeamId: string
  awayTeamId: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  gameType: 'POOL' | 'BRACKET' | 'CONSOLATION' | 'CHAMPIONSHIP' | 'EXHIBITION'
  division?: string | null
  bracketRound?: string | null
  bracketPosition?: number | null
}

export interface Court {
  id: string
  name: string
  venueId: string
  venue?: { id: string; name: string }
}

export interface SchedulerSettings {
  startTime: string // "08:00" format (HH:mm)
  endTime: string   // "22:00" format (HH:mm)
  gameDuration: number // minutes (default 60)
  minRestMinutes: number // minimum rest between games for same team (default 60)
  dateStr: string // "YYYY-MM-DD" format - the date to schedule for
}

export interface ProposedUpdate {
  gameId: string
  courtId: string
  scheduledAt: Date
  game: UnscheduledGame
  court: Court
  timeSlot: string // Display format "08:00 AM"
}

export interface SchedulerResult {
  scheduled: ProposedUpdate[]
  unscheduled: Array<{
    game: UnscheduledGame
    reason: string
  }>
  stats: {
    totalGames: number
    scheduledCount: number
    unscheduledCount: number
    utilizationPercent: number
  }
}

interface TimeSlot {
  start: Date
  end: Date
  label: string
}

interface CourtSlot {
  court: Court
  timeSlot: TimeSlot
  isOccupied: boolean
}

// Priority order for game types (higher = scheduled first)
const GAME_TYPE_PRIORITY: Record<string, number> = {
  CHAMPIONSHIP: 5,
  CONSOLATION: 4,
  BRACKET: 3,
  POOL: 2,
  EXHIBITION: 1,
}

export class SchedulerEngine {
  private games: UnscheduledGame[]
  private courts: Court[]
  private settings: SchedulerSettings
  private teamSchedule: Map<string, Date[]> // Track when teams are playing

  constructor(
    games: UnscheduledGame[],
    courts: Court[],
    dateStr: string, // YYYY-MM-DD format
    settings: Partial<SchedulerSettings> = {}
  ) {
    this.games = games
    this.courts = courts
    this.settings = {
      startTime: settings.startTime || '08:00',
      endTime: settings.endTime || '22:00',
      gameDuration: settings.gameDuration || 60,
      minRestMinutes: settings.minRestMinutes || 60,
      dateStr: dateStr,
    }
    this.teamSchedule = new Map()
  }

  /**
   * Generate all available time slots for the given date in Pacific timezone
   * All times are stored as UTC but represent Pacific local time
   */
  private generateTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = []
    const [startHour, startMin] = this.settings.startTime.split(':').map(Number)
    const [endHour, endMin] = this.settings.endTime.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const slotDuration = this.settings.gameDuration

    // Parse the date string
    const [year, month, day] = this.settings.dateStr.split('-').map(Number)

    for (let minutes = startMinutes; minutes + slotDuration <= endMinutes; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60)
      const min = minutes % 60

      // Create a date representing this time in Pacific timezone
      // The Date constructor creates local time, then fromZonedTime converts Pacific -> UTC
      const pacificLocalDate = new Date(year, month - 1, day, hour, min, 0, 0)
      const start = fromZonedTime(pacificLocalDate, PACIFIC_TIMEZONE)

      const pacificLocalEndDate = new Date(year, month - 1, day, hour, min + slotDuration, 0, 0)
      const end = fromZonedTime(pacificLocalEndDate, PACIFIC_TIMEZONE)

      const label = this.formatTime(hour, min)
      slots.push({ start, end, label })
    }

    return slots
  }

  /**
   * Format time for display
   */
  private formatTime(hour: number, min: number): string {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const displayMin = min.toString().padStart(2, '0')
    return `${displayHour}:${displayMin} ${period}`
  }

  /**
   * Sort games by priority
   */
  private sortGamesByPriority(games: UnscheduledGame[]): UnscheduledGame[] {
    return [...games].sort((a, b) => {
      // First by game type priority (Tournament > Pool)
      const priorityA = GAME_TYPE_PRIORITY[a.gameType] || 0
      const priorityB = GAME_TYPE_PRIORITY[b.gameType] || 0
      if (priorityB !== priorityA) {
        return priorityB - priorityA
      }

      // Then by bracket round (earlier rounds first)
      if (a.bracketRound && b.bracketRound) {
        return parseInt(a.bracketRound) - parseInt(b.bracketRound)
      }

      // Then by bracket position
      if (a.bracketPosition !== undefined && b.bracketPosition !== undefined) {
        return (a.bracketPosition || 0) - (b.bracketPosition || 0)
      }

      return 0
    })
  }

  /**
   * Check if a team can play at a given time (respecting rest constraints)
   */
  private canTeamPlayAt(teamId: string, proposedStart: Date): boolean {
    const teamGames = this.teamSchedule.get(teamId) || []
    const minRestMs = this.settings.minRestMinutes * 60 * 1000
    const gameDurationMs = this.settings.gameDuration * 60 * 1000

    for (const existingStart of teamGames) {
      const existingEnd = new Date(existingStart.getTime() + gameDurationMs)
      const proposedEnd = new Date(proposedStart.getTime() + gameDurationMs)

      // Check for overlap
      if (proposedStart < existingEnd && proposedEnd > existingStart) {
        return false
      }

      // Check for minimum rest time
      const timeBetween = Math.abs(proposedStart.getTime() - existingEnd.getTime())
      const timeBetweenReverse = Math.abs(existingStart.getTime() - proposedEnd.getTime())

      if (timeBetween < minRestMs && timeBetweenReverse < minRestMs) {
        return false
      }
    }

    return true
  }

  /**
   * Record a scheduled game for a team
   */
  private recordTeamGame(teamId: string, startTime: Date): void {
    const existing = this.teamSchedule.get(teamId) || []
    existing.push(startTime)
    this.teamSchedule.set(teamId, existing)
  }

  /**
   * Run the scheduling algorithm
   */
  public schedule(): SchedulerResult {
    const timeSlots = this.generateTimeSlots()
    const sortedGames = this.sortGamesByPriority(this.games)

    // Create all available court-time slots
    const courtSlots: CourtSlot[] = []
    for (const court of this.courts) {
      for (const timeSlot of timeSlots) {
        courtSlots.push({
          court,
          timeSlot,
          isOccupied: false,
        })
      }
    }

    const scheduled: ProposedUpdate[] = []
    const unscheduled: Array<{ game: UnscheduledGame; reason: string }> = []

    // Greedy first-fit algorithm
    for (const game of sortedGames) {
      let placed = false
      let failureReason = 'No available time slots'

      // Try each court-time slot in order
      for (const slot of courtSlots) {
        if (slot.isOccupied) {
          continue
        }

        // Check team constraints
        const homeCanPlay = this.canTeamPlayAt(game.homeTeamId, slot.timeSlot.start)
        const awayCanPlay = this.canTeamPlayAt(game.awayTeamId, slot.timeSlot.start)

        if (!homeCanPlay) {
          failureReason = `${game.homeTeam.name} has a scheduling conflict or insufficient rest time`
          continue
        }

        if (!awayCanPlay) {
          failureReason = `${game.awayTeam.name} has a scheduling conflict or insufficient rest time`
          continue
        }

        // Place the game
        slot.isOccupied = true
        this.recordTeamGame(game.homeTeamId, slot.timeSlot.start)
        this.recordTeamGame(game.awayTeamId, slot.timeSlot.start)

        scheduled.push({
          gameId: game.id,
          courtId: slot.court.id,
          scheduledAt: slot.timeSlot.start,
          game,
          court: slot.court,
          timeSlot: slot.timeSlot.label,
        })

        placed = true
        break
      }

      if (!placed) {
        unscheduled.push({ game, reason: failureReason })
      }
    }

    // Calculate statistics
    const totalSlots = this.courts.length * timeSlots.length
    const usedSlots = scheduled.length
    const utilizationPercent = totalSlots > 0
      ? Math.round((usedSlots / totalSlots) * 100)
      : 0

    return {
      scheduled,
      unscheduled,
      stats: {
        totalGames: this.games.length,
        scheduledCount: scheduled.length,
        unscheduledCount: unscheduled.length,
        utilizationPercent,
      },
    }
  }
}
