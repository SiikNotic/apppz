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
      <h3 className="mb-2.5 text-sm font-bold text-ink-900">{t('product.size')}</h3>
      <div role="radiogroup" aria-label={t('product.size')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sizes.map((size) => {
          const dimension = sizeDimensionLabel(size)
          return (
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
              {dimension && <div className="mt-0.5 text-xs text-ink-400">{dimension}</div>}
              <div className="mt-0.5 text-xs font-semibold text-brand-900">{formatCurrency(size.price)}</div>
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
      <h3 className="mb-2.5 text-sm font-bold text-ink-900">{t('product.crustLabel')}</h3>
      <div role="radiogroup" aria-label={t('product.crustLabel')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {crusts.map((crust) => (
          <button
            key={crust.id}
            role="radio"
            aria-checked={value === crust.id}
            onClick={() => onChange(crust.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition',
              value === crust.id
                ? 'border-brand-500 bg-brand-50 text-brand-900'
                : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
            )}
          >
            <ItemThumb name={crust.name} imageUrl={crust.image_url} size="sm" />
            <span className="text-sm font-semibold">{crust.name}</span>
            {crust.extra_price > 0 && (
              <span className="text-xs text-ink-400">+{formatCurrency(crust.extra_price)}</span>
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
  const { t } = useLanguage()
  return (
    <section>
      <h3 className="mb-2.5 text-sm font-bold text-ink-900">{t('product.sauceLabel')}</h3>
      <div role="radiogroup" aria-label={t('product.sauceLabel')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sauces.map((sauce) => (
          <button
            key={sauce.id}
            role="radio"
            aria-checked={value === sauce.id}
            onClick={() => onChange(sauce.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition',
              value === sauce.id
                ? 'border-brand-500 bg-brand-50 text-brand-900'
                : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
            )}
          >
            <ItemThumb name={sauce.name} imageUrl={sauce.image_url} size="sm" />
            <span className="text-sm font-semibold">{sauce.name}</span>
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
  const { t } = useLanguage()
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900">{t('product.toppingsLabel')}</h3>
        <span className="text-xs font-semibold text-ink-400">
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
                'flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition',
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-900'
                  : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
              )}
            >
              <ItemThumb name={topping.name} imageUrl={topping.image_url} size="sm" className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{topping.name}</span>
                <span className="block text-xs text-ink-400">+{formatCurrency(topping.price)}</span>
              </span>
              {active && <Check size={16} className="shrink-0" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
