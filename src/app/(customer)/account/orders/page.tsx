'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Receipt, RotateCcw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { fetchCustomerOrders } from '@/lib/data-access/orders'
import { buildCartLinesFromOrder } from '@/lib/business-logic/reorder'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReceiptDialog } from '@/components/customer/receipt-dialog'
import { formatCurrency, formatDate } from '@/lib/format'
import { ORDER_TERMINAL_STATUSES, type Order, type OrderStatus } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const [loading, setLoading] = useState(true)
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
    })
  }, [user, authLoading, router])

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

  if (authLoading || loading) return <p className="py-16 text-center text-sm text-ink-400">{t('common.loading')}</p>

  const active = orders.filter((o) => !ORDER_TERMINAL_STATUSES.includes(o.status as OrderStatus) && o.status !== 'delivered')
  const past = orders.filter((o) => o.status === 'delivered')
  const cancelled = orders.filter((o) => ORDER_TERMINAL_STATUSES.includes(o.status as OrderStatus))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{t('orderHistory.title')}</h1>
        <p className="text-sm text-ink-400">{t('orderHistory.subtitle')}</p>
      </div>

      {reorderNotice && (
        <p role="status" className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-warning-500">
          {reorderNotice}
        </p>
      )}

      {orders.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <ClipboardList size={28} className="text-ink-200" aria-hidden="true" />
          <p className="text-sm text-ink-400">{t('orderHistory.noOrdersYet')}</p>
          <Button onClick={() => router.push('/menu')}>{t('checkout.seeMenu')}</Button>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <OrderSection
              title={t('orderHistory.sectionActive')}
              orders={active}
              onReorder={handleReorder}
              onViewReceipt={setReceiptOrder}
              reorderingId={reorderingId}
              router={router}
            />
          )}
          {past.length > 0 && (
            <OrderSection
              title={t('orderHistory.sectionPast')}
              orders={past}
              onReorder={handleReorder}
              onViewReceipt={setReceiptOrder}
              reorderingId={reorderingId}
              router={router}
            />
          )}
          {cancelled.length > 0 && (
            <OrderSection
              title={t('orderHistory.sectionCancelled')}
              orders={cancelled}
              onReorder={handleReorder}
              onViewReceipt={setReceiptOrder}
              reorderingId={reorderingId}
              router={router}
            />
          )}
        </>
      )}

      <ReceiptDialog order={receiptOrder} onOpenChange={(open) => !open && setReceiptOrder(null)} />
    </div>
  )
}

function OrderSection({
  title,
  orders,
  onReorder,
  onViewReceipt,
  reorderingId,
  router,
}: {
  title: string
  orders: Order[]
  onReorder: (o: Order) => void
  onViewReceipt: (o: Order) => void
  reorderingId: string | null
  router: ReturnType<typeof useRouter>
}) {
  const { t } = useLanguage()
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-400">{title}</h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id} className="p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push(`/order?id=${order.id}`)}
                className="text-left"
              >
                <p className="text-sm font-bold text-ink-900 hover:underline">
                  {t('orderHistory.orderPrefix')} #{order.order_number}
                </p>
                <p className="text-xs text-ink-400">{formatDate(order.created_at)}</p>
              </button>
              <Badge variant={STATUS_VARIANT[order.status as OrderStatus]}>
                {t(`orderStatus.${order.status as OrderStatus}`)}
              </Badge>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-ink-900">{formatCurrency(order.total)}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => onViewReceipt(order)}>
                  <Receipt size={14} aria-hidden="true" />
                  {t('receipt.viewReceipt')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onReorder(order)}
                  disabled={reorderingId === order.id}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  {reorderingId === order.id ? t('orderHistory.adding') : t('orderHistory.reorder')}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
