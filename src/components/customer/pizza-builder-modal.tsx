'use client'

import { useState } from 'react'
import { ChevronLeft, Pizza as PizzaIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { usePizzaBuilder } from './use-pizza-builder'
import { SizePicker, CrustPicker, SaucePicker, ToppingPicker } from './pizza-option-pickers'
import type { MenuItem, ItemSize, Crust, Sauce, Topping, CartLine } from '@/lib/types'

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
  const builder = usePizzaBuilder(sizes, crusts, sauces, toppings)

  function handleClose() {
    setStep(1)
    builder.reset()
    onClose()
  }

  function handleAdd() {
    const line = builder.buildCartLine(item)
    if (!line) return
    onAdd(line)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-xl p-0">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                aria-label="Volver al paso anterior"
                className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            )}
            <span className="text-xs font-bold uppercase tracking-wide text-brand-500">
              Paso {step} de 2
            </span>
          </div>

          <div className="mb-5 flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-600">
              <PizzaIcon size={30} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-ink-900">{item.name}</DialogTitle>
              {item.description && <p className="mt-0.5 text-sm text-ink-400">{item.description}</p>}
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-6">
              <SizePicker sizes={sizes} value={builder.sizeId} onChange={builder.setSizeId} />
              <CrustPicker crusts={crusts} value={builder.crustId} onChange={builder.setCrustId} />
            </div>
          ) : (
            <div className="space-y-6">
              <SaucePicker sauces={sauces} value={builder.sauceId} onChange={builder.setSauceId} />
              <ToppingPicker
                toppings={toppings}
                selectedIds={builder.toppingIds}
                freeRemaining={builder.freeRemaining}
                onToggle={builder.toggleTopping}
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-ink-100 bg-cream-50 p-4">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            {step === 1 ? (
              <Button fullWidth size="lg" onClick={() => setStep(2)} disabled={!builder.selectedSize}>
                Siguiente · {formatCurrency(builder.total)}
              </Button>
            ) : (
              <Button fullWidth size="lg" variant="dark" onClick={handleAdd} disabled={!builder.selectedSauce}>
                Agregar al carrito · {formatCurrency(builder.total)}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
