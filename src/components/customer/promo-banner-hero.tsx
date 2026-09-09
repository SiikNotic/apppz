'use client'

// Banner promocional del inicio del cliente — puramente visual. Si hace
// referencia a un código de descuento, solo lo MUESTRA (para que el
// cliente lo copie en el checkout); nunca lo aplica ni calcula ningún
// descuento aquí — eso lo sigue haciendo exclusivamente
// calculate_cart_price() en el servidor cuando el cliente lo escribe en
// el checkout. Este componente es responsable únicamente de mostrar
// contenido de marketing.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PromoBanner, Promotion } from '@/lib/types'

type BannerWithPromotion = PromoBanner & { promotion: Pick<Promotion, 'code'> | null }

export function PromoBannerHero() {
  const [banner, setBanner] = useState<BannerWithPromotion | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      // RLS ya filtra por active=true y la ventana de fechas — esto no es
      // solo una conveniencia de UI, un cliente que arme la consulta a
      // mano tampoco vería un banner vencido o inactivo.
      const { data } = await supabase
        .from('promo_banners')
        .select('*, promotion:promotions(code)')
        .order('sort_order')
        .limit(1)
        .maybeSingle()
      if (active) setBanner(data as BannerWithPromotion | null)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (!banner) return null

  const href = banner.menu_item_id ? `/product/${banner.menu_item_id}` : '/menu'

  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white shadow-card transition hover:shadow-pop sm:p-6"
    >
      <div className="flex items-center gap-4">
        {banner.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner.image_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-extrabold sm:text-lg">{banner.title}</h2>
          {banner.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-white/75">{banner.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {banner.promotion?.code && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-ink-900">
                <Tag size={12} aria-hidden="true" /> {banner.promotion.code}
              </span>
            )}
            {banner.cta_label && (
              <span className="text-xs font-bold text-white underline underline-offset-4">
                {banner.cta_label}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
