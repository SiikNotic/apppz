import { useEffect, useState } from 'react'
import { ArrowRight, Ban, Eye } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { deductInventoryForOrder } from '../../lib/inventoryDeduction'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../lib/format'
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderItem,
  type OrderItemTopping,
  type OrderStatus,
} from '../../lib/types'

const STATUS_TONE: Record<OrderStatus, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'brand',
  preparing: 'brand',
  ready: 'success',
  on_the_way: 'success',
  delivered: 'neutral',
  cancelled: 'danger',
}

const FILTERS: { key: 'active' | 'all' | OrderStatus; label: string }[] = [
  { key: 'active', label: 'En curso' },
  { key: 'all', label: 'Todos' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
]

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('active')
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [detailItems, setDetailItems] = useState<(OrderItem & { order_item_toppings: OrderItemTopping[] })[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('orders-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true
    if (filter === 'active')
      return ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'].includes(o.status)
    return o.status === filter
  })

  async function advanceStatus(order: Order) {
    const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status as OrderStatus)
    const next = ORDER_STATUS_FLOW[currentIndex + 1]
    if (!next) return
    setBusyId(order.id)

    if (order.status === 'pending' && next === 'confirmed') {
      await deductInventoryForOrder(order.id)
    }

    await supabase.from('orders').update({ status: next }).eq('id', order.id)
    setBusyId(null)
    load()
  }

  async function cancelOrder(order: Order) {
    if (!confirm(`¿Cancelar el pedido #${order.order_number}?`)) return
    setBusyId(order.id)
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    setBusyId(null)
    load()
  }

  async function openDetail(order: Order) {
    setDetailOrder(order)
    const { data } = await supabase
      .from('order_items')
      .select('*, order_item_toppings(*)')
      .eq('order_id', order.id)
    setDetailItems(data ?? [])
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Pedidos</h1>
        <p className="text-sm text-ink-400">
          Da seguimiento a los pedidos y confirma para descontar inventario automáticamente.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              filter === f.key ? 'bg-brand-500 text-white shadow-card' : 'bg-white text-ink-600'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
              <th className="px-5 py-3">Pedido</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-400">
                  No hay pedidos en esta vista.
                </td>
              </tr>
            )}
            {filteredOrders.map((order) => {
              const status = order.status as OrderStatus
              const canAdvance = status !== 'delivered' && status !== 'cancelled'
              return (
                <tr key={order.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink-900">#{order.order_number}</p>
                    <p className="text-xs text-ink-400">{formatDate(order.created_at)}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-600">{order.customer_name}</td>
                  <td className="px-5 py-3 text-ink-600">
                    {order.order_type === 'delivery' ? 'Domicilio' : 'Recoger'}
                  </td>
                  <td className="px-5 py-3 font-semibold text-ink-900">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openDetail(order)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                        title="Ver detalle"
                      >
                        <Eye size={14} />
                      </button>
                      {canAdvance && (
                        <button
                          onClick={() => advanceStatus(order)}
                          disabled={busyId === order.id}
                          className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-600 hover:brightness-95 disabled:opacity-50"
                          title="Avanzar estado"
                        >
                          <ArrowRight size={14} />
                        </button>
                      )}
                      {canAdvance && (
                        <button
                          onClick={() => cancelOrder(order)}
                          disabled={busyId === order.id}
                          className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95 disabled:opacity-50"
                          title="Cancelar"
                        >
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} widthClass="max-w-md">
        {detailOrder && (
          <div className="p-6">
            <h2 className="text-lg font-extrabold text-ink-900">
              Pedido #{detailOrder.order_number}
            </h2>
            <p className="mb-4 text-xs text-ink-400">
              {detailOrder.customer_name} · {detailOrder.phone}
              {detailOrder.address ? ` · ${detailOrder.address}` : ''}
            </p>
            <div className="space-y-3">
              {detailItems.map((item) => (
                <div key={item.id} className="border-b border-ink-100 pb-3 last:border-0">
                  <div className="flex justify-between text-sm font-semibold text-ink-900">
                    <span>
                      {item.quantity}× {item.item_name}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                  <p className="text-xs text-ink-400">
                    {[item.size_name, item.crust_name, item.sauce_name].filter(Boolean).join(' · ')}
                  </p>
                  {item.order_item_toppings.length > 0 && (
                    <p className="text-xs text-ink-400">
                      Toppings: {item.order_item_toppings.map((t) => t.topping_name).join(', ')}
                    </p>
                  )}
                </div>
              ))}
              {detailOrder.notes && (
                <p className="rounded-2xl bg-ink-50 p-3 text-xs text-ink-600">
                  Notas: {detailOrder.notes}
                </p>
              )}
              <div className="flex justify-between text-base font-extrabold text-ink-900">
                <span>Total</span>
                <span>{formatCurrency(detailOrder.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
