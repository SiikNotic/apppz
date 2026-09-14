import { cn } from '@/lib/utils'

/**
 * Placeholder de carga genérico — antes cada pantalla armaba a mano sus
 * propios `div animate-pulse rounded-* bg-ink-100` (ver menu-skeleton.tsx,
 * que sigue existiendo para su composición específica). Este es el
 * bloque base para nuevas pantallas: un solo lugar donde ajustar el tono
 * y la animación de "cargando" del sistema de diseño.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}
