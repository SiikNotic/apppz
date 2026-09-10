'use client'

// Banner promocional del inicio del cliente — puramente visual. Si hace
// referencia a un código de descuento o a precios, solo los MUESTRA
// (para que el cliente los vea/copie); nunca aplica ningún descuento
// aquí — eso lo sigue haciendo exclusivamente calculate_cart_price() en
// el servidor cuando el cliente escribe el código en el checkout. Este
// componente es responsable únicamente de mostrar contenido de
// marketing, con la jerarquía visual de una oferta real (imagen grande,
// precio tachado + precio promo, % de descuento, código, CTA).
import Link from 'next/link'
import { Tag, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { BannerWithPromotion } from '@/hooks/usePromoBanner'

export function PromoBannerHero({ banner }: { banner: BannerWithPromotion }) {
  const href = banner.menu_item_id ? `/product/${banner.menu_item_id}` : '/menu'
  const hasPricing = banner.promo_price != null

  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 to-ink-800 shadow-pop transition hover:shadow-card"
    >
      <div className="flex flex-col sm:flex-row">
        {banner.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner.image_url}
            alt=""
            className="h-40 w-full object-cover sm:h-auto sm:w-48 sm:shrink-0"
          />
        )}
        <div className="flex-1 p-5 sm:p-6">
          {banner.discount_percent != null && (
            <span className="mb-2 inline-block rounded-full bg-brand-500 px-3 py-1 text-xs font-extrabold text-white">
              -{banner.discount_percent}% OFF
            </span>
          )}
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">{banner.title}</h2>
          {banner.description && (
            <p className="mt-1 text-sm text-white/75">{banner.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {hasPricing && (
              <span className="flex items-baseline gap-2">
                {banner.original_price != null && (
                  <span className="text-sm text-white/50 line-through">
                    {formatCurrency(banner.original_price)}
                  </span>
                )}
                <span className="text-2xl font-extrabold text-brand-500">
                  {formatCurrency(banner.promo_price!)}
                </span>
              </span>
            )}
            {banner.promotion?.code && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                <Tag size={12} aria-hidden="true" /> Código: {banner.promotion.code}
              </span>
            )}
          </div>

          {banner.ends_at && (
            <p className="mt-2 text-xs text-white/50">Vence {new Date(banner.ends_at).toLocaleDateString('es-MX')}</p>
          )}

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white">
            {banner.cta_label || 'Ver oferta'}
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}
