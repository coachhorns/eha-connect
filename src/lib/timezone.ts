/**
 * Timezone utilities for Pacific Time (America/Los_Angeles)
 */
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export const PACIFIC_TIMEZONE = 'America/Los_Angeles'

/**
 * Parse a date string (YYYY-MM-DD) and time string (HH:mm) into a Date object
 * representing that time in Pacific timezone
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:mm format (e.g., "08:00")
 * @returns Date object representing the specified time in Pacific timezone (stored as UTC)
 */
export function parsePacificDateTime(dateStr: string, timeStr: string): Date {
  // Create a date string that represents the local time in Pacific
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Create a Date object representing this time in Pacific timezone
  // This will be converted to UTC internally
  const pacificDate = new Date(year, month - 1, day, hour, minute, 0, 0)

  // Use fromZonedTime to convert from Pacific local time to UTC
  return fromZonedTime(pacificDate, PACIFIC_TIMEZONE)
}

/**
 * Get the start of day in Pacific timezone as a UTC Date
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @returns Date object representing 00:00:00 Pacific time
 */
export function getStartOfDayPacific(dateStr: string): Date {
  return parsePacificDateTime(dateStr, '00:00')
}

/**
 * Get the end of day in Pacific timezone as a UTC Date
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @returns Date object representing 23:59:59.999 Pacific time
 */
export function getEndOfDayPacific(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const pacificDate = new Date(year, month - 1, day, 23, 59, 59, 999)
  return fromZonedTime(pacificDate, PACIFIC_TIMEZONE)
}

/**
 * Convert a UTC Date to Pacific timezone Date for display
 *
 * @param date - UTC Date object
 * @returns Date object representing the same instant in Pacific timezone
 */
export function toPacificTime(date: Date): Date {
  return toZonedTime(date, PACIFIC_TIMEZONE)
}

/**
 * Format a time in Pacific timezone for display
 *
 * @param date - UTC Date object
 * @returns Formatted time string (e.g., "8:00 AM")
 */
export function formatPacificTime(date: Date): string {
  const pacific = toZonedTime(date, PACIFIC_TIMEZONE)
  const hour = pacific.getHours()
  const minute = pacific.getMinutes()
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const displayMin = minute.toString().padStart(2, '0')
  return `${displayHour}:${displayMin} ${period}`
}

/**
 * Create a Pacific timezone date from year, month, day, hour, minute
 * Returns a Date object in UTC that represents the given Pacific time
 */
export function createPacificDate(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  const pacificDate = new Date(year, month - 1, day, hour, minute, second, 0)
  return fromZonedTime(pacificDate, PACIFIC_TIMEZONE)
}
