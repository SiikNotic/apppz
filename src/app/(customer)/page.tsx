'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Truck, Store, MapPin, ArrowRight } from 'lucide-react'
import { useMenuData } from '@/hooks/useMenuData'
import { usePromoBanner } from '@/hooks/usePromoBanner'
import { useCart } from '@/contexts/CartContext'
import { toast } from '@/components/ui/toast'
import { MenuGrid } from '@/components/customer/menu-grid'
import { ProductCard } from '@/components/customer/product-card'
import { PizzaBuilderModal } from '@/components/customer/pizza-builder-modal'
import { VariantPickerModal } from '@/components/customer/variant-picker-modal'
import { MenuSkeleton } from '@/components/customer/menu-skeleton'
import { PromoBannerCarousel } from '@/components/customer/promo-banner-carousel'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CategoryPillIcon } from '@/components/customer/category-pill-icon'
import { BRAND_TAGLINE } from '@/lib/config'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MenuItem } from '@/lib/types'

export default function HomePage() {
  const { categories, itemsByCategory, sizesByItem, variantsByItem, crusts, sauces, toppings, loading, error } = useMenuData()
  const { banners } = usePromoBanner()
  const { addLine } = useCart()
  const { t } = useLanguage()
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [search, setSearch] = useState('')
  // Tocar una categoría filtra aquí mismo (igual que la búsqueda) — antes
  // navegaba a /menu y sacaba al cliente de donde estaba.
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  // Solo para el carril "Recomendados" (usa ProductCard directo, no
  // MenuGrid) — el feed de abajo maneja los suyos propios internamente.
  const [builderItem, setBuilderItem] = useState<MenuItem | null>(null)
  const [variantItem, setVariantItem] = useState<MenuItem | null>(null)

  const allItems = useMemo(() => Array.from(itemsByCategory.values()).flat(), [itemsByCategory])

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return allItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
    )
  }, [search, allItems])

  // Carril "Recomendados" — subconjunto corto para scroll horizontal.
  const recommended = useMemo(() => allItems.slice(0, 10), [allItems])
  // El primer producto con foto real, para usarlo como imagen del hero de
  // marca cuando no hay ninguna promoción configurada — nunca se inventa
  // una foto ni un dato: es un producto real del menú.
  const heroItem = useMemo(() => allItems.find((item) => item.image_url) ?? null, [allItems])

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

  if (loading) return <MenuSkeleton withHero />
  if (error) return <p className="py-16 text-center text-sm text-danger-500">No pudimos cargar el menú: {error}</p>

  return (
    <div className="space-y-8">
      {/* Delivery/Pickup + búsqueda — separados en dos filas: el toggle es
          angosto y no debe forzar el buscador a compartir ancho con él. */}
      <section className="space-y-3">
        <div className="flex self-start rounded-full bg-card p-1 shadow-card">
          <button
            onClick={() => setOrderType('delivery')}
            aria-pressed={orderType === 'delivery'}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
              orderType === 'delivery' ? 'bg-brand-500 text-white' : 'text-muted-foreground'
            )}
          >
            <Truck size={15} aria-hidden="true" /> {t('home.delivery')}
          </button>
          <button
            onClick={() => setOrderType('pickup')}
            aria-pressed={orderType === 'pickup'}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
              orderType === 'pickup' ? 'bg-brand-500 text-white' : 'text-muted-foreground'
            )}
          >
            <Store size={15} aria-hidden="true" /> {t('home.pickup')}
          </button>
        </div>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            aria-label={t('common.search')}
            className="h-(--control-h-lg) rounded-2xl pl-11 text-sm shadow-card"
          />
        </div>
      </section>

      {search.trim() ? (
        <section>
          <h2 className="mb-4 text-lg font-extrabold text-foreground">
            {t('home.searchResultsFor')} &quot;{search}&quot;
          </h2>
          <MenuGrid
            items={searchResults ?? []}
            sizesByItem={sizesByItem}
            variantsByItem={variantsByItem}
            crusts={crusts}
            sauces={sauces}
            toppings={toppings}
            emptyMessage={t('home.noResults')}
          />
        </section>
      ) : (
        <>
          {/* Hero: la(s) promoción(es) activa(s) mandan cuando existen —
              son las que venden. Con 2+ banners activos a la vez,
              PromoBannerCarousel arma la rotación (nunca varios apilados);
              con 1 solo, lo muestra tal cual. Sin ninguna promo
              configurada, se arma un hero de marca con la foto de un
              producto real del menú (nunca una imagen o dato inventado)
              en vez del degradado de color plano de antes. */}
          {banners.length > 0 ? (
            <>
              <PromoBannerCarousel banners={banners} />
              <section className="flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
                <MapPin size={12} className="shrink-0" aria-hidden="true" />
                {t('home.heroTitle')} · {BRAND_TAGLINE}
              </section>
            </>
          ) : (
            <Link
              href="/menu"
              className="group relative block overflow-hidden rounded-2xl border border-border shadow-pop transition hover:shadow-card"
            >
              <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
                {heroItem?.image_url ? (
                  <Image
                    src={heroItem.image_url}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-brand-600 to-brand-800" />
                )}
                {/* Scrim oscuro de abajo hacia arriba: garantiza el
                    contraste del texto blanco sin importar qué tan clara
                    sea la foto de fondo. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    <MapPin size={12} aria-hidden="true" /> {t('home.deliveringArea')}
                  </span>
                  <h1 className="max-w-md text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                    {t('home.heroTitle')}
                  </h1>
                  <p className="mt-1 max-w-sm text-sm text-white/75">{BRAND_TAGLINE}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition group-hover:bg-brand-600">
                    {t('home.orderNow')} <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Categorías: círculos grandes con ícono/foto — filtran el feed
              de abajo aquí mismo, tocar de nuevo la activa la quita y
              regresa a "Todo el menú". */}
          <section>
            <h2 className="mb-4 text-lg font-extrabold text-foreground">{t('home.categories')}</h2>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveCategory((prev) => (prev === cat.id ? null : cat.id))}
                    className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                  >
                    <CategoryPillIcon
                      name={cat.name}
                      imageUrl={cat.image_url}
                      size="lg"
                      className={cn(
                        'ring-2 transition',
                        isActive ? 'ring-brand-500' : 'ring-transparent hover:ring-border-strong'
                      )}
                    />
                    <span
                      className={cn(
                        'line-clamp-1 text-center text-xs font-semibold transition',
                        isActive ? 'text-brand-400' : 'text-muted-foreground'
                      )}
                    >
                      {cat.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Recomendados: carril horizontal, siempre los mismos productos
              destacados sin importar el filtro de categoría de abajo. */}
          {!activeCategory && recommended.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-extrabold text-foreground">{t('home.recommended')}</h2>
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                {recommended.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    sizes={sizesByItem.get(item.id) ?? []}
                    variants={variantsByItem.get(item.id) ?? []}
                    onQuickAdd={quickAdd}
                    onOpenBuilder={setBuilderItem}
                    onOpenVariantPicker={setVariantItem}
                    className="w-40 shrink-0 sm:w-48"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Descubrimiento: feed vertical — categoría activa, o el menú
              completo si no hay ninguna seleccionada. */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-foreground">
                {activeCategory ? categories.find((c) => c.id === activeCategory)?.name : t('home.fullMenu')}
              </h2>
              {activeCategory ? (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-sm font-semibold text-brand-400 hover:underline"
                >
                  {t('home.fullMenu')}
                </button>
              ) : (
                <Link href="/menu" className="text-sm font-semibold text-brand-400 hover:underline">
                  {t('common.seeAll')}
                </Link>
              )}
            </div>
            <MenuGrid
              items={activeCategory ? itemsByCategory.get(activeCategory) ?? [] : allItems}
              sizesByItem={sizesByItem}
              variantsByItem={variantsByItem}
              crusts={crusts}
              sauces={sauces}
              toppings={toppings}
            />
          </section>
        </>
      )}

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
