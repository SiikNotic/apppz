'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { OrderReceipt } from './order-receipt'
import { fetchOrderCancellation } from '@/lib/data-access/cancellations'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Order, OrderCancellation, OrderItem, OrderItemTopping } from '@/lib/types'

interface ReceiptDialogProps {
  order: Order | null
  onOpenChange: (open: boolean) => void
}

/**
 * Los items (con sus toppings) se piden hasta que se abre el diálogo —
 * mismo patrón que el detalle de pedido en /company/orders — en vez de
 * cargarlos por adelantado para cada fila del historial.
 */
export function ReceiptDialog({ order, onOpenChange }: ReceiptDialogProps) {
  const { t } = useLanguage()
  const [items, setItems] = useState<(OrderItem & { order_item_toppings: OrderItemTopping[] })[]>([])
  const [cancellation, setCancellation] = useState<OrderCancellation | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!order) return
    let active = true
    setLoading(true)
    Promise.all([
      supabase.from('order_items').select('*, order_item_toppings(*)').eq('order_id', order.id),
      order.status === 'cancelled' ? fetchOrderCancellation(order.id).catch(() => null) : Promise.resolve(null),
    ]).then(([itemsRes, cancellationRow]) => {
      if (!active) return
      setItems(itemsRes.data ?? [])
      setCancellation(cancellationRow)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [order])

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs overflow-hidden p-0">
        <DialogTitle className="sr-only">{t('receipt.title')}</DialogTitle>
        {loading || !order ? (
          <div className="w-full rounded-3xl bg-white p-10">
            <p className="text-center text-sm text-neutral-500">{t('common.loading')}</p>
          </div>
        ) : (
          <OrderReceipt order={order} items={items} cancellation={cancellation} />
        )}
      </DialogContent>
    </Dialog>
  )
}
