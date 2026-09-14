'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, Pizza as PizzaIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { toast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/format'
import { usePizzaBuilder } from './use-pizza-builder'
import { SizePicker, CrustPicker, SaucePicker, ToppingPicker } from './pizza-option-pickers'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MenuItem, ItemSize, Crust, Sauce, Topping, CartLine } from '@/lib/types'

// Overrides responsivos del Dialog compartido: en mobile se ve como una
// hoja casi de pantalla completa anclada abajo (una experiencia de
// producto dedicada, no un modal angosto encimado) — en sm+ vuelve al
// modal centrado normal, más ancho que el default (max-w-2xl) porque acá
// sí hay mucho contenido (tamaños, masa, salsa, toppings).
const CONTENT_CLASS = [
  'flex flex-col gap-0 p-0',
  // Mobile: hoja de abajo.
  'inset-x-0 bottom-0 top-auto left-0 w-full max-w-none translate-x-0 translate-y-0',
  'h-[92vh] max-h-[92vh] rounded-t-3xl rounded-b-none',
  // Desktop: modal centrado, más ancho que el default.
  'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2',
  'sm:h-auto sm:max-h-[88vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:rounded-2xl',
].join(' ')

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
  // Cantidad vive acá, no en usePizzaBuilder — mismo patrón que ya usa
  // product-detail-client.tsx: el hook calcula el precio POR PIEZA
  // (nunca duplicado en la UI, ver estimatePizzaPrice), la cantidad solo
  // multiplica ese resultado al mostrarlo y al mandarlo al carrito.
  const [quantity, setQuantity] = useState(1)
  const { t } = useLanguage()
  const builder = usePizzaBuilder(sizes, crusts, sauces, toppings, item.free_toppings_limit)

  function handleClose() {
    setStep(1)
    setQuantity(1)
    builder.reset()
    onClose()
  }

  function handleAdd() {
    const line = builder.buildCartLine(item)
    if (!line) return
    onAdd({ ...line, quantity })
    toast({ title: t('home.addedToCart', { name: item.name }), variant: 'success' })
    handleClose()
  }

  const grandTotal = builder.total * quantity

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent showCloseButton className={CONTENT_CLASS}>
        {/* Foto real del producto a todo el ancho — reemplaza el ícono
            genérico de antes. Sin foto, cae a un fondo plano con el
            ícono de pizza (nunca una imagen inventada). */}
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-surface-2 sm:aspect-[21/9]">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              unoptimized
              sizes="(min-width: 640px) 640px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-brand-400">
              <PizzaIcon size={48} strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                aria-label={t('product.backStep')}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-accent"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            )}
            <span className="text-xs font-bold uppercase tracking-wide text-brand-400">
              {t('product.stepOf', { step })}
            </span>
          </div>

          <DialogTitle className="text-h2 font-extrabold text-foreground">{item.name}</DialogTitle>
          {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
          <p className="mt-1.5 text-sm font-bold text-brand-400">
            {t('product.from')}
            {formatCurrency(item.base_price)}
          </p>

          {/* key={step} fuerza el remount al cambiar de paso, para que la
              animación de entrada corra cada vez — sutil, no una
              transición de página completa. */}
          <div key={step} className="mt-5 animate-in fade-in-0 slide-in-from-right-3 space-y-6 duration-200">
            {step === 1 ? (
              <>
                <SizePicker sizes={sizes} value={builder.sizeId} onChange={builder.setSizeId} />
                <CrustPicker crusts={crusts} value={builder.crustId} onChange={builder.setCrustId} />
              </>
            ) : (
              <>
                <SaucePicker sauces={sauces} value={builder.sauceId} onChange={builder.setSauceId} />
                <ToppingPicker
                  toppings={toppings}
                  selectedIds={builder.toppingIds}
                  freeRemaining={builder.freeRemaining}
                  onToggle={builder.toggleTopping}
                />
              </>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 mt-auto border-t border-border bg-card p-4">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <QuantityStepper value={quantity} onDecrease={() => setQuantity((q) => Math.max(1, q - 1))} onIncrease={() => setQuantity((q) => q + 1)} />
            {step === 1 ? (
              <Button fullWidth size="lg" onClick={() => setStep(2)} disabled={!builder.selectedSize}>
                {t('product.nextButton')} · {formatCurrency(grandTotal)}
              </Button>
            ) : (
              <Button fullWidth size="lg" onClick={handleAdd} disabled={!builder.selectedSauce}>
                {t('product.addToCartButton')} · {formatCurrency(grandTotal)}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
