'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { ItemThumb } from '@/components/ui/item-thumb'
import { useLanguage } from '@/contexts/LanguageContext'
import type { ItemSize, Crust, Sauce, Topping } from '@/lib/types'

/** "10"" si hay pulgadas, si no "25 cm" si hay centímetros, si no nada —
 * la dimensión es opcional y configurable por el negocio, nunca inventada. */
function sizeDimensionLabel(size: ItemSize): string | null {
  if (size.size_inches != null) return `${size.size_inches}"`
  if (size.size_cm != null) return `${size.size_cm} cm`
  return null
}

// Mismo tratamiento de "seleccionable" en las cuatro listas de abajo:
// borde + fondo translúcido de marca cuando está elegido, superficie
// plana cuando no — nada de pasteles claros (rompían sobre el fondo
// oscuro nuevo) ni sombras extra por encima de la tarjeta.
const OPTION_BASE =
  'rounded-2xl border-2 text-center transition active:scale-[0.97]'
const OPTION_SELECTED = 'border-brand-500 bg-brand-500/10 text-foreground'
const OPTION_IDLE = 'border-border bg-card text-muted-foreground hover:border-border-strong'

export function SizePicker({
  sizes,
  value,
  onChange,
}: {
  sizes: ItemSize[]
  value?: string
  onChange: (id: string) => void
}) {
  const { t } = useLanguage()
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-bold text-foreground">{t('product.size')}</h3>
      <div role="radiogroup" aria-label={t('product.size')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sizes.map((size) => {
          const dimension = sizeDimensionLabel(size)
          const selected = value === size.id
          return (
            <button
              key={size.id}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(size.id)}
              className={cn(OPTION_BASE, 'px-2 py-3', selected ? OPTION_SELECTED : OPTION_IDLE)}
            >
              <div className="text-sm font-bold text-foreground">{size.name}</div>
              {dimension && <div className="mt-0.5 text-xs text-muted-foreground">{dimension}</div>}
              <div className="mt-0.5 text-xs font-semibold text-brand-400">{formatCurrency(size.price)}</div>
            </button>
          )
        })}
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
  const { t } = useLanguage()
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-bold text-foreground">{t('product.crustLabel')}</h3>
      <div role="radiogroup" aria-label={t('product.crustLabel')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {crusts.map((crust) => {
          const selected = value === crust.id
          return (
            <button
              key={crust.id}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(crust.id)}
              className={cn(OPTION_BASE, 'flex flex-col items-center gap-1.5 p-3', selected ? OPTION_SELECTED : OPTION_IDLE)}
            >
              <ItemThumb name={crust.name} imageUrl={crust.image_url} size="sm" />
              <span className="text-sm font-semibold">{crust.name}</span>
              {crust.extra_price > 0 && (
                <span className="text-xs text-muted-foreground">+{formatCurrency(crust.extra_price)}</span>
              )}
            </button>
          )
        })}
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
  const { t } = useLanguage()
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-bold text-foreground">{t('product.sauceLabel')}</h3>
      <div role="radiogroup" aria-label={t('product.sauceLabel')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sauces.map((sauce) => {
          const selected = value === sauce.id
          return (
            <button
              key={sauce.id}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(sauce.id)}
              className={cn(OPTION_BASE, 'flex flex-col items-center gap-1.5 p-3', selected ? OPTION_SELECTED : OPTION_IDLE)}
            >
              <ItemThumb name={sauce.name} imageUrl={sauce.image_url} size="sm" />
              <span className="text-sm font-semibold">{sauce.name}</span>
            </button>
          )
        })}
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
  const { t } = useLanguage()
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{t('product.toppingsLabel')}</h3>
        <span className="text-xs font-semibold text-muted-foreground">
          {freeRemaining > 0
            ? t('product.freeRemaining', { count: freeRemaining })
            : t('product.extraEach', { price: formatCurrency(toppings[0]?.price ?? 0.55) })}
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
                OPTION_BASE,
                'flex items-center gap-2.5 p-2.5 text-left',
                active ? OPTION_SELECTED : OPTION_IDLE
              )}
            >
              <ItemThumb name={topping.name} imageUrl={topping.image_url} size="sm" className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{topping.name}</span>
                <span className="block text-xs text-muted-foreground">+{formatCurrency(topping.price)}</span>
              </span>
              {active && <Check size={16} className="shrink-0 text-brand-400" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
