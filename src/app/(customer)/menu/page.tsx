'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useMenuData } from '@/hooks/useMenuData'
import { MenuGrid } from '@/components/customer/menu-grid'
import { MenuSkeleton } from '@/components/customer/menu-skeleton'

export default function MenuPage() {
  const { categories, itemsByCategory, sizesByItem, crusts, sauces, toppings, loading, error } = useMenuData()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const currentCategory = activeCategory ?? categories[0]?.id ?? null

  if (loading) return <MenuSkeleton />
  if (error) return <p className="py-16 text-center text-sm text-danger-500">No pudimos cargar el menú: {error}</p>

  return (
    <div>
      <h1 className="sr-only">Menú completo</h1>
      <div role="tablist" aria-label="Categorías" className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={currentCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              currentCategory === cat.id ? 'bg-brand-500 text-white shadow-card' : 'bg-white text-ink-600 hover:bg-brand-50'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <MenuGrid
        items={itemsByCategory.get(currentCategory ?? '') ?? []}
        sizesByItem={sizesByItem}
        crusts={crusts}
        sauces={sauces}
        toppings={toppings}
      />
    </div>
  )
}
