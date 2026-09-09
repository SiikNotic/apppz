'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Truck, Store, MapPin } from 'lucide-react'
import { useMenuData } from '@/hooks/useMenuData'
import { MenuGrid } from '@/components/customer/menu-grid'
import { MenuSkeleton } from '@/components/customer/menu-skeleton'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { BRAND_TAGLINE } from '@/lib/config'

export default function HomePage() {
  const { categories, itemsByCategory, sizesByItem, crusts, sauces, toppings, loading, error } = useMenuData()
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [search, setSearch] = useState('')

  const allItems = useMemo(() => Array.from(itemsByCategory.values()).flat(), [itemsByCategory])

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return allItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
    )
  }, [search, allItems])

  const popular = useMemo(() => allItems.slice(0, 4), [allItems])

  if (loading) return <MenuSkeleton withHero />
  if (error) return <p className="py-16 text-center text-sm text-danger-500">No pudimos cargar el menú: {error}</p>

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white sm:p-10">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <MapPin size={12} aria-hidden="true" /> Entregando en tu zona
        </div>
        <h1 className="max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">
          Pizza recién horneada, directo a tu puerta
        </h1>
        <p className="mt-2 max-w-sm text-sm text-white/85">{BRAND_TAGLINE}</p>
        <Link
          href="/menu"
          className="mt-5 inline-flex items-center rounded-full bg-ink-900 px-6 py-3 text-sm font-bold text-white shadow-pop hover:bg-ink-800"
        >
          Order Now
        </Link>
      </section>

      {/* Delivery/Pickup + búsqueda */}
      <section className="flex flex-col gap-3 sm:flex-row">
        <div className="flex rounded-full bg-white p-1 shadow-card">
          <button
            onClick={() => setOrderType('delivery')}
            aria-pressed={orderType === 'delivery'}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
              orderType === 'delivery' ? 'bg-brand-500 text-white' : 'text-ink-600'
            )}
          >
            <Truck size={15} aria-hidden="true" /> Delivery
          </button>
          <button
            onClick={() => setOrderType('pickup')}
            aria-pressed={orderType === 'pickup'}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
              orderType === 'pickup' ? 'bg-brand-500 text-white' : 'text-ink-600'
            )}
          >
            <Store size={15} aria-hidden="true" /> Pickup
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pizzas, bebidas, postres…"
            aria-label="Buscar productos"
            className="pl-10"
          />
        </div>
      </section>

      {search.trim() ? (
        <section>
          <h2 className="mb-4 text-lg font-extrabold text-ink-900">Resultados para &quot;{search}&quot;</h2>
          <MenuGrid
            items={searchResults ?? []}
            sizesByItem={sizesByItem}
            crusts={crusts}
            sauces={sauces}
            toppings={toppings}
            emptyMessage="No encontramos productos con ese nombre."
          />
        </section>
      ) : (
        <>
          {/* Categorías */}
          <section>
            <h2 className="mb-4 text-lg font-extrabold text-ink-900">Categorías</h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/menu/${cat.id}`}
                  className="shrink-0 rounded-2xl bg-white px-5 py-4 text-center shadow-card transition hover:shadow-pop"
                >
                  <span className="text-sm font-bold text-ink-900">{cat.name}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Populares */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink-900">Populares</h2>
              <Link href="/menu" className="text-sm font-semibold text-brand-500 hover:underline">
                Ver todo
              </Link>
            </div>
            <MenuGrid items={popular} sizesByItem={sizesByItem} crusts={crusts} sauces={sauces} toppings={toppings} />
          </section>
        </>
      )}
    </div>
  )
}
