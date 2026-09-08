import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { useMenuData } from '../../hooks/useMenuData'
import { useCart } from '../../contexts/CartContext'
import { ItemThumb } from '../../components/ui/ItemThumb'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/format'
import { PizzaBuilderModal } from './PizzaBuilderModal'
import type { MenuItem } from '../../lib/types'
import clsx from 'clsx'

export function MenuPage() {
  const { categories, itemsByCategory, sizesByItem, crusts, sauces, toppings, loading, error } =
    useMenuData()
  const { addLine } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [builderItem, setBuilderItem] = useState<MenuItem | null>(null)

  const currentCategory = activeCategory ?? categories[0]?.id ?? null

  if (loading) {
    return <p className="py-16 text-center text-sm text-ink-400">Cargando el menú…</p>
  }

  if (error) {
    return (
      <p className="py-16 text-center text-sm text-danger-500">
        No pudimos cargar el menú: {error}
      </p>
    )
  }

  return (
    <div>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={clsx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              currentCategory === cat.id
                ? 'bg-brand-500 text-white shadow-card'
                : 'bg-white text-ink-600 hover:bg-brand-50'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(itemsByCategory.get(currentCategory ?? '') ?? []).map((item) => {
          const isBuilder = item.is_customizable_pizza
          const sizes = sizesByItem.get(item.id) ?? []
          const displayPrice = isBuilder ? (sizes[0]?.price ?? item.base_price) : item.base_price

          return (
            <div
              key={item.id}
              className={clsx(
                'flex items-center gap-3 rounded-3xl border p-3.5 transition',
                isBuilder
                  ? 'border-brand-300 bg-brand-50/60'
                  : 'border-ink-100/60 bg-white shadow-card'
              )}
            >
              <ItemThumb name={item.name} imageUrl={item.image_url} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {isBuilder && <Sparkles size={14} className="shrink-0 text-brand-500" />}
                  <h3 className="truncate text-sm font-bold text-ink-900">{item.name}</h3>
                </div>
                {item.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{item.description}</p>
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-brand-500">
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
                      className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-white hover:bg-brand-600"
                      aria-label={`Agregar ${item.name}`}
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

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
