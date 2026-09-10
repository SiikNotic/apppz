'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, X, Clock, CheckCircle2, ChefHat, PackageCheck, Bike, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getLastOrderId, clearLastOrderId, onActiveOrderChanged } from '@/lib/active-order'
import { fetchOrderById } from '@/lib/data-access/orders'
import { ORDER_CLOSED_STATUSES, ORDER_STATUS_FLOW } from '@/lib/types'
import type { Order, OrderStatus } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

const STATUS_ICON: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: PackageCheck,
  out_for_delivery: Bike,
  delivered: CheckCircle2,
  cancelled: X,
  refunded: X,
  failed: X,
}

/**
 * Recordatorio persistente del pedido activo: así, si el cliente cierra la
 * pestaña o la app y la vuelve a abrir, ve de inmediato cómo va su pedido
 * sin tener que buscar el link — funciona con o sin cuenta, porque se basa
 * en el último id de pedido guardado en este dispositivo, no en la sesión.
 * Se limpia al cerrar sesión (ver AuthContext.signOut) para que no le quede
 * expuesto el pedido de alguien a la siguiente persona que use el mismo
 * dispositivo — por eso escucha el evento de active-order.ts en vez de leer
 * localStorage solo una vez al montar: sin esto, el layout compartido no
 * se desmonta al navegar y el banner se quedaba con el estado viejo en
 * memoria hasta un refresh manual (tanto al cerrar sesión como al hacer
 * un pedido nuevo mientras el anterior seguía mostrado).
 */
export function ActiveOrderBanner() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [order, setOrder] = useState<Order | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => onActiveOrderChanged(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    const lastId = getLastOrderId()
    if (!lastId) {
      setOrder(null)
      return
    }
    const id: string = lastId
    let active = true
    setDismissed(false)

    async function load() {
      const data = await fetchOrderById(id)
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
  }, [tick])

  // En la propia página de seguimiento el estado ya se muestra completo;
  // mostrar el banner ahí encima sería redundante.
  if (!order || dismissed || pathname === '/order') return null

  const status = order.status as OrderStatus
  const StatusIcon = STATUS_ICON[status] ?? Clock
  const stepIndex = ORDER_STATUS_FLOW.indexOf(status)

  return (
    // No es un <Link> por fuera: un botón (cerrar) anidado dentro de un
    // <a> es HTML inválido y algunos navegadores lo "escapan" fuera del
    // link, rompiendo el layout — el link cubre solo la parte navegable,
    // el botón de cerrar vive afuera como hermano.
    <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-card transition hover:border-brand-300">
      <div className="flex items-center gap-2 px-4 py-3">
        <Link href={`/order?id=${order.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500 text-white">
            <StatusIcon size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-ink-900">
              <span className="truncate">
                {t('activeOrder.orderNumber', { number: String(order.order_number) })}
              </span>
              <span className="text-ink-300" aria-hidden="true">
                ·
              </span>
              <span className="truncate text-brand-600">{t(`orderStatus.${status}`)}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink-400">
              {order.order_type === 'pickup' ? (
                <Store size={12} className="shrink-0" aria-hidden="true" />
              ) : (
                <Bike size={12} className="shrink-0" aria-hidden="true" />
              )}
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
          <span className="hidden shrink-0 items-center gap-0.5 text-xs font-bold text-brand-500 sm:flex">
            {t('activeOrder.track')} <ChevronRight size={14} aria-hidden="true" />
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-300 hover:bg-ink-50 hover:text-ink-600"
          aria-label={t('common.close')}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      {/* Barra de progreso: posición dentro del camino feliz del pedido —
          se omite si el estado no está en el camino (no debería pasar acá,
          los cerrados/terminales ya ocultan el banner arriba). */}
      {stepIndex >= 0 && (
        <Link
          href={`/order?id=${order.id}`}
          className="flex gap-1 px-4 pb-3"
          aria-label={t('activeOrder.track')}
        >
          {ORDER_STATUS_FLOW.slice(0, -1).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn('h-1 flex-1 rounded-full', i <= stepIndex ? 'bg-brand-500' : 'bg-ink-100')}
            />
          ))}
        </Link>
      )}
    </div>
  )
}
