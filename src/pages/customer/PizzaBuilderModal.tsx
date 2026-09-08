import { useMemo, useState } from 'react'
import { ChevronLeft, Check, Pizza as PizzaIcon } from 'lucide-react'
import clsx from 'clsx'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/format'
import { FREE_TOPPINGS_LIMIT } from '../../lib/types'
import type { MenuItem, ItemSize, Crust, Sauce, Topping, CartLine } from '../../lib/types'

interface PizzaBuilderModalProps {
  open: boolean
  onClose: () => void
  item: MenuItem
  sizes: ItemSize[]
  crusts: Crust[]
  sauces: Sauce[]
  toppings: Topping[]
  onAdd: (line: Omit<CartLine, 'lineId'>) => void
}

export function PizzaBuilderModal({
  open,
  onClose,
  item,
  sizes,
  crusts,
  sauces,
  toppings,
  onAdd,
}: PizzaBuilderModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [sizeId, setSizeId] = useState(sizes[0]?.id)
  const [crustId, setCrustId] = useState(crusts[0]?.id)
  const [sauceId, setSauceId] = useState(sauces[0]?.id)
  const [toppingIds, setToppingIds] = useState<string[]>([])

  const selectedSize = sizes.find((s) => s.id === sizeId) ?? sizes[0]
  const selectedCrust = crusts.find((c) => c.id === crustId) ?? crusts[0]
  const selectedSauce = sauces.find((s) => s.id === sauceId) ?? sauces[0]

  const selectedToppings = useMemo(
    () =>
      toppingIds
        .map((id) => toppings.find((t) => t.id === id))
        .filter((t): t is Topping => !!t)
        .map((t, i) => ({ ...t, free: i < FREE_TOPPINGS_LIMIT })),
    [toppingIds, toppings]
  )

  const total =
    (selectedSize?.price ?? 0) +
    (selectedCrust?.extra_price ?? 0) +
    (selectedSauce?.extra_price ?? 0) +
    selectedToppings.reduce((sum, t) => sum + (t.free ? 0 : t.price), 0)

  const freeRemaining = Math.max(0, FREE_TOPPINGS_LIMIT - toppingIds.length)

  function toggleTopping(id: string) {
    setToppingIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  function handleClose() {
    setStep(1)
    setToppingIds([])
    onClose()
  }

  function handleAdd() {
    if (!selectedSize || !selectedCrust || !selectedSauce) return
    onAdd({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      quantity: 1,
      unitPrice: total,
      size: { id: selectedSize.id, name: selectedSize.name, price: selectedSize.price },
      crust: {
        id: selectedCrust.id,
        name: selectedCrust.name,
        extraPrice: selectedCrust.extra_price,
      },
      sauce: {
        id: selectedSauce.id,
        name: selectedSauce.name,
        extraPrice: selectedSauce.extra_price,
      },
      toppings: selectedToppings.map((t) => ({ id: t.id, name: t.name, price: t.price, free: t.free })),
    })
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} widthClass="max-w-xl">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <span className="text-xs font-bold uppercase tracking-wide text-brand-500">
            Paso {step} de 2
          </span>
        </div>

        <div className="mb-5 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-600">
            <PizzaIcon size={30} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-ink-900">{item.name}</h2>
            {item.description && (
              <p className="mt-0.5 text-sm text-ink-400">{item.description}</p>
            )}
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2.5 text-sm font-bold text-ink-900">Tamaño</h3>
              <div className="grid grid-cols-4 gap-2">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSizeId(size.id)}
                    className={clsx(
                      'rounded-2xl border-2 px-2 py-3 text-center transition',
                      sizeId === size.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-ink-100 bg-white hover:border-brand-200'
                    )}
                  >
                    <div className="text-sm font-bold text-ink-900">{size.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-brand-500">
                      {formatCurrency(size.price)}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2.5 text-sm font-bold text-ink-900">Masa</h3>
              <div className="flex flex-wrap gap-2">
                {crusts.map((crust) => (
                  <button
                    key={crust.id}
                    onClick={() => setCrustId(crust.id)}
                    className={clsx(
                      'rounded-full border-2 px-4 py-2 text-sm font-semibold transition',
                      crustId === crust.id
                        ? 'border-brand-500 bg-brand-50 text-brand-600'
                        : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
                    )}
                  >
                    {crust.name}
                    {crust.extra_price > 0 && (
                      <span className="ml-1 text-xs text-ink-400">
                        +{formatCurrency(crust.extra_price)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2.5 text-sm font-bold text-ink-900">Salsa</h3>
              <div className="flex flex-wrap gap-2">
                {sauces.map((sauce) => (
                  <button
                    key={sauce.id}
                    onClick={() => setSauceId(sauce.id)}
                    className={clsx(
                      'rounded-full border-2 px-4 py-2 text-sm font-semibold transition',
                      sauceId === sauce.id
                        ? 'border-brand-500 bg-brand-50 text-brand-600'
                        : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
                    )}
                  >
                    {sauce.name}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink-900">Toppings</h3>
                <span className="text-xs font-semibold text-ink-400">
                  {freeRemaining > 0
                    ? `${freeRemaining} gratis restantes`
                    : `Extra +${formatCurrency(toppings[0]?.price ?? 0.55)} c/u`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {toppings.map((topping) => {
                  const active = toppingIds.includes(topping.id)
                  return (
                    <button
                      key={topping.id}
                      onClick={() => toggleTopping(topping.id)}
                      className={clsx(
                        'flex items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition',
                        active
                          ? 'border-brand-500 bg-brand-50 text-brand-600'
                          : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
                      )}
                    >
                      <span>{topping.name}</span>
                      {active ? (
                        <Check size={16} className="shrink-0" />
                      ) : (
                        <span className="shrink-0 text-[11px] font-medium text-ink-400">
                          +{formatCurrency(topping.price)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-ink-100 bg-cream-50 p-4">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {step === 1 ? (
            <Button fullWidth size="lg" onClick={() => setStep(2)} disabled={!selectedSize}>
              Siguiente · {formatCurrency(total)}
            </Button>
          ) : (
            <Button
              fullWidth
              size="lg"
              variant="dark"
              onClick={handleAdd}
              disabled={!selectedSauce}
            >
              Agregar al carrito · {formatCurrency(total)}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
