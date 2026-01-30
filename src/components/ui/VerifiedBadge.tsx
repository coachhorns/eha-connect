'use client'

import { ShieldCheck } from 'lucide-react'

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function VerifiedBadge({ size = 'sm', showLabel = false, className = '' }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const iconSize = sizeClasses[size]

  return (
    <span
      className={`inline-flex items-center gap-1 text-blue-500 ${className}`}
      title="Verified Athlete"
    >
      <ShieldCheck className={`${iconSize} fill-blue-500/20`} />
      {showLabel && (
        <span className="text-xs font-medium text-blue-500">Verified</span>
      )}
    </span>
  )
}
