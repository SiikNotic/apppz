'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Ban, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { deductInventoryForOrder } from '@/lib/inventoryDeduction'
import { useAuth } from '@/contexts/AuthContext'
import { nextHappyPathStatus } from '@/lib/business-logic/order-state-machine'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderItem,
  type OrderItemTopping,
  type OrderStatus,
} from '@/lib/types'

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

const FILTERS: { key: 'active' | 'all' | OrderStatus; label: string }[] = [
  { key: 'active', label: 'En curso' },
  { key: 'all', label: 'Todos' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
]

export default function OrdersPage() {
  const { can } = useAuth()
  const canUpdateStatus = can('orders.update_status')
  const canCancel = can('orders.cancel')
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
      return ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
    return o.status === filter
  })

  async function advanceStatus(order: Order) {
    const next = nextHappyPathStatus(order.status as OrderStatus)
    if (!next) return
    setBusyId(order.id)

    if (order.status === 'pending' && next === 'confirmed') {
      await deductInventoryForOrder(order.id)
    }

    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    setBusyId(null)
    if (error) {
      // El trigger de la base de datos rechaza transiciones inválidas —
      // si esto dispara, es que dos personas cambiaron el estado a la vez.
      alert('No se pudo actualizar el estado (puede que ya haya cambiado). Se recargó la lista.')
    }
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
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              filter === f.key ? 'bg-brand-500 text-ink-900 shadow-card' : 'bg-white text-ink-600'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="py-8 text-center text-sm text-ink-400">Cargando…</p>}
      {!loading && filteredOrders.length === 0 && (
        <Card className="py-8 text-center text-sm text-ink-400">No hay pedidos en esta vista.</Card>
      )}

      {!loading && filteredOrders.length > 0 && (
        <>
          {/* Mobile (< md): una tarjeta por pedido — la tabla de abajo
              necesitaba scroll horizontal para ver Tipo/Cliente/Total/Estado,
              exactamente lo que no queremos en el teléfono. */}
          <div className="space-y-3 md:hidden">
            {filteredOrders.map((order) => {
              const status = order.status as OrderStatus
              const notTerminal = !['delivered', 'cancelled', 'refunded', 'failed'].includes(status)
              return (
                <Card key={order.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">#{order.order_number}</p>
                      <p className="text-xs text-ink-400">{formatDate(order.created_at)}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                    <dt className="text-ink-400">Cliente</dt>
                    <dd className="truncate text-right text-ink-600">{order.customer_name}</dd>
                    <dt className="text-ink-400">Tipo</dt>
                    <dd className="text-right text-ink-600">
                      {order.order_type === 'delivery' ? 'Domicilio' : 'Recoger'}
                    </dd>
                    <dt className="text-ink-400">Total</dt>
                    <dd className="text-right font-semibold text-ink-900">
                      {formatCurrency(order.total)}
                    </dd>
                  </dl>
                  <div className="flex items-center gap-2 border-t border-ink-100 pt-3">
                    <Button size="sm" variant="secondary" onClick={() => openDetail(order)} className="flex-1">
                      <Eye size={14} aria-hidden="true" /> Ver detalle
                    </Button>
                    {notTerminal && canUpdateStatus && (
                      <button
                        onClick={() => advanceStatus(order)}
                        disabled={busyId === order.id}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-900 hover:brightness-95 disabled:opacity-50"
                        title="Avanzar estado"
                      >
                        <ArrowRight size={16} aria-hidden="true" />
                        <span className="sr-only">Avanzar estado</span>
                      </button>
                    )}
                    {notTerminal && canCancel && (
                      <button
                        onClick={() => cancelOrder(order)}
                        disabled={busyId === order.id}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95 disabled:opacity-50"
                        title="Cancelar"
                      >
                        <Ban size={16} aria-hidden="true" />
                        <span className="sr-only">Cancelar</span>
                      </button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Tablet/Desktop (>= md): tabla completa, sigue siendo la mejor
              forma de comparar muchos pedidos de un vistazo. */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const status = order.status as OrderStatus
                  const notTerminal = !['delivered', 'cancelled', 'refunded', 'failed'].includes(status)
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <p className="font-semibold text-ink-900">#{order.order_number}</p>
                        <p className="text-xs text-ink-400">{formatDate(order.created_at)}</p>
                      </TableCell>
                      <TableCell className="text-ink-600">{order.customer_name}</TableCell>
                      <TableCell className="text-ink-600">
                        {order.order_type === 'delivery' ? 'Domicilio' : 'Recoger'}
                      </TableCell>
                      <TableCell className="font-semibold text-ink-900">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDetail(order)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                            title="Ver detalle"
                          >
                            <Eye size={14} aria-hidden="true" />
                            <span className="sr-only">Ver detalle</span>
                          </button>
                          {notTerminal && canUpdateStatus && (
                            <button
                              onClick={() => advanceStatus(order)}
                              disabled={busyId === order.id}
                              className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-900 hover:brightness-95 disabled:opacity-50"
                              title="Avanzar estado"
                            >
                              <ArrowRight size={14} aria-hidden="true" />
                              <span className="sr-only">Avanzar estado</span>
                            </button>
                          )}
                          {notTerminal && canCancel && (
                            <button
                              onClick={() => cancelOrder(order)}
                              disabled={busyId === order.id}
                              className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95 disabled:opacity-50"
                              title="Cancelar"
                            >
                              <Ban size={14} aria-hidden="true" />
                              <span className="sr-only">Cancelar</span>
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-md">
          {detailOrder && (
            <div className="p-6">
              <DialogTitle className="text-lg font-extrabold text-ink-900">
                Pedido #{detailOrder.order_number}
              </DialogTitle>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
