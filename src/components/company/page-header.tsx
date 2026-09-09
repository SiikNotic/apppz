import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  /** Casi siempre texto, pero algunas páginas necesitan un <code> o un
   *  <Link> dentro (p.ej. Configuración) — por eso ReactNode y no string. */
  subtitle?: ReactNode
  /** Botón(es) de acción principal, alineados a la derecha del título. */
  actions?: ReactNode
  className?: string
}

/**
 * Encabezado estándar de cada página del dashboard — antes cada pantalla
 * repetía a mano el mismo `<div className="flex items-center
 * justify-between">` con `<h1>`/`<p>`/botón. Un solo componente para que
 * el espaciado, la tipografía y el wrap en mobile sean consistentes en
 * las ~16 páginas de /company.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
