'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/contexts/CartContext'
import { ItemThumb } from '@/components/ui/item-thumb'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
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
    return <p className="py-10 text-center text-sm text-ink-400">{emptyMessage ?? t('product.noProductsInCategory')}</p>
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
              'group flex flex-col overflow-hidden rounded-3xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98]',
              isBuilder ? 'border-brand-300 bg-brand-50/60' : 'border-ink-100/60 bg-white shadow-card'
            )}
          >
            <Link
              href={`/product/${item.id}`}
              className={cn(
                'relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-cream-100 to-brand-50 p-4 pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500',
                isBuilder && 'from-brand-100 to-brand-200'
              )}
            >
              {isBuilder && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-brand-900 shadow-sm">
                  <Sparkles size={11} aria-hidden="true" /> {t('menuMgmt.customizableBadge')}
                </span>
              )}
              <ItemThumb
                name={item.name}
                imageUrl={item.image_url}
                size="lg"
                className="transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
            <div className="flex flex-1 flex-col p-3">
              <Link href={`/product/${item.id}`} className="block">
                <h3 className="truncate text-sm font-bold text-ink-900 hover:underline">{item.name}</h3>
                {item.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{item.description}</p>
                )}
              </Link>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <span className="truncate text-sm font-extrabold text-brand-900">
                  {isBuilder ? t('product.from') : ''}
                  {formatCurrency(displayPrice)}
                </span>
                {isBuilder ? (
                  <Button size="sm" onClick={() => setBuilderItem(item)} className="shrink-0">
                    {t('product.createNow')}
                  </Button>
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
