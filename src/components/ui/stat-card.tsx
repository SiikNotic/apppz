import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string
  icon: ReactNode
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'highlight'
  hint?: string
  /** Variación porcentual vs. un período anterior (ej. semana pasada).
   *  Positivo se pinta en verde con flecha arriba, negativo en rojo con
   *  flecha abajo — sobre la tarjeta "highlight" se pinta en blanco. */
  trend?: { pct: number; label: string }
}

const toneClasses = {
  brand: 'bg-brand-50 text-brand-900 dark:bg-brand-500/20 dark:text-brand-300',
  success: 'bg-green-50 text-success-500 dark:bg-success-500/15',
  warning: 'bg-amber-50 text-warning-500 dark:bg-warning-500/15',
  danger: 'bg-red-50 text-danger-500 dark:bg-danger-500/15',
  highlight: 'bg-white/20 text-white',
}

export function StatCard({ label, value, icon, tone = 'brand', hint, trend }: StatCardProps) {
  const highlight = tone === 'highlight'
  const positive = (trend?.pct ?? 0) >= 0

  return (
    <Card className={cn('p-5', highlight && 'border-transparent bg-brand-500 text-white shadow-pop')}>
      <div className="flex items-start justify-between">
        <div>
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              highlight ? 'text-white/80' : 'text-muted-foreground'
            )}
          >
            {label}
          </p>
          <p className={cn('mt-1.5 text-2xl font-extrabold', highlight ? 'text-white' : 'text-foreground')}>
            {value}
          </p>
          {hint && <p className={cn('mt-1 text-xs', highlight ? 'text-white/80' : 'text-muted-foreground')}>{hint}</p>}
          {trend && (
            <p
              className={cn(
                'mt-1.5 flex items-center gap-1 text-xs font-bold',
                highlight ? 'text-white' : positive ? 'text-success-500' : 'text-danger-500'
              )}
            >
              {positive ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
              {trend.label}
            </p>
          )}
        </div>
        <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', toneClasses[tone])}>{icon}</div>
      </div>
    </Card>
  )
}
