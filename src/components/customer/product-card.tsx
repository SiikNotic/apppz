'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ItemThumb } from '@/components/ui/item-thumb'
import { PriceDisplay } from '@/components/ui/price'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MenuItem, ItemSize } from '@/lib/types'

interface ProductCardProps {
  item: MenuItem
  sizes: ItemSize[]
  onQuickAdd: (item: MenuItem) => void
  onOpenBuilder: (item: MenuItem) => void
  /** Ancho/comportamiento de layout — grilla (por defecto, w-full) vs.
   *  carril horizontal (el que llama pasa algo como "w-40 shrink-0"). */
  className?: string
}

/**
 * Tarjeta de producto — compartida entre la grilla de MenuGrid y el
 * carril horizontal "Recomendados" de Home, para no mantener dos copias
 * del mismo marcado + lógica de agregar al carrito. Antes vivía inline
 * dentro de menu-grid.tsx.
 */
export function ProductCard({ item, sizes, onQuickAdd, onOpenBuilder, className }: ProductCardProps) {
  const { t } = useLanguage()
  const isBuilder = item.is_customizable_pizza
  const displayPrice = isBuilder ? (sizes[0]?.price ?? item.base_price) : item.base_price

  return (
    <div
      className={cn(
        // rounded-2xl (no 3xl) + borde sutil: mismo lenguaje que Card
        // (ui/card.tsx), pero definido acá en vez de reusar el componente
        // porque esta tarjeta necesita que la imagen llegue hasta el borde
        // (Card siempre trae padding interno).
        'group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98]',
        isBuilder && 'ring-1 ring-brand-500/30',
        className
      )}
    >
      {/* Foto a toda la celda, proporción fija (aspect-square) para que la
          grilla/carril nunca desalinee entre productos con y sin foto real
          — el ícono de respaldo (sin foto) usa el mismo contenedor en vez
          de un tamaño distinto. */}
      <Link
        href={`/product/${item.id}`}
        className="group/img relative block aspect-square w-full overflow-hidden bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            unoptimized
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <ItemThumb name={item.name} imageUrl={null} size="lg" />
          </div>
        )}
        {isBuilder && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            <Sparkles size={11} aria-hidden="true" /> {t('productForm.customizableBadge')}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/product/${item.id}`} className="block">
          <h3 className="truncate text-sm font-bold text-foreground hover:underline">{item.name}</h3>
          {item.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
          )}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <PriceDisplay value={displayPrice} prefix={isBuilder ? t('product.from') : undefined} size="sm" />
          {isBuilder ? (
            <button
              onClick={() => onOpenBuilder(item)}
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition active:scale-90 hover:bg-brand-600"
            >
              {t('product.createNow')}
            </button>
          ) : (
            <button
              onClick={() => onQuickAdd(item)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition active:scale-90 hover:bg-brand-600"
              aria-label={t('product.addToCartAria', { name: item.name })}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
