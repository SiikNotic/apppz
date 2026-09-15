'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ClipboardList, Receipt, RotateCcw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { fetchCustomerOrders, fetchOrderThumbnails } from '@/lib/data-access/orders'
import { fetchOrderCancellationsByOrderIds } from '@/lib/data-access/cancellations'
import { buildCartLinesFromOrder } from '@/lib/business-logic/reorder'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ItemThumb } from '@/components/ui/item-thumb'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ReceiptDialog } from '@/components/customer/receipt-dialog'
import { formatCurrency, formatDate } from '@/lib/format'
import { BRAND_NAME } from '@/lib/config'
import { ORDER_TERMINAL_STATUSES, REFUND_METHOD_I18N_KEY, REFUND_STATUS_I18N_KEY, type Order, type OrderCancellation, type OrderStatus } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'

type OrderThumb = { name: string; imageUrl: string | null } | undefined

const STATUS_VARIANT: Record<OrderStatus, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'brand',
  preparing: 'brand',
  ready: 'success',
  out_for_delivery: 'success',
  delivered: 'neutral',
  cancelled: 'danger',
  refunded: 'danger',
  failed: 'danger',
}

export default function OrdersHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const { addLine } = useCart()
  const { t } = useLanguage()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [thumbnails, setThumbnails] = useState<Map<string, { name: string; imageUrl: string | null }>>(new Map())
  const [cancellations, setCancellations] = useState<Map<string, OrderCancellation>>(new Map())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'past'>('active')
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [reorderNotice, setReorderNotice] = useState<string | null>(null)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/account/orders')
      return
    }
    fetchCustomerOrders(user.id).then((list) => {
      setOrders(list)
      setLoading(false)
      fetchOrderThumbnails(list.map((o) => o.id)).then(setThumbnails)
      const cancelledIds = list.filter((o) => o.status === 'cancelled').map((o) => o.id)
      fetchOrderCancellationsByOrderIds(cancelledIds).then(setCancellations)
    })
  }, [user, authLoading, router])

  const active = orders.filter((o) => !ORDER_TERMINAL_STATUSES.includes(o.status as OrderStatus) && o.status !== 'delivered')
  const past = orders.filter((o) => o.status === 'delivered' || ORDER_TERMINAL_STATUSES.includes(o.status as OrderStatus))

  // Si no hay nada en curso, no tiene caso aterrizar en una pestaña
  // vacía — se muestra el historial directo.
  useEffect(() => {
    if (!loading && active.length === 0 && past.length > 0) setTab('past')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe correr una vez, al terminar de cargar
  }, [loading])

  async function handleReorder(order: Order) {
    setReorderingId(order.id)
    setReorderNotice(null)
    try {
      const { lines, warnings } = await buildCartLinesFromOrder(order.id)
      if (lines.length === 0) {
        setReorderNotice(t('orderHistory.noItemsAvailable'))
        return
      }
      lines.forEach((line) => addLine(line))
      if (warnings.length > 0) {
        setReorderNotice(warnings.join(' '))
      }
      router.push('/checkout')
    } finally {
      setReorderingId(null)
    }
  }

  if (authLoading || loading) return <p className="py-16 text-center text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{t('orderHistory.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('orderHistory.subtitle')}</p>
      </div>

      {reorderNotice && (
        <p role="status" className="rounded-2xl border border-warning-500/30 bg-warning-500/10 p-3 text-xs font-semibold text-warning-300">
          {reorderNotice}
        </p>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} aria-hidden="true" />}
          message={t('orderHistory.noOrdersYet')}
          action={<Button onClick={() => router.push('/menu')}>{t('checkout.seeMenu')}</Button>}
        />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'past')}>
          <TabsList>
            <TabsTrigger value="active">
              {t('orderHistory.sectionActive')}
              {active.length > 0 && ` · ${active.length}`}
            </TabsTrigger>
            <TabsTrigger value="past">{t('orderHistory.sectionPast')}</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {active.length === 0 ? (
              <EmptyState icon={<ClipboardList size={28} aria-hidden="true" />} message={t('orderHistory.emptyActive')} />
            ) : (
              <div className="space-y-3">
                {active.map((order) => (
                  <ActiveOrderCard key={order.id} order={order} thumb={thumbnails.get(order.id)} router={router} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {past.length === 0 ? (
              <EmptyState icon={<ClipboardList size={28} aria-hidden="true" />} message={t('orderHistory.emptyPast')} />
            ) : (
              <div className="space-y-2">
                {past.map((order) => (
                  <PastOrderCard
                    key={order.id}
                    order={order}
                    thumb={thumbnails.get(order.id)}
                    cancellation={cancellations.get(order.id) ?? null}
                    router={router}
                    onReorder={handleReorder}
                    onViewReceipt={setReceiptOrder}
                    reorderingId={reorderingId}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <ReceiptDialog order={receiptOrder} onOpenChange={(open) => !open && setReceiptOrder(null)} />
    </div>
  )
}

function ActiveOrderCard({
  order,
  thumb,
  router,
}: {
  order: Order
  thumb: OrderThumb
  router: ReturnType<typeof useRouter>
}) {
  const { t } = useLanguage()
  const status = order.status as OrderStatus
  return (
    <button
      onClick={() => router.push(`/order?id=${order.id}`)}
      className="block w-full text-left"
      aria-label={t('orderHistory.viewDetails', { number: order.order_number })}
    >
      {/* Prioridad visual real: borde + fondo con tinte de marca y un
          punto pulsante — distinto de las tarjetas compactas de "Anteriores". */}
      <Card className="flex items-center gap-3 border-brand-500/30 bg-brand-500/5 p-4 shadow-card transition hover:border-brand-500/50 active:scale-[0.99]">
        <ItemThumb name={thumb?.name ?? BRAND_NAME} imageUrl={thumb?.imageUrl ?? null} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold text-foreground">{BRAND_NAME}</p>
            <Badge variant={STATUS_VARIANT[status]}>{t(`orderStatus.${status}`)}</Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {t('orderHistory.orderPrefix')} #{order.order_number} · {formatDate(order.created_at)}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-500" aria-hidden="true" />
            <span className="text-xs font-bold text-brand-400">{formatCurrency(order.total)}</span>
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </Card>
    </button>
  )
}

function PastOrderCard({
  order,
  thumb,
  cancellation,
  router,
  onReorder,
  onViewReceipt,
  reorderingId,
}: {
  order: Order
  thumb: OrderThumb
  cancellation: OrderCancellation | null
  router: ReturnType<typeof useRouter>
  onReorder: (o: Order) => void
  onViewReceipt: (o: Order) => void
  reorderingId: string | null
}) {
  const { t } = useLanguage()
  const status = order.status as OrderStatus
  return (
    <Card className="p-3">
      <button onClick={() => router.push(`/order?id=${order.id}`)} className="flex w-full items-center gap-3 text-left">
        <ItemThumb name={thumb?.name ?? BRAND_NAME} imageUrl={thumb?.imageUrl ?? null} size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{BRAND_NAME}</p>
          <p className="truncate text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[status]} className="hidden shrink-0 sm:inline-flex">
          {t(`orderStatus.${status}`)}
        </Badge>
        <span className="shrink-0 text-sm font-extrabold text-foreground">{formatCurrency(order.total)}</span>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {/* "Order #28 / Cancelled / Refund: $24.50 / Refund method: Pizzeria
          Credit" (o "Refund: Processing" mientras sigue pendiente) — el
          historial nunca esconde que un pedido se canceló ni finge que el
          reembolso ya terminó si todavía no. */}
      {status === 'cancelled' && cancellation && cancellation.refund_amount > 0 && (
        <p className="mt-1.5 pl-[52px] text-xs text-danger-400">
          {t('cancellation.refundLabel')}: {formatCurrency(cancellation.refund_amount)} ·{' '}
          {t(REFUND_METHOD_I18N_KEY[cancellation.refund_method as keyof typeof REFUND_METHOD_I18N_KEY])} ·{' '}
          {t(REFUND_STATUS_I18N_KEY[cancellation.refund_status as keyof typeof REFUND_STATUS_I18N_KEY])}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
        <Button size="sm" variant="ghost" onClick={() => onViewReceipt(order)}>
          <Receipt size={14} aria-hidden="true" />
          {t('receipt.viewReceipt')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onReorder(order)} disabled={reorderingId === order.id}>
          <RotateCcw size={14} aria-hidden="true" />
          {reorderingId === order.id ? t('orderHistory.adding') : t('orderHistory.reorder')}
        </Button>
      </div>
    </Card>
  )
}
