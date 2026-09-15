'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { toast } from '@/components/ui/toast'
import { ProductCard } from './product-card'
import { PizzaBuilderModal } from './pizza-builder-modal'
import { VariantPickerModal } from './variant-picker-modal'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MenuItem, ItemSize, Crust, Sauce, Topping, MenuItemVariant } from '@/lib/types'

interface MenuGridProps {
  items: MenuItem[]
  sizesByItem: Map<string, ItemSize[]>
  variantsByItem: Map<string, MenuItemVariant[]>
  crusts: Crust[]
  sauces: Sauce[]
  toppings: Topping[]
  emptyMessage?: string
}

export function MenuGrid({ items, sizesByItem, variantsByItem, crusts, sauces, toppings, emptyMessage }: MenuGridProps) {
  const { addLine } = useCart()
  const { t } = useLanguage()
  const [builderItem, setBuilderItem] = useState<MenuItem | null>(null)
  const [variantItem, setVariantItem] = useState<MenuItem | null>(null)

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
          variants={variantsByItem.get(item.id) ?? []}
          onQuickAdd={quickAdd}
          onOpenBuilder={setBuilderItem}
          onOpenVariantPicker={setVariantItem}
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

      {variantItem && (
        <VariantPickerModal
          open={!!variantItem}
          onClose={() => setVariantItem(null)}
          item={variantItem}
          variants={variantsByItem.get(variantItem.id) ?? []}
          onAdd={addLine}
        />
      )}
    </div>
  )
}
