'use client'

import { Check } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MenuItemVariant } from '@/lib/types'

/**
 * Lista de variantes (marca/sabor) con precio propio — Sesión 22.
 * Compartida entre VariantPickerModal (menú/carril) y la página de
 * detalle de producto, que necesitan exactamente el mismo selector con
 * distinto contenedor alrededor. Lista apilada (no grilla): nombres como
 * "Dr Pepper" + precio alineado a la derecha no caben bien en columnas
 * angostas, y una lista vertical scrollea sin problema con muchas
 * variantes (a diferencia de una grilla, que se vería irregular).
 */
export function VariantOptionList({
  variants,
  value,
  onChange,
  ariaLabel,
}: {
  variants: MenuItemVariant[]
  value: string | null
  onChange: (id: string) => void
  ariaLabel?: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="space-y-2">
      {variants.map((variant) => {
        const active = variant.id === value
        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(variant.id)}
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3.5 text-left transition active:scale-[0.98]',
              active ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-card hover:border-border-strong'
            )}
          >
            <span className="truncate text-sm font-semibold text-foreground">{variant.name}</span>
            <span className="flex shrink-0 items-center gap-2.5">
              <span className="text-sm font-bold text-brand-400">{formatCurrency(variant.price)}</span>
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                  active ? 'border-brand-500 bg-brand-500' : 'border-border-strong'
                )}
                aria-hidden="true"
              >
                {active && <Check size={12} className="text-white" />}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
