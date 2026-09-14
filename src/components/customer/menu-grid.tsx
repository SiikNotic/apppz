'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { toast } from '@/components/ui/toast'
import { ProductCard } from './product-card'
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

  function quickAdd(item: MenuItem) {
    addLine({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      quantity: 1,
      unitPrice: item.base_price,
      toppings: [],
    })
    toast({ title: t('home.addedToCart', { name: item.name }), variant: 'success' })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          sizes={sizesByItem.get(item.id) ?? []}
          onQuickAdd={quickAdd}
          onOpenBuilder={setBuilderItem}
        />
      ))}

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
