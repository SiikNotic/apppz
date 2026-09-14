import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface PriceDisplayProps {
  /** Precio final a cobrar — siempre el más prominente. */
  value: number
  /** Precio anterior a mostrar tachado (promoción/descuento activo). */
  originalValue?: number
  /** Prefijo tipo "Desde " para productos personalizables (armador de pizza). */
  prefix?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'text-sm font-bold',
  md: 'text-price font-extrabold',
  lg: 'text-h2 font-extrabold',
}

/**
 * El precio es uno de los elementos con más jerarquía visual del sistema
 * (spec: "Prices should be visually prominent") — se centraliza acá para
 * que cada tarjeta de producto, línea de carrito y resumen de checkout
 * pinte el número final igual y el tachado de "antes" (si hay promo) con
 * el mismo tratamiento en vez de que cada pantalla decida por su cuenta.
 */
export function PriceDisplay({ value, originalValue, prefix, size = 'md', className }: PriceDisplayProps) {
  const hasDiscount = originalValue != null && originalValue > value

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className={cn('text-foreground', sizeClasses[size])}>
        {prefix}
        {formatCurrency(value)}
      </span>
      {hasDiscount && (
        <span className="text-xs text-muted-foreground line-through">{formatCurrency(originalValue)}</span>
      )}
    </span>
  )
}
