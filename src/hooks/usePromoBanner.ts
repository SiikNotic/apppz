'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PromoBanner, Promotion } from '@/lib/types'

export type BannerWithPromotion = PromoBanner & { promotion: Pick<Promotion, 'code'> | null }

/**
 * El único banner activo a mostrar en el hero del cliente, o null si el
 * negocio no configuró ninguna promoción vigente. RLS ya filtra por
 * active=true y la ventana de fechas — esto no es solo conveniencia de
 * UI, un cliente que arme la consulta a mano tampoco vería un banner
 * vencido o inactivo. Nunca se inventa una promoción aquí.
 */
export function usePromoBanner() {
  const [banner, setBanner] = useState<BannerWithPromotion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('promo_banners')
      .select('*, promotion:promotions(code)')
      .order('sort_order')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setBanner(data as BannerWithPromotion | null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { banner, loading }
}
