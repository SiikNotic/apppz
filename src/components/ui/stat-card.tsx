import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string
  icon: ReactNode
  tone?: 'brand' | 'success' | 'warning' | 'danger'
  hint?: string
}

const toneClasses = {
  brand: 'bg-brand-50 text-brand-900',
  success: 'bg-green-50 text-success-500',
  warning: 'bg-amber-50 text-warning-500',
  danger: 'bg-red-50 text-danger-500',
}

export function StatCard({ label, value, icon, tone = 'brand', hint }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
        </div>
        <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', toneClasses[tone])}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
