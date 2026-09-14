'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/contexts/CartContext'
import { ItemThumb } from '@/components/ui/item-thumb'
import { PriceDisplay } from '@/components/ui/price'
import { PizzaBuilderModal } from './pizza-builder-modal'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MenuItem, ItemSize, Crust, Sauce, Topping } from '@/lib/types'

interface MenuGridProps {
  items: MenuItem[]
  sizesByItem: Map<string, ItemSize[]>
  crusts: Crust[]
  sauces: Sauce[]
  toppings: Topping[]
  emptyMessage?: string
}

export function MenuGrid({ items, sizesByItem, crusts, sauces, toppings, emptyMessage }: MenuGridProps) {
  const { addLine } = useCart()
  const { t } = useLanguage()
  const [builderItem, setBuilderItem] = useState<MenuItem | null>(null)

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage ?? t('product.noProductsInCategory')}</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const isBuilder = item.is_customizable_pizza
        const sizes = sizesByItem.get(item.id) ?? []
        const displayPrice = isBuilder ? (sizes[0]?.price ?? item.base_price) : item.base_price

        return (
          <div
            key={item.id}
            className={cn(
              // rounded-2xl (no 3xl) + borde sutil: mismo lenguaje que
              // Card (ui/card.tsx), pero definido acá en vez de reusar el
              // componente porque esta tarjeta necesita que la imagen
              // llegue hasta el borde (Card siempre trae padding interno).
              'group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98]',
              isBuilder && 'ring-1 ring-brand-500/30'
            )}
          >
            {/* Foto a toda la celda, proporción fija (aspect-square) para
                que la grilla nunca desalinee entre productos con y sin
                foto real — el ícono de respaldo (sin foto) usa el mismo
                contenedor en vez de un tamaño distinto. */}
            <Link
              href={`/product/${item.id}`}
              className="group/img relative block aspect-square w-full overflow-hidden bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <ItemThumb name={item.name} imageUrl={null} size="lg" />
                </div>
              )}
              {isBuilder && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                  <Sparkles size={11} aria-hidden="true" /> {t('menuMgmt.customizableBadge')}
                </span>
              )}
            </Link>
            <div className="flex flex-1 flex-col p-3">
              <Link href={`/product/${item.id}`} className="block">
                <h3 className="truncate text-sm font-bold text-foreground hover:underline">{item.name}</h3>
                {item.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                )}
              </Link>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <PriceDisplay value={displayPrice} prefix={isBuilder ? t('product.from') : undefined} size="sm" />
                {isBuilder ? (
                  <button
                    onClick={() => setBuilderItem(item)}
                    className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition active:scale-90 hover:bg-brand-600"
                  >
                    {t('product.createNow')}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      addLine({
                        menuItemId: item.id,
                        name: item.name,
                        imageUrl: item.image_url,
                        quantity: 1,
                        unitPrice: item.base_price,
                        toppings: [],
                      })
                    }
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition active:scale-90 hover:bg-brand-600"
                    aria-label={t('product.addToCartAria', { name: item.name })}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {builderItem && (
        <PizzaBuilderModal
          open={!!builderItem}
          onClose={() => setBuilderItem(null)}
          item={builderItem}
          sizes={sizesByItem.get(builderItem.id) ?? []}
          crusts={crusts}
          sauces={sauces}
          toppings={toppings}
          onAdd={addLine}
        />
      )}
    </div>
  )
}
