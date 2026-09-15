'use client'

import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { ItemThumb } from '@/components/ui/item-thumb'
import { useLanguage } from '@/contexts/LanguageContext'
import type { ItemSize, Crust, Sauce, Topping, ToppingQuantityLevel } from '@/lib/types'

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

const QUANTITY_LEVELS: ToppingQuantityLevel[] = ['little', 'normal', 'extra']
const QUANTITY_LEVEL_LABEL_KEY: Record<ToppingQuantityLevel, string> = {
  little: 'product.quantityLittle',
  normal: 'product.quantityNormal',
  extra: 'product.quantityExtra',
}

/**
 * Segmentado compacto Poco/Normal/Extra — Sesión 21. Solo aparece DEBAJO
 * de un topping o de la salsa YA seleccionados (nunca como un toggle
 * suelto en la lista, eso es justo lo que se pidió evitar). "Extra" solo
 * muestra su cargo cuando ese cargo es mayor a 0 — un topping sin cargo
 * extra configurado igual deja elegir "Extra" (suma $0.00), pero no
 * ensucia el botón con un "+$0.00" que no aporta nada.
 */
function QuantityLevelSelector({
  level,
  extraCharge,
  onChange,
}: {
  level: ToppingQuantityLevel
  extraCharge: number
  onChange: (level: ToppingQuantityLevel) => void
}) {
  const { t } = useLanguage()
  return (
    <div
      role="radiogroup"
      aria-label={t('product.quantityLevelLabel')}
      className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
    >
      {QUANTITY_LEVELS.map((lvl) => {
        const active = level === lvl
        const label = t(QUANTITY_LEVEL_LABEL_KEY[lvl])
        return (
          <button
            key={lvl}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => {
              e.stopPropagation()
              onChange(lvl)
            }}
            className={cn(
              'rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition active:scale-[0.97]',
              active ? 'bg-brand-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {lvl === 'extra' && extraCharge > 0 ? `${label} +${formatCurrency(extraCharge)}` : label}
          </button>
        )
      })}
    </div>
  )
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
  quantityLevel,
  onChange,
  onQuantityChange,
}: {
  sauces: Sauce[]
  value?: string
  quantityLevel: ToppingQuantityLevel
  onChange: (id: string) => void
  onQuantityChange: (level: ToppingQuantityLevel) => void
}) {
  const { t } = useLanguage()
  const selectedSauce = sauces.find((s) => s.id === value)
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

      {/* Selector de cantidad de la salsa YA elegida — mismo patrón que
          cada topping seleccionado (ver ToppingPicker más abajo): solo se
          muestra una vez que hay una salsa activa, nunca suelto en la
          grilla de arriba. */}
      {selectedSauce && (
        <div className="mt-2.5 space-y-2 rounded-2xl border-2 border-brand-500 bg-brand-500/10 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{selectedSauce.name}</span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-brand-400">
              <Check size={14} aria-hidden="true" /> {t('product.selected')}
            </span>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t('product.quantityLevelLabel')}
            </p>
            <QuantityLevelSelector
              level={quantityLevel}
              extraCharge={selectedSauce.extra_charge}
              onChange={onQuantityChange}
            />
          </div>
        </div>
      )}
    </section>
  )
}

export function ToppingPicker({
  toppings,
  selectedIds,
  levels,
  freeRemaining,
  onToggle,
  onLevelChange,
}: {
  toppings: Topping[]
  selectedIds: string[]
  levels: Record<string, ToppingQuantityLevel>
  freeRemaining: number
  onToggle: (id: string) => void
  onLevelChange: (id: string, level: ToppingQuantityLevel) => void
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
      {/* Lista apilada (no grilla) a propósito: cada topping seleccionado
          revela su selector de cantidad justo debajo, en su propia fila —
          una grilla de columnas haría que esa fila extra empujara de
          forma rara a las tarjetas vecinas de la misma línea. */}
      <div className="space-y-2">
        {toppings.map((topping) => {
          const active = selectedIds.includes(topping.id)
          return (
            <div key={topping.id} className={cn(OPTION_BASE, active ? OPTION_SELECTED : OPTION_IDLE)}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(topping.id)}
                className="flex w-full items-center gap-2.5 p-2.5 text-left"
              >
                <ItemThumb name={topping.name} imageUrl={topping.image_url} size="sm" className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{topping.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {active ? t('product.selected') : `+${formatCurrency(topping.price)}`}
                  </span>
                </span>
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full',
                    active ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground'
                  )}
                  aria-hidden="true"
                >
                  {active ? <Check size={14} /> : <Plus size={14} />}
                </span>
              </button>
              {/* Selector de cantidad — aparece SOLO tras seleccionar el
                  topping, nunca como un toggle Normal/Extra suelto en la
                  lista (eso es justo lo que se pidió evitar). Fuera del
                  <button> de arriba (son hermanos, no anidados) para no
                  meter un <button> dentro de otro <button>. */}
              {active && (
                <div className="px-2.5 pb-2.5">
                  <QuantityLevelSelector
                    level={levels[topping.id] ?? 'normal'}
                    extraCharge={topping.extra_charge}
                    onChange={(level) => onLevelChange(topping.id, level)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
