'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { CheckCircle2, Circle, Receipt, RotateCcw, MessageCircleWarning } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/contexts/CartContext'
import { fetchOrderById } from '@/lib/data-access/orders'
import { buildCartLinesFromOrder } from '@/lib/business-logic/reorder'
import { saveLastOrderId, clearLastOrderId, getLastOrderId } from '@/lib/active-order'
import { resolveDeliveryLocation } from '@/lib/geo'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DriverCard } from '@/components/customer/driver-card'
import { ReportProblemDialog } from '@/components/customer/report-problem-dialog'
import { ReceiptDialog } from '@/components/customer/receipt-dialog'
import { formatCurrency, formatDate } from '@/lib/format'
import { ORDER_STATUS_FLOW, ORDER_TERMINAL_STATUSES, ORDER_CLOSED_STATUSES } from '@/lib/types'
import type { DeliveryAssignment, Order, OrderItem, OrderStatus, Profile } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'

// mapbox-gl necesita `window` — con export estático, evaluarlo durante el
// build de prerenderizado rompería el build. ssr:false lo salta del todo
// en el servidor/build y solo se carga en el navegador.
const LiveDeliveryMap = dynamic(
  () => import('@/components/customer/live-delivery-map').then((m) => m.LiveDeliveryMap),
  { ssr: false }
)

interface LatLng {
  lat: number
  lng: number
}

function OrderStatusContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id') ?? undefined
  const router = useRouter()
  const { addLine } = useCart()
  const { t } = useLanguage()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null)
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null)
  const [restaurantLocation, setRestaurantLocation] = useState<LatLng | null>(null)
  const [destinationLocation, setDestinationLocation] = useState<LatLng | null>(null)
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [reorderNotice, setReorderNotice] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }
    const id = orderId
    let active = true

    function syncLastOrder(o: Order | null) {
      if (!o) return
      // Mientras el pedido siga activo, lo recordamos para poder mostrar
      // el aviso de seguimiento aunque el cliente cierre y reabra la app;
      // una vez llega a un estado final ya no hace falta seguir avisando.
      if (ORDER_CLOSED_STATUSES.includes(o.status as OrderStatus)) {
        clearLastOrderId()
      } else if (getLastOrderId() === o.id || !getLastOrderId()) {
        saveLastOrderId(o.id)
      }
    }

    async function loadAssignment() {
      const { data } = await supabase
        .from('delivery_assignments')
        .select('*')
        .eq('order_id', id)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!active) return
      setAssignment(data)
      // El perfil del repartidor (nombre/foto/teléfono) solo es legible
      // por el cliente mientras la asignación siga activa (RLS) — ver
      // migración customer_read_assigned_driver_info.
      if (data?.driver_id) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.driver_id).maybeSingle()
        if (active) setDriverProfile(profile as Profile | null)
      } else {
        setDriverProfile(null)
      }
    }

    async function load() {
      const [orderData, itemsRes] = await Promise.all([
        fetchOrderById(id),
        supabase.from('order_items').select('*').eq('order_id', id),
      ])
      if (!active) return
      setOrder(orderData)
      syncLastOrder(orderData)
      setItems(itemsRes.data ?? [])
      setLoading(false)
      if (orderData?.order_type === 'delivery') loadAssignment()
    }
    load()

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as Order
          setOrder(updated)
          syncLastOrder(updated)
          if (updated.order_type === 'delivery') loadAssignment()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_assignments', filter: `order_id=eq.${id}` },
        () => loadAssignment()
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [orderId])

  // Punto de recogida fijo del mapa — se configura una sola vez desde
  // Configuración → Ubicación del restaurante (ver RestaurantLocationCard)
  // y es lectura pública, así que no depende de que haya un pedido.
  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['restaurant.lat', 'restaurant.lng'])
      .then(({ data }) => {
        const byKey: Record<string, unknown> = {}
        for (const row of data ?? []) byKey[row.key] = row.value
        const lat = byKey['restaurant.lat']
        const lng = byKey['restaurant.lng']
        if (typeof lat === 'number' && typeof lng === 'number') setRestaurantLocation({ lat, lng })
      })
  }, [])

  // Coordenadas del punto de entrega — resolveDeliveryLocation (lib/geo)
  // usa addresses.lat/lng si ya se calcularon antes, si no geocodifica y
  // persiste (compartido con el mapa de ruta del conductor).
  useEffect(() => {
    if (!order || order.order_type !== 'delivery') return
    let active = true
    resolveDeliveryLocation(order).then((loc) => {
      if (active && loc) setDestinationLocation(loc)
    })
    return () => {
      active = false
    }
  }, [order?.id, order?.address_id, order?.order_type, order?.address])

  if (loading) return <p className="py-16 text-center text-sm text-ink-400">Cargando pedido…</p>

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm font-semibold text-ink-600">No encontramos ese pedido.</p>
        <Button onClick={() => router.push('/menu')}>Volver al menú</Button>
      </div>
    )
  }

  const status = order.status as OrderStatus
  const isOffPath = ORDER_TERMINAL_STATUSES.includes(status)
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status)

  async function handleReorder() {
    if (!order) return
    setReordering(true)
    setReorderNotice(null)
    const { lines, warnings } = await buildCartLinesFromOrder(order.id)
    setReordering(false)
    if (lines.length === 0) {
      setReorderNotice('Ninguno de los productos de este pedido está disponible ahora mismo.')
      return
    }
    lines.forEach((line) => addLine(line))
    if (warnings.length > 0) setReorderNotice(warnings.join(' '))
    router.push('/checkout')
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-900">
          Pedido #{order.order_number}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-900">
          {t(`orderStatus.${status}`)}
        </h1>
        <p className="mt-1 text-xs text-ink-400">Creado {formatDate(order.created_at)}</p>
      </div>

      {!isOffPath && (
        <Card className="p-5">
          <ol className="space-y-4">
            {ORDER_STATUS_FLOW.map((step, i) => {
              const done = i <= currentIndex
              return (
                <li key={step} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 size={20} className="shrink-0 text-brand-900" />
                  ) : (
                    <Circle size={20} className="shrink-0 text-ink-100" />
                  )}
                  <span
                    className={`text-sm font-semibold ${done ? 'text-ink-900' : 'text-ink-400'}`}
                  >
                    {t(`orderStatus.${step}`)}
                  </span>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      {assignment && (assignment.status === 'assigned' || assignment.status === 'en_route') && (
        <div className="space-y-3">
          {assignment.driver_id && (
            <LiveDeliveryMap
              driverId={assignment.driver_id}
              restaurant={restaurantLocation}
              destination={destinationLocation}
            />
          )}
          <DriverCard profile={driverProfile} assignment={assignment} />
        </div>
      )}

      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-bold text-ink-900">Resumen</h2>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-ink-600">
              {item.quantity}× {item.item_name}
              {item.size_name ? ` (${item.size_name})` : ''}
            </span>
            <span className="font-semibold text-ink-900">{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
        <div className="space-y-1 border-t border-ink-100 pt-3 text-sm">
          <div className="flex justify-between text-ink-600">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-600">
            <span>Envío</span>
            <span>{formatCurrency(order.delivery_fee)}</span>
          </div>
          <div className={`flex justify-between text-ink-900 ${order.tip_amount > 0 ? '' : 'text-base font-extrabold'}`}>
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          {order.tip_amount > 0 && (
            <>
              <div className="flex justify-between text-ink-600">
                <span>Propina</span>
                <span>{formatCurrency(order.tip_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-ink-900">
                <span>Total pagado</span>
                <span>{formatCurrency(order.total + order.tip_amount)}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {reorderNotice && (
        <p role="status" className="rounded-2xl bg-amber-50 p-3 text-center text-xs font-semibold text-warning-500">
          {reorderNotice}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button fullWidth onClick={handleReorder} disabled={reordering}>
          <RotateCcw size={16} aria-hidden="true" />
          {reordering ? 'Agregando…' : 'Ordenar de nuevo'}
        </Button>
        <Button fullWidth variant="secondary" onClick={() => setReportOpen(true)}>
          <MessageCircleWarning size={16} aria-hidden="true" />
          Reportar un problema
        </Button>
      </div>

      <Button fullWidth variant="ghost" onClick={() => setReceiptOpen(true)}>
        <Receipt size={16} aria-hidden="true" />
        {t('receipt.viewReceipt')}
      </Button>

      <ReportProblemDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        orderId={order.id}
        customerId={order.customer_id}
      />

      <ReceiptDialog order={receiptOpen ? order : null} onOpenChange={(open) => setReceiptOpen(open)} />

      <Button fullWidth variant="ghost" onClick={() => router.push('/menu')}>
        Volver al menú
      </Button>
    </div>
  )
}

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={<p className="py-16 text-center text-sm text-ink-400">Cargando pedido…</p>}
    >
      <OrderStatusContent />
    </Suspense>
  )
}
