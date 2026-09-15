'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { toast } from '@/components/ui/toast'
import { VariantOptionList } from './variant-option-list'
import { formatCurrency } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MenuItem, MenuItemVariant, CartLine } from '@/lib/types'

// Mismo esqueleto responsivo que PizzaBuilderModal (hoja de abajo en
// mobile, modal centrado en sm+) — acá más angosto y sin altura fija
// porque el contenido es una sola lista corta, no un armador de varios
// pasos. Con muchas variantes, la lista scrollea dentro del propio
// DialogContent (ya trae overflow-y-auto de base) mientras la barra de
// cantidad + "Agregar" queda fija abajo (sticky).
const CONTENT_CLASS = [
  'flex flex-col gap-0 p-0',
  'inset-x-0 bottom-0 top-auto left-0 w-full max-w-none translate-x-0 translate-y-0',
  'max-h-[85vh] rounded-t-3xl rounded-b-none',
  'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2',
  'sm:h-auto sm:max-h-[80vh] sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-2xl',
].join(' ')

interface VariantPickerModalProps {
  open: boolean
  onClose: () => void
  item: MenuItem
  /** Variantes ACTIVAS del producto — Sesión 22. Este modal solo se abre
   *  cuando hay al menos una (ver ProductCard/MenuGrid), así que no
   *  contempla la lista vacía. */
  variants: MenuItemVariant[]
  onAdd: (line: Omit<CartLine, 'lineId'>) => void
}

/**
 * Selector de variante (marca/sabor) para productos simples con
 * `has_variants` — ej. "Soda en lata" → Pepsi/Coca-Cola/Sprite, cada una
 * con su propio precio absoluto (nunca un extra sobre el precio del
 * producto). Debe elegirse una variante antes de poder agregar al
 * carrito: el botón de abajo queda deshabilitado hasta entonces (mismo
 * criterio de "obligatorio antes de continuar" que el tamaño en el
 * armador de pizza).
 */
export function VariantPickerModal({ open, onClose, item, variants, onAdd }: VariantPickerModalProps) {
  const { t } = useLanguage()
  const [variantId, setVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const selected = variants.find((v) => v.id === variantId) ?? null

  function handleClose() {
    setVariantId(null)
    setQuantity(1)
    onClose()
  }

  function handleAdd() {
    if (!selected) return
    onAdd({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      quantity,
      unitPrice: selected.price,
      toppings: [],
      variant: { id: selected.id, name: selected.name, price: selected.price },
    })
    toast({ title: t('home.addedToCart', { name: item.name }), variant: 'success' })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent showCloseButton className={CONTENT_CLASS}>
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-surface-2 sm:hidden">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill unoptimized sizes="100vw" className="object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-brand-400">
              <Package size={40} strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <DialogTitle className="text-h2 font-extrabold text-foreground">{item.name}</DialogTitle>
          {/* La variante elegida queda bien visible arriba de la lista —
              tal como pide la tarea ("Soda en lata / Coca-Cola / $1.75"),
              no solo marcada dentro de la lista. */}
          {selected ? (
            <p className="mt-1 text-sm font-bold text-brand-400">
              {selected.name} · {formatCurrency(selected.price)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t('product.chooseFlavor')}</p>
          )}

          <div className="mt-4">
            <VariantOptionList variants={variants} value={variantId} onChange={setVariantId} ariaLabel={t('product.chooseFlavor')} />
          </div>
        </div>

        <div className="sticky bottom-0 mt-auto border-t border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <QuantityStepper
              value={quantity}
              onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
              onIncrease={() => setQuantity((q) => q + 1)}
            />
            <Button fullWidth size="lg" onClick={handleAdd} disabled={!selected}>
              {selected
                ? `${t('product.addToCartButton')} · ${formatCurrency(selected.price * quantity)}`
                : t('product.chooseFlavorPrompt')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
