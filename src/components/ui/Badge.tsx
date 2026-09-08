import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral'

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-green-50 text-success-500',
  warning: 'bg-amber-50 text-warning-500',
  danger: 'bg-red-50 text-danger-500',
  neutral: 'bg-ink-50 text-ink-600',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  )
}
