'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMenuData } from '@/hooks/useMenuData'
import { MenuGrid } from '@/components/customer/menu-grid'
import { MenuSkeleton } from '@/components/customer/menu-skeleton'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/LanguageContext'
import { CategoryPillIcon } from '@/components/customer/category-pill-icon'
import { BRAND_NAME } from '@/lib/config'

function MenuPageContent() {
  const { categories, itemsByCategory, sizesByItem, variantsByItem, crusts, sauces, toppings, loading, error } = useMenuData()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // La categoría puede venir por ?category= (p. ej. desde las tarjetas de
  // categoría del inicio) — se usa solo para el estado inicial, nunca para
  // navegar: cambiar de categoría siempre es un filtro en la misma pantalla,
  // nunca una nueva página.
  useEffect(() => {
    const fromUrl = searchParams.get('category')
    if (fromUrl) setActiveCategory(fromUrl)
  }, [searchParams])

  const currentCategory = activeCategory ?? categories[0]?.id ?? null

  const allItems = useMemo(() => Array.from(itemsByCategory.values()).flat(), [itemsByCategory])
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return allItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
    )
  }, [search, allItems])

  if (loading) return <MenuSkeleton />
  if (error) return <p className="py-16 text-center text-sm text-danger-500">{t('product.loadError')} {error}</p>

  function selectCategory(id: string) {
    setActiveCategory(id)
    // router.replace en vez de push, y sin scroll: la URL queda
    // "bookmarkeable" para esa categoría, pero no se siente como
    // abandonar el menú — no hay remount ni salto de scroll.
    router.replace(`/menu?category=${id}`, { scroll: false })
  }

  return (
    <div>
      {/* Encabezado: nombre de marca (no aparecía en ninguna parte de esta
          pantalla antes) + acceso rápido a Favoritos (función real ya
          existente en /account/favorites) + selector de idioma, que antes
          vivía pegado a los tabs de categoría. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold text-foreground">{BRAND_NAME}</h1>
          <p className="text-xs font-semibold text-muted-foreground">{t('product.fullMenu')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/account/favorites"
            aria-label={t('account.favoritesTitle')}
            title={t('account.favoritesTitle')}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent"
          >
            <Heart size={17} aria-hidden="true" />
          </Link>
          <LanguageToggle />
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('home.searchPlaceholder')}
          aria-label={t('common.search')}
          className="pl-11"
        />
      </div>

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
          {/* Tabs de categoría: indicador de línea inferior en vez de
              píldoras rellenas — "obvio por tipografía/acento", como pide
              el sistema de diseño, sin convertir cada categoría en un
              botón gigante. -mb-px hace que el borde activo se funda con
              la línea del contenedor en vez de verse como dos líneas. */}
          <div
            role="tablist"
            aria-label={t('product.categoriesLabel')}
            className="no-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-border pb-1"
          >
            {categories.map((cat) => {
              const isActive = currentCategory === cat.id
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectCategory(cat.id)}
                  className={cn(
                    '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-0.5 pb-2.5 text-sm font-semibold transition',
                    isActive ? 'border-brand-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <CategoryPillIcon name={cat.name} imageUrl={cat.image_url} /> {cat.name}
                </button>
              )
            })}
          </div>

          <MenuGrid
            items={itemsByCategory.get(currentCategory ?? '') ?? []}
            sizesByItem={sizesByItem}
            variantsByItem={variantsByItem}
            crusts={crusts}
            sauces={sauces}
            toppings={toppings}
          />
        </>
      )}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuPageContent />
    </Suspense>
  )
}
