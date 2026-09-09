'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useMenuData } from '@/hooks/useMenuData'
import { MenuGrid } from '@/components/customer/menu-grid'
import { MenuSkeleton } from '@/components/customer/menu-skeleton'
import { useLanguage } from '@/contexts/LanguageContext'

function MenuPageContent() {
  const { categories, itemsByCategory, sizesByItem, crusts, sauces, toppings, loading, error } = useMenuData()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // La categoría puede venir por ?category= (p. ej. desde las tarjetas de
  // categoría del inicio) — se usa solo para el estado inicial, nunca para
  // navegar: cambiar de categoría siempre es un filtro en la misma pantalla,
  // nunca una nueva página.
  useEffect(() => {
    const fromUrl = searchParams.get('category')
    if (fromUrl) setActiveCategory(fromUrl)
  }, [searchParams])

  const currentCategory = activeCategory ?? categories[0]?.id ?? null

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
      <h1 className="sr-only">{t('product.fullMenu')}</h1>
      <div role="tablist" aria-label={t('product.categoriesLabel')} className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={currentCategory === cat.id}
            onClick={() => selectCategory(cat.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              currentCategory === cat.id ? 'bg-brand-500 text-ink-900 shadow-card' : 'bg-white text-ink-600 hover:bg-brand-50'
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

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuPageContent />
    </Suspense>
  )
}
