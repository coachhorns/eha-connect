/**
 * Timezone utilities for Pacific Time (America/Los_Angeles)
 */
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz'

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
 * Safely parse a date string from the database or API response.
 * Handles the common off-by-one issue where date-only strings or midnight UTC
 * dates get shifted back a day in US timezones.
 *
 * For date-only strings like "2025-02-14", shifts to noon UTC so the date
 * lands on the correct calendar day in any US timezone.
 * For full ISO strings at midnight UTC (e.g. "2025-02-14T00:00:00.000Z"),
 * also shifts to noon UTC.
 * For ISO strings with non-midnight times, returns as-is.
 */
export function safeParseDate(dateStr: string | Date): Date {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return d

  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString()

  // Date-only string like "2025-02-14" — parsed as midnight UTC
  if (!str.includes('T') && !str.includes(' ')) {
    d.setUTCHours(12)
    return d
  }

  // ISO string at midnight UTC like "2025-02-14T00:00:00.000Z"
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    d.setUTCHours(12)
    return d
  }

  return d
}

/**
 * Format a date for display in Pacific timezone.
 * Uses safeParseDate internally to avoid off-by-one issues.
 */
export function formatDatePacific(dateStr: string | Date, fmt: string): string {
  const d = safeParseDate(dateStr)
  return formatTz(d, fmt, { timeZone: PACIFIC_TIMEZONE })
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
