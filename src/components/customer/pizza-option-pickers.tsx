'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { ItemSize, Crust, Sauce, Topping } from '@/lib/types'

export function SizePicker({
  sizes,
  value,
  onChange,
}: {
  sizes: ItemSize[]
  value?: string
  onChange: (id: string) => void
}) {
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-bold text-ink-900">Tamaño</h3>
      <div role="radiogroup" aria-label="Tamaño" className="grid grid-cols-4 gap-2">
        {sizes.map((size) => (
          <button
            key={size.id}
            role="radio"
            aria-checked={value === size.id}
            onClick={() => onChange(size.id)}
            className={cn(
              'rounded-2xl border-2 px-2 py-3 text-center transition',
              value === size.id ? 'border-brand-500 bg-brand-50' : 'border-ink-100 bg-white hover:border-brand-200'
            )}
          >
            <div className="text-sm font-bold text-ink-900">{size.name}</div>
            <div className="mt-0.5 text-xs font-semibold text-brand-900">{formatCurrency(size.price)}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

export function CrustPicker({
  crusts,
  value,
  onChange,
}: {
  crusts: Crust[]
  value?: string
  onChange: (id: string) => void
}) {
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-bold text-ink-900">Masa</h3>
      <div role="radiogroup" aria-label="Masa" className="flex flex-wrap gap-2">
        {crusts.map((crust) => (
          <button
            key={crust.id}
            role="radio"
            aria-checked={value === crust.id}
            onClick={() => onChange(crust.id)}
            className={cn(
              'rounded-full border-2 px-4 py-2 text-sm font-semibold transition',
              value === crust.id
                ? 'border-brand-500 bg-brand-50 text-brand-900'
                : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
            )}
          >
            {crust.name}
            {crust.extra_price > 0 && (
              <span className="ml-1 text-xs text-ink-400">+{formatCurrency(crust.extra_price)}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

export function SaucePicker({
  sauces,
  value,
  onChange,
}: {
  sauces: Sauce[]
  value?: string
  onChange: (id: string) => void
}) {
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-bold text-ink-900">Salsa</h3>
      <div role="radiogroup" aria-label="Salsa" className="flex flex-wrap gap-2">
        {sauces.map((sauce) => (
          <button
            key={sauce.id}
            role="radio"
            aria-checked={value === sauce.id}
            onClick={() => onChange(sauce.id)}
            className={cn(
              'rounded-full border-2 px-4 py-2 text-sm font-semibold transition',
              value === sauce.id
                ? 'border-brand-500 bg-brand-50 text-brand-900'
                : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
            )}
          >
            {sauce.name}
          </button>
        ))}
      </div>
    </section>
  )
}

export function ToppingPicker({
  toppings,
  selectedIds,
  freeRemaining,
  onToggle,
}: {
  toppings: Topping[]
  selectedIds: string[]
  freeRemaining: number
  onToggle: (id: string) => void
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900">Toppings</h3>
        <span className="text-xs font-semibold text-ink-400">
          {freeRemaining > 0 ? `${freeRemaining} gratis restantes` : `Extra +${formatCurrency(toppings[0]?.price ?? 0.55)} c/u`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {toppings.map((topping) => {
          const active = selectedIds.includes(topping.id)
          return (
            <button
              key={topping.id}
              aria-pressed={active}
              onClick={() => onToggle(topping.id)}
              className={cn(
                'flex items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition',
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-900'
                  : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
              )}
            >
              <span>{topping.name}</span>
              {active ? (
                <Check size={16} className="shrink-0" aria-hidden="true" />
              ) : (
                <span className="shrink-0 text-[11px] font-medium text-ink-400">+{formatCurrency(topping.price)}</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
