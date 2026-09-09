'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getLastOrderId, clearLastOrderId } from '@/lib/active-order'
import { ORDER_STATUS_LABELS, ORDER_CLOSED_STATUSES } from '@/lib/types'
import type { Order, OrderStatus } from '@/lib/types'

/**
 * Recordatorio persistente del pedido activo: así, si el cliente cierra la
 * pestaña o la app y la vuelve a abrir, ve de inmediato cómo va su pedido
 * sin tener que buscar el link — funciona con o sin cuenta, porque se basa
 * en el último id de pedido guardado en este dispositivo, no en la sesión.
 */
export function ActiveOrderBanner() {
  const pathname = usePathname()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    const lastId = getLastOrderId()
    if (!lastId) return
    const id: string = lastId
    let active = true

    async function load() {
      const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
      if (!active) return
      if (!data || ORDER_CLOSED_STATUSES.includes(data.status as OrderStatus)) {
        clearLastOrderId()
        setOrder(null)
        return
      }
      setOrder(data)
    }
    load()

    const channel = supabase
      .channel(`active-order-banner-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as Order
          if (ORDER_CLOSED_STATUSES.includes(updated.status as OrderStatus)) {
            clearLastOrderId()
            setOrder(null)
          } else {
            setOrder(updated)
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  // En la propia página de seguimiento el estado ya se muestra completo;
  // mostrar el banner ahí encima sería redundante.
  if (!order || pathname === '/order') return null

  return (
    <Link
      href={`/order?id=${order.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white shadow-card"
    >
      <span className="min-w-0 truncate text-sm font-semibold">
        Pedido #{order.order_number} · {ORDER_STATUS_LABELS[order.status as OrderStatus]}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-brand-300">
        Ver seguimiento <ChevronRight size={14} aria-hidden="true" />
      </span>
    </Link>
  )
}
