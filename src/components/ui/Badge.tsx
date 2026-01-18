'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'orange' | 'gold'
  size?: 'sm' | 'md' | 'lg'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-eha-navy/50 text-eha-silver border border-eha-silver/30',
      success: 'bg-dark-surface text-green-400 border border-green-500/30',
      warning: 'bg-dark-surface text-yellow-400 border border-yellow-500/30',
      error: 'bg-dark-surface text-eha-red border border-eha-red/30',
      info: 'bg-dark-surface text-blue-400 border border-blue-500/30',
      orange: 'bg-dark-surface text-eha-red border border-eha-red/30',
      gold: 'bg-dark-surface text-[#FFD700] border border-[#FFD700]/30',
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-semibold rounded-full',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
