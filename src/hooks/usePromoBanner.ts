'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PromoBanner, Promotion } from '@/lib/types'

export type BannerWithPromotion = PromoBanner & { promotion: Pick<Promotion, 'code'> | null }

/**
 * Los banners activos a mostrar en el hero del cliente (arreglo vacío si el
 * negocio no configuró ninguna promoción vigente). RLS ya filtra por
 * active=true y la ventana de fechas ("public read active banners in
 * window") — esto no es solo conveniencia de UI, un cliente que arme la
 * consulta a mano tampoco vería un banner vencido o inactivo. Nunca se
 * inventa una promoción aquí; si el administrador cambia qué banners están
 * activos, esta misma consulta (sin caché propia) trae el cambio la
 * próxima vez que se monta — no hay una segunda fuente de verdad.
 *
 * Antes esto traía un único banner (.limit(1).maybeSingle()); con 2+
 * promociones activas simultáneas, PromoBannerCarousel es quien decide
 * mostrarlas rotando en vez de una sola arbitraria o todas apiladas.
 */
export function usePromoBanner() {
  const [banners, setBanners] = useState<BannerWithPromotion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('promo_banners')
      .select('*, promotion:promotions(code)')
      .order('sort_order')
      .then(({ data }) => {
        if (!active) return
        setBanners((data as BannerWithPromotion[] | null) ?? [])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { banners, loading }
}
