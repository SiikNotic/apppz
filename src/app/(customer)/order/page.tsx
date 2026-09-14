'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Check, Receipt, RotateCcw, MessageCircleWarning, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/contexts/CartContext'
import { fetchOrderById } from '@/lib/data-access/orders'
import { buildCartLinesFromOrder } from '@/lib/business-logic/reorder'
import { saveLastOrderId, clearLastOrderId, getLastOrderId } from '@/lib/active-order'
import { resolveDeliveryLocation } from '@/lib/geo'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DriverCard, type DriverVehicle } from '@/components/customer/driver-card'
import { ReportProblemDialog } from '@/components/customer/report-problem-dialog'
import { ReceiptDialog } from '@/components/customer/receipt-dialog'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ORDER_STATUS_FLOW, ORDER_TERMINAL_STATUSES, ORDER_CLOSED_STATUSES } from '@/lib/types'
import type { DeliveryAssignment, Order, OrderItem, OrderStatus, Profile } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'

// mapbox-gl necesita `window` — con export estático, evaluarlo durante el
// build de prerenderizado rompería el build. ssr:false lo salta del todo
// en el servidor/build y solo se carga en el navegador.
const LiveDeliveryMap = dynamic(
  () => import('@/components/customer/live-delivery-map').then((m) => m.LiveDeliveryMap),
  { ssr: false, loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-muted lg:h-96" /> }
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
  const [driverVehicle, setDriverVehicle] = useState<DriverVehicle | null>(null)
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
      // El perfil del repartidor (nombre/foto/teléfono) y su vehículo
      // solo son legibles por el cliente mientras la asignación siga
      // activa (RLS) — ver migración customer_read_assigned_driver_info
      // (profiles) y la policy "customers read assigned driver location"
      // (drivers).
      if (data?.driver_id) {
        const [{ data: profile }, { data: vehicle }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', data.driver_id).maybeSingle(),
          supabase
            .from('drivers')
            .select('vehicle_type, vehicle_year, license_plate, vehicle_makes(name), vehicle_models(name)')
            .eq('user_id', data.driver_id)
            .maybeSingle(),
        ])
        if (active) {
          setDriverProfile(profile as Profile | null)
          setDriverVehicle(vehicle as DriverVehicle | null)
        }
      } else {
        setDriverProfile(null)
        setDriverVehicle(null)
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

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">{t('common.loading')}</p>

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm font-semibold text-muted-foreground">{t('deliveryTracking.orderNotFound')}</p>
        <Button onClick={() => router.push('/menu')}>{t('checkout.seeMenu')}</Button>
      </div>
    )
  }

  const status = order.status as OrderStatus
  const isOffPath = ORDER_TERMINAL_STATUSES.includes(status)
  // En pickup no hay reparto — "En camino" nunca ocurre para ese pedido
  // (ver ALLOWED_TRANSITIONS en order-state-machine.ts: de "ready" se
  // salta directo a "delivered"), así que no se muestra ese paso en la
  // línea de tiempo — mostrarlo sería prometer un paso que jamás pasa.
  const visibleFlow =
    order.order_type === 'pickup' ? ORDER_STATUS_FLOW.filter((s) => s !== 'out_for_delivery') : ORDER_STATUS_FLOW
  const currentIndex = visibleFlow.indexOf(status)
  const hasLiveDelivery = !!(assignment && (assignment.status === 'assigned' || assignment.status === 'en_route') && assignment.driver_id)

  async function handleReorder() {
    if (!order) return
    setReordering(true)
    setReorderNotice(null)
    const { lines, warnings } = await buildCartLinesFromOrder(order.id)
    setReordering(false)
    if (lines.length === 0) {
      setReorderNotice(t('orderHistory.noItemsAvailable'))
      return
    }
    lines.forEach((line) => addLine(line))
    if (warnings.length > 0) setReorderNotice(warnings.join(' '))
    router.push('/checkout')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-400">
          {t('orderHistory.orderPrefix')} #{order.order_number}
        </p>
        {/* key={status}: remonta y vuelve a animar la entrada cada vez que
            el estado cambia — la transición "sutil pero notoria" que pide
            el rediseño para cuando el pedido avanza de paso solo. */}
        <h1 key={status} className="mt-1 text-h1 font-extrabold text-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
          {t(`orderStatus.${status}`)}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
      </div>

      {isOffPath ? (
        <Card className="flex items-center gap-3 border-danger-500/30 bg-danger-500/10 p-4">
          <XCircle size={20} className="shrink-0 text-danger-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-danger-300">{t(`orderStatus.${status}`)}</p>
        </Card>
      ) : (
        <Card className="p-5">
          <ol className="space-y-5">
            {visibleFlow.map((step, i) => {
              const done = i < currentIndex
              const isCurrent = i === currentIndex
              const isLast = i === visibleFlow.length - 1
              return (
                <li key={step} className="relative flex items-center gap-3">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-[9px] top-6 h-6 w-0.5 -translate-x-1/2 transition-colors duration-300',
                        done ? 'bg-brand-500' : 'bg-border'
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full transition-colors duration-300',
                      done
                        ? 'bg-brand-500'
                        : isCurrent
                          ? 'bg-brand-500 ring-4 ring-brand-500/25'
                          : 'border-2 border-border bg-muted'
                    )}
                  >
                    {done && <Check size={11} className="text-white" aria-hidden="true" />}
                    {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold transition-colors duration-300',
                      done || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {t(`orderStatus.${step}`)}
                  </span>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      {/* El mapa es la pieza central mientras hay reparto activo — carril
          más ancho que la tarjeta del repartidor en escritorio, apilados
          en mobile (donde el mapa ya viene con una altura generosa). */}
      {hasLiveDelivery && assignment && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <LiveDeliveryMap driverId={assignment.driver_id!} restaurant={restaurantLocation} destination={destinationLocation} />
          <DriverCard profile={driverProfile} vehicle={driverVehicle} assignment={assignment} />
        </div>
      )}

      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-bold text-foreground">{t('checkout.orderSummaryTitle')}</h2>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.quantity}× {item.item_name}
              {item.size_name ? ` (${item.size_name})` : ''}
            </span>
            <span className="font-semibold text-foreground">{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
        <div className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('checkout.subtotal')}</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('checkout.shipping')}</span>
            <span>{formatCurrency(order.delivery_fee)}</span>
          </div>
          <div className={cn('flex justify-between text-foreground', order.tip_amount > 0 ? '' : 'text-base font-extrabold')}>
            <span>{t('checkout.total')}</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          {order.tip_amount > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('checkout.tipLineLabel')}</span>
                <span>{formatCurrency(order.tip_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-foreground">
                <span>{t('checkout.totalToPay')}</span>
                <span>{formatCurrency(order.total + order.tip_amount)}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {reorderNotice && (
        <p role="status" className="rounded-2xl border border-warning-500/30 bg-warning-500/10 p-3 text-center text-xs font-semibold text-warning-300">
          {reorderNotice}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button fullWidth onClick={handleReorder} disabled={reordering}>
          <RotateCcw size={16} aria-hidden="true" />
          {reordering ? t('orderHistory.adding') : t('orderHistory.reorder')}
        </Button>
        <Button fullWidth variant="secondary" onClick={() => setReportOpen(true)}>
          <MessageCircleWarning size={16} aria-hidden="true" />
          {t('deliveryTracking.reportProblem')}
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
        {t('deliveryTracking.backToMenu')}
      </Button>
    </div>
  )
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm text-muted-foreground">Cargando pedido…</p>}>
      <OrderStatusContent />
    </Suspense>
  )
}
