'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, Circle, RotateCcw, MessageCircleWarning } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/contexts/CartContext'
import { buildCartLinesFromOrder } from '@/lib/business-logic/reorder'
import { saveLastOrderId, clearLastOrderId, getLastOrderId } from '@/lib/active-order'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DeliveryChat } from '@/components/shared/delivery-chat'
import { ReportProblemDialog } from '@/components/customer/report-problem-dialog'
import { formatCurrency, formatDate } from '@/lib/format'
import { ORDER_STATUS_FLOW, ORDER_TERMINAL_STATUSES, ORDER_CLOSED_STATUSES } from '@/lib/types'
import type { DeliveryAssignment, Order, OrderItem, OrderStatus } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'

function OrderStatusContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id') ?? undefined
  const router = useRouter()
  const { addLine } = useCart()
  const { t } = useLanguage()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [reorderNotice, setReorderNotice] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

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
      if (active) setAssignment(data)
    }

    async function load() {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).maybeSingle(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ])
      if (!active) return
      setOrder(orderRes.data)
      syncLastOrder(orderRes.data)
      setItems(itemsRes.data ?? [])
      setLoading(false)
      if (orderRes.data?.order_type === 'delivery') loadAssignment()
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
        <DeliveryChat assignmentId={assignment.id} role="customer" active />
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
          <div className="flex justify-between text-base font-extrabold text-ink-900">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
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

      <ReportProblemDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        orderId={order.id}
        customerId={order.customer_id}
      />

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
