import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  onDecrease: () => void
  onIncrease: () => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
  decreaseLabel?: string
  increaseLabel?: string
  className?: string
}

/**
 * Control +/- reutilizable (carrito, línea de pedido, armador de pizza).
 * Objetivo táctil cómodo por defecto (--control-h-sm = 36px cumple el
 * mínimo de 24px de WCAG con margen de sobra); el botón se deshabilita
 * en vez de ocultarse al tocar min/max, para que el layout no salte.
 */
export function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  min = 1,
  max = 99,
  size = 'md',
  decreaseLabel = 'Quitar uno',
  increaseLabel = 'Agregar uno',
  className,
}: QuantityStepperProps) {
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-card p-1',
        className
      )}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={value <= min}
        aria-label={decreaseLabel}
        className={cn(
          'grid shrink-0 place-items-center rounded-full text-foreground transition active:scale-90 disabled:pointer-events-none disabled:opacity-30 hover:bg-accent',
          buttonSize
        )}
      >
        <Minus size={size === 'sm' ? 13 : 15} aria-hidden="true" />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-bold text-foreground tabular-nums">{value}</span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={value >= max}
        aria-label={increaseLabel}
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-90 disabled:pointer-events-none disabled:opacity-30 hover:bg-brand-600',
          buttonSize
        )}
      >
        <Plus size={size === 'sm' ? 13 : 15} aria-hidden="true" />
      </button>
    </div>
  )
}
