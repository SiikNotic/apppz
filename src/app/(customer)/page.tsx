'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Truck, Store, MapPin } from 'lucide-react'
import { useMenuData } from '@/hooks/useMenuData'
import { usePromoBanner } from '@/hooks/usePromoBanner'
import { MenuGrid } from '@/components/customer/menu-grid'
import { MenuSkeleton } from '@/components/customer/menu-skeleton'
import { PromoBannerHero } from '@/components/customer/promo-banner-hero'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CategoryPillIcon } from '@/components/customer/category-pill-icon'
import { BRAND_TAGLINE } from '@/lib/config'
import { useLanguage } from '@/contexts/LanguageContext'

export default function HomePage() {
  const { categories, itemsByCategory, sizesByItem, crusts, sauces, toppings, loading, error } = useMenuData()
  const { banner } = usePromoBanner()
  const { t } = useLanguage()
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [search, setSearch] = useState('')
  // Tocar una categoría filtra aquí mismo (igual que la búsqueda) — antes
  // navegaba a /menu y sacaba al cliente de donde estaba.
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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
      {/* Hero: la promoción activa manda cuando existe — es la que vende.
          El mensaje de marca queda como línea secundaria, no como el
          elemento visual principal. Sin promo configurada, se mantiene
          el hero de marca de siempre (nunca se inventa una oferta). */}
      {banner ? (
        <>
          <PromoBannerHero banner={banner} />
          <section className="flex items-center gap-2 px-1 text-xs font-semibold text-ink-400">
            <MapPin size={12} className="shrink-0" aria-hidden="true" />
            {t('home.heroTitle')} · {BRAND_TAGLINE}
          </section>
        </>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white sm:p-10">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            <MapPin size={12} aria-hidden="true" /> {t('home.deliveringArea')}
          </div>
          <h1 className="max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">
            {t('home.heroTitle')}
          </h1>
          <p className="mt-2 max-w-sm text-sm text-white/80">{BRAND_TAGLINE}</p>
          <Link
            href="/menu"
            className="mt-5 inline-flex items-center rounded-full bg-ink-900 px-6 py-3 text-sm font-bold text-white shadow-pop hover:bg-ink-800"
          >
            {t('home.orderNow')}
          </Link>
        </section>
      )}

      {/* Delivery/Pickup + búsqueda */}
      <section className="flex flex-col gap-3 sm:flex-row">
        {/* self-start evita que el flex-col de mobile estire el pill a todo
            el ancho (align-items:stretch por defecto) — en fila (desktop)
            self-auto restaura exactamente el comportamiento de siempre. */}
        <div className="flex self-start rounded-full bg-white p-1 shadow-card sm:self-auto">
          <button
            onClick={() => setOrderType('delivery')}
            aria-pressed={orderType === 'delivery'}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
              orderType === 'delivery' ? 'bg-brand-500 text-white' : 'text-ink-600'
            )}
          >
            <Truck size={15} aria-hidden="true" /> {t('home.delivery')}
          </button>
          <button
            onClick={() => setOrderType('pickup')}
            aria-pressed={orderType === 'pickup'}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
              orderType === 'pickup' ? 'bg-brand-500 text-white' : 'text-ink-600'
            )}
          >
            <Store size={15} aria-hidden="true" /> {t('home.pickup')}
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            aria-label={t('common.search')}
            className="pl-10"
          />
        </div>
      </section>

      {search.trim() ? (
        <section>
          <h2 className="mb-4 text-lg font-extrabold text-ink-900">
            {t('home.searchResultsFor')} &quot;{search}&quot;
          </h2>
          <MenuGrid
            items={searchResults ?? []}
            sizesByItem={sizesByItem}
            crusts={crusts}
            sauces={sauces}
            toppings={toppings}
            emptyMessage={t('home.noResults')}
          />
        </section>
      ) : (
        <>
          {/* Categorías: filtran aquí mismo, tocar de nuevo la activa la
              quita y regresa a Populares — nunca navega a otra pantalla. */}
          <section>
            <h2 className="mb-4 text-lg font-extrabold text-ink-900">{t('home.categories')}</h2>
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveCategory((prev) => (prev === cat.id ? null : cat.id))}
                    className={cn(
                      'shrink-0 rounded-full border px-5 py-2.5 text-sm font-bold transition',
                      isActive
                        ? 'border-brand-500 bg-brand-500 text-white shadow-card'
                        : 'border-brand-200 bg-white text-ink-900 hover:border-brand-500'
                    )}
                  >
                    <CategoryPillIcon name={cat.name} imageUrl={cat.image_url} /> {cat.name}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Categoría activa, o Populares si no hay ninguna seleccionada */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink-900">
                {activeCategory ? categories.find((c) => c.id === activeCategory)?.name : t('home.popular')}
              </h2>
              {activeCategory ? (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-sm font-semibold text-brand-900 hover:underline"
                >
                  {t('home.popular')}
                </button>
              ) : (
                <Link href="/menu" className="text-sm font-semibold text-brand-900 hover:underline">
                  {t('common.seeAll')}
                </Link>
              )}
            </div>
            <MenuGrid
              items={activeCategory ? itemsByCategory.get(activeCategory) ?? [] : popular}
              sizesByItem={sizesByItem}
              crusts={crusts}
              sauces={sauces}
              toppings={toppings}
            />
          </section>
        </>
      )}
    </div>
  )
}
