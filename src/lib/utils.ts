import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHeight(feet?: number | null, inches?: number | null): string {
  if (!feet) return '-'
  return `${feet}'${inches || 0}"`
}

export function formatPosition(position?: string | null): string {
  const positions: Record<string, string> = {
    PG: 'Point Guard',
    SG: 'Shooting Guard',
    SF: 'Small Forward',
    PF: 'Power Forward',
    C: 'Center',
  }
  return position ? positions[position] || position : '-'
}

export function formatPositionShort(position?: string | null): string {
  return position || '-'
}

export function formatGraduationYear(year?: number | null): string {
  if (!year) return '-'
  return `Class of ${year}`
}

export function generateSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base
}

export function calculateAge(dateOfBirth?: Date | null): number | null {
  if (!dateOfBirth) return null
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function formatStatValue(value: number, decimals: number = 1): string {
  if (decimals === 0) return Math.round(value).toString()
  return value.toFixed(decimals)
}

export function calculatePercentage(made: number, attempted: number): string {
  if (attempted === 0) return '-'
  return ((made / attempted) * 100).toFixed(1) + '%'
}

export function getGradeFromYear(graduationYear: number): number {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  // Assume school year starts in August
  const schoolYear = currentMonth >= 7 ? currentYear : currentYear - 1
  const yearsUntilGraduation = graduationYear - schoolYear - 1
  const grade = 12 - yearsUntilGraduation

  return Math.max(6, Math.min(12, grade))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatGameTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
