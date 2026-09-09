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
  const [builderItem, setBuilderItem] = useState<MenuItem | null>(null)

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-400">{emptyMessage ?? 'No hay productos en esta categoría.'}</p>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const isBuilder = item.is_customizable_pizza
        const sizes = sizesByItem.get(item.id) ?? []
        const displayPrice = isBuilder ? (sizes[0]?.price ?? item.base_price) : item.base_price

        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 rounded-3xl border p-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-pop',
              isBuilder ? 'border-brand-300 bg-brand-50/60' : 'border-ink-100/60 bg-white shadow-card'
            )}
          >
            <Link href={`/product/${item.id}`} className="shrink-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
              <ItemThumb name={item.name} imageUrl={item.image_url} size="md" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${item.id}`} className="block">
                <div className="flex items-center gap-1.5">
                  {isBuilder && <Sparkles size={14} className="shrink-0 text-brand-900" aria-hidden="true" />}
                  <h3 className="truncate text-sm font-bold text-ink-900 hover:underline">{item.name}</h3>
                </div>
                {item.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{item.description}</p>
                )}
              </Link>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-sm font-extrabold text-brand-900">
                  {isBuilder ? 'Desde ' : ''}
                  {formatCurrency(displayPrice)}
                </span>
                {isBuilder ? (
                  <Button size="sm" onClick={() => setBuilderItem(item)}>
                    Crear ahora
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
                    className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-ink-900 transition active:scale-90 hover:bg-brand-600"
                    aria-label={`Agregar ${item.name} al carrito`}
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
