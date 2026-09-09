import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface EmptyStateProps {
  /** Ícono de lucide-react ya instanciado, p.ej. `<Bike size={28} aria-hidden="true" />`. */
  icon: ReactNode
  message: string
  /** Botón opcional para resolver el estado vacío (p.ej. "Nuevo ingrediente"). */
  action?: ReactNode
  className?: string
}

/**
 * Estado vacío estándar — antes casi cada lista del dashboard mostraba un
 * simple `<p>Sin X todavía.</p>`, y solo un par de pantallas (Drivers,
 * Support) tenían el tratamiento con ícono + tarjeta. Se generaliza ese
 * segundo patrón, ya dark-mode-safe (usa tokens semánticos, no colores
 * fijos).
 */
export function EmptyState({ icon, message, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('flex flex-col items-center gap-3 p-10 text-center', className)}>
      <div className="text-muted-foreground/50">{icon}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </Card>
  )
}
