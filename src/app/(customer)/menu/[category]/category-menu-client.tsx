'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useMenuData } from '@/hooks/useMenuData'
import { MenuGrid } from '@/components/customer/menu-grid'
import { Button } from '@/components/ui/button'

export function CategoryMenuClient({ categoryId }: { categoryId: string }) {
  const { categories, itemsByCategory, sizesByItem, crusts, sauces, toppings, loading, error } = useMenuData()

  if (loading) return <p className="py-16 text-center text-sm text-ink-400">Cargando…</p>
  if (error) return <p className="py-16 text-center text-sm text-danger-500">No pudimos cargar el menú: {error}</p>

  const category = categories.find((c) => c.id === categoryId)

  if (!category) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm font-semibold text-ink-600">No encontramos esta categoría.</p>
        <Button onClick={() => (window.location.href = '/menu')}>Ver el menú completo</Button>
      </div>
    )
  }

  return (
    <div>
      <Link href="/menu" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-600 hover:text-brand-900">
        <ChevronLeft size={16} aria-hidden="true" /> Todo el menú
      </Link>
      <h1 className="mb-5 text-xl font-extrabold text-ink-900">{category.name}</h1>
      <MenuGrid
        items={itemsByCategory.get(categoryId) ?? []}
        sizesByItem={sizesByItem}
        crusts={crusts}
        sauces={sauces}
        toppings={toppings}
        emptyMessage="Pronto agregaremos productos aquí."
      />
    </div>
  )
}
