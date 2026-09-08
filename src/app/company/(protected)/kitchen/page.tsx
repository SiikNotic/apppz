'use client'

import { useEffect, useState } from 'react'
import { Flame, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { deductInventoryForOrder } from '@/lib/inventoryDeduction'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Order, OrderItem, OrderItemTopping, OrderStatus } from '@/lib/types'

type KitchenOrder = Order & { order_items: (OrderItem & { order_item_toppings: OrderItemTopping[] })[] }

const COLUMNS: { status: OrderStatus; label: string; action: OrderStatus | null; actionLabel: string }[] = [
  { status: 'confirmed', label: 'Nuevos', action: 'preparing', actionLabel: 'ACEPTAR' },
  { status: 'preparing', label: 'Preparando', action: 'ready', actionLabel: 'LISTO' },
  { status: 'ready', label: 'Listos', action: null, actionLabel: '' },
]

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

export default function KitchenViewPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, forceTick] = useState(0)

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, order_item_toppings(*))')
      .in('status', ['confirmed', 'preparing', 'ready'])
      .order('created_at')
    setOrders((data ?? []) as KitchenOrder[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()
    // Refresca el "hace X min" cada 30s sin volver a pedir datos.
    const tick = setInterval(() => forceTick((n) => n + 1), 30000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(tick)
    }
  }, [])

  async function advance(order: KitchenOrder, next: OrderStatus) {
    setBusyId(order.id)
    // El inventario ya se descontó al confirmar (pending -> confirmed); al
    // pasar a "listo" se vuelve a comprobar por si hubo un ajuste manual.
    if (order.status === 'preparing' && next === 'ready') {
      await deductInventoryForOrder(order.id)
    }
    await supabase.from('orders').update({ status: next }).eq('id', order.id)
    setBusyId(null)
  }

  if (loading) return <p className="text-sm text-ink-400">Cargando cocina…</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Cocina</h1>
        <p className="text-sm text-ink-400">Pedidos activos en tiempo real.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) => o.status === col.status)
          return (
            <div key={col.status}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-600">
                {col.label} <Badge variant="neutral">{columnOrders.length}</Badge>
              </h2>
              <div className="space-y-3">
                {columnOrders.length === 0 && (
                  <p className="rounded-2xl bg-white p-4 text-center text-xs text-ink-400">Sin pedidos</p>
                )}
                {columnOrders.map((order) => {
                  const elapsed = minutesAgo(order.created_at)
                  const priority = elapsed > 20
                  return (
                    <Card key={order.id} className={`p-4 ${priority ? 'border-2 border-danger-500' : ''}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-base font-extrabold text-ink-900">#{order.order_number}</span>
                        <span
                          className={`flex items-center gap-1 text-xs font-bold ${priority ? 'text-danger-500' : 'text-ink-400'}`}
                        >
                          {priority ? <Flame size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
                          {elapsed} min
                        </span>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {order.order_items.map((item) => (
                          <li key={item.id} className="border-b border-ink-100 pb-2 last:border-0">
                            <p className="font-semibold text-ink-900">
                              {item.quantity}× {item.item_name}
                              {item.size_name ? ` (${item.size_name})` : ''}
                            </p>
                            {(item.crust_name || item.sauce_name) && (
                              <p className="text-xs text-ink-400">
                                {[item.crust_name, item.sauce_name].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {item.order_item_toppings.length > 0 && (
                              <p className="text-xs text-ink-400">
                                + {item.order_item_toppings.map((t) => t.topping_name).join(', ')}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {order.notes && (
                        <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-warning-500">
                          ⚠ {order.notes}
                        </p>
                      )}
                      {col.action && (
                        <Button
                          fullWidth
                          size="lg"
                          className="mt-3"
                          disabled={busyId === order.id}
                          onClick={() => advance(order, col.action!)}
                        >
                          {col.actionLabel}
                        </Button>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
