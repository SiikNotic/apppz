// Banner promocional del inicio del cliente — puramente visual. Si hace
// referencia a un código de descuento o a precios, solo los MUESTRA
// (para que el cliente los vea/copie); nunca aplica ningún descuento
// aquí — eso lo sigue haciendo exclusivamente calculate_cart_price() en
// el servidor cuando el cliente escribe el código en el checkout. Este
// componente es responsable únicamente de mostrar contenido de
// marketing, con la jerarquía visual de una oferta real (imagen grande,
// precio tachado + precio promo, % de descuento, código, CTA).
//
// Layout tipo "hero con foto de fondo + degradado" (el mismo patrón que
// ya usa el hero de marca de Home cuando no hay promo configurada) en vez
// del bloque foto-al-lado-del-texto de antes: acá SÍ importa que la caja
// tenga siempre el mismo alto sin importar el banner que muestre —
// PromoBannerCarousel monta varios de estos uno detrás del otro y un alto
// que cambiara según el largo de la descripción de cada banner produciría
// justo el "layout shifting" que la sesión pide evitar al rotar. Un
// aspect-ratio fijo (no un alto en píxeles) es lo que además deja que la
// imagen se vea grande en tablet/escritorio sin estirarse.
import Image from 'next/image'
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
      className="group relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border shadow-pop transition hover:shadow-card sm:aspect-[21/9]"
    >
      {banner.image_url ? (
        <Image
          src={banner.image_url}
          alt=""
          fill
          unoptimized
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-brand-600 to-brand-800" />
      )}
      {/* Scrim oscuro de abajo hacia arriba: contraste del texto blanco
          garantizado sin importar qué tan clara sea la foto. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {banner.discount_percent != null && (
            <span className="inline-block rounded-full bg-brand-500 px-3 py-1 text-xs font-extrabold text-white">
              -{banner.discount_percent}% OFF
            </span>
          )}
          {banner.promotion?.code && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
              <Tag size={12} aria-hidden="true" /> Código: {banner.promotion.code}
            </span>
          )}
        </div>

        <h2 className="mt-2 line-clamp-1 max-w-md text-xl font-extrabold leading-tight text-white sm:text-2xl md:text-3xl">
          {banner.title}
        </h2>
        {banner.description && (
          <p className="mt-1 line-clamp-1 max-w-sm text-sm text-white/75 sm:line-clamp-2">{banner.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {hasPricing && (
            <span className="flex items-baseline gap-2">
              {banner.original_price != null && (
                <span className="text-sm text-white/50 line-through">{formatCurrency(banner.original_price)}</span>
              )}
              <span className="text-xl font-extrabold text-brand-500 sm:text-2xl">
                {formatCurrency(banner.promo_price!)}
              </span>
            </span>
          )}
          {banner.ends_at && (
            <span className="text-xs text-white/50">Vence {new Date(banner.ends_at).toLocaleDateString('es-MX')}</span>
          )}
        </div>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition group-hover:bg-brand-600">
          {banner.cta_label || 'Ver oferta'}
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
