'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame, Clock, Printer, Send, BellRing, Volume2, X, Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { deductInventoryForOrder } from '@/lib/inventoryDeduction'
import { useAuth } from '@/contexts/AuthContext'
import { useNewOrderAlert } from '@/hooks/useNewOrderAlert'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader } from '@/components/company/page-header'
import type { Order, OrderItem, OrderItemTopping, OrderStatus, Profile } from '@/lib/types'

type KitchenOrder = Order & { order_items: (OrderItem & { order_item_toppings: OrderItemTopping[] })[] }
type AvailableDriver = { user_id: string; full_name: string }

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

export default function KitchenViewPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const canCancel = can('orders.cancel')
  // El pedido llega directo a Cocina como "Nuevo" (pending) — el paso
  // aparte de "Pedidos" que antes lo aceptaba primero (pending ->
  // confirmed) se quitó del dashboard, así que "Aceptar" acá mismo
  // ahora hace ese trabajo (pending -> preparing) de una vez.
  const COLUMNS: { status: OrderStatus; label: string; action: OrderStatus | null; actionLabel: string }[] = [
    { status: 'pending', label: t('kitchen.colNew'), action: 'preparing', actionLabel: t('kitchen.accept') },
    { status: 'preparing', label: t('kitchen.colPreparing'), action: 'ready', actionLabel: t('kitchen.ready') },
    { status: 'ready', label: t('kitchen.colReady'), action: null, actionLabel: '' },
  ]
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, forceTick] = useState(0)

  const [labelOrder, setLabelOrder] = useState<KitchenOrder | null>(null)

  const [drivers, setDrivers] = useState<AvailableDriver[]>([])
  const [assignOrder, setAssignOrder] = useState<KitchenOrder | null>(null)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const autoPrintRef = useRef(false)

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, order_item_toppings(*))')
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at')
    setOrders((data ?? []) as KitchenOrder[])
    setLoading(false)
  }

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'kitchen.auto_print')
      .maybeSingle()
      .then(({ data }) => {
        autoPrintRef.current = data?.value === true || data?.value === 'true'
      })
  }, [])

  // Suena y avisa en cuanto un pedido entra a "Nuevos" (pending) — es
  // justo cuando Cocina tiene que enterarse de que hay algo que aceptar.
  const newOrderIds = orders.filter((o) => o.status === 'pending').map((o) => o.id)
  const { alertActive, needsUnlock, unlock, dismiss } = useNewOrderAlert(newOrderIds)

  async function loadAvailableDrivers() {
    const { data: driverRows } = await supabase.from('drivers').select('user_id').eq('status', 'available')
    const ids = (driverRows ?? []).map((d) => d.user_id)
    if (ids.length === 0) {
      setDrivers([])
      return
    }
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
    setDrivers(
      ids.map((id) => ({
        user_id: id,
        full_name: (profiles ?? []).find((p: Profile) => p.id === id)?.full_name || 'Sin nombre',
      }))
    )
  }

  useEffect(() => {
    load()
    loadAvailableDrivers()
    const ordersChannel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()
    const driversChannel = supabase
      .channel('kitchen-drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, loadAvailableDrivers)
      .subscribe()
    // Refresca el "hace X min" cada 30s sin volver a pedir datos.
    const tick = setInterval(() => forceTick((n) => n + 1), 30000)
    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(driversChannel)
      clearInterval(tick)
    }
  }, [])

  async function advance(order: KitchenOrder, next: OrderStatus) {
    setBusyId(order.id)
    // El inventario se descuenta al aceptar (pending -> preparing, la
    // primera vez que el pedido se compromete a hacerse) y de nuevo al
    // pasar a "listo" por si hubo un ajuste manual mientras se preparaba.
    if ((order.status === 'pending' && next === 'preparing') || (order.status === 'preparing' && next === 'ready')) {
      await deductInventoryForOrder(order.id)
    }
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    setBusyId(null)
    // La orden YA avanzó de estado sin importar lo que pase con la
    // impresión — imprimir es best-effort y nunca debe bloquearla.
    if (!error && next === 'ready' && autoPrintRef.current && !order.label_printed_at) {
      printLabel(order)
    }
  }

  // Con la sección de Pedidos fuera del dashboard (ver nota arriba),
  // cancelar un pedido nuevo o en preparación solo se puede hacer desde
  // acá — antes vivía en esa pantalla aparte.
  async function cancelOrder(order: KitchenOrder) {
    if (!confirm(t('ordersAdmin.confirmCancel', { number: order.order_number }))) return
    setBusyId(order.id)
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    setBusyId(null)
  }

  function printLabel(order: KitchenOrder) {
    setLabelOrder(order)
    // Le da un tick al Dialog para montar #order-label-print antes de
    // llamar a print() — si la ventana de impresión no aparece o el
    // usuario la cancela, no hay forma confiable de saberlo desde JS, así
    // que esto es "mejor esfuerzo": se marca como impreso de todas formas
    // para no reintentar en cada actualización futura del mismo pedido.
    setTimeout(() => {
      try {
        window.print()
      } catch {
        // Sin impresora configurada o el navegador la bloqueó — no debe
        // bloquear la orden, que ya avanzó de estado antes de esto.
      }
      supabase.from('orders').update({ label_printed_at: new Date().toISOString() }).eq('id', order.id)
    }, 50)
  }

  function openAssign(order: KitchenOrder) {
    setAssignOrder(order)
    setSelectedDriver('')
    setAssignError(null)
  }

  async function handleAssign() {
    if (!assignOrder || !selectedDriver) return
    setAssigning(true)
    setAssignError(null)
    const { error } = await supabase.rpc('assign_driver_to_order', {
      p_order_id: assignOrder.id,
      p_driver_id: selectedDriver,
    })
    setAssigning(false)
    if (error) {
      // El RPC valida en servidor (pedido listo, repartidor disponible) y
      // devuelve un mensaje claro — nunca "algo salió mal".
      setAssignError(error.message)
      return
    }
    setAssignOrder(null)
    load()
    loadAvailableDrivers()
  }

  if (loading) return <p className="text-sm text-ink-400">{t('kitchen.loadingKitchen')}</p>

  return (
    <div className="space-y-5">
      <PageHeader title={t('kitchen.title')} subtitle={t('kitchen.subtitle')} />

      {needsUnlock && (
        <button
          onClick={unlock}
          className="flex w-full items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/70"
        >
          <Volume2 size={16} aria-hidden="true" />
          {t('kitchen.enableAlertSound')}
        </button>
      )}

      {alertActive && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl bg-brand-500 px-4 py-3 font-bold text-white shadow-pop"
        >
          <span className="flex items-center gap-2">
            <BellRing size={18} aria-hidden="true" /> {t('kitchen.newOrderAlert')}
          </span>
          <button onClick={dismiss} aria-label={t('kitchen.closeAlert')} className="shrink-0 rounded-full p-1 hover:bg-ink-900/10">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

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
                  <p className="rounded-2xl bg-card p-4 text-center text-xs text-muted-foreground">{t('kitchen.noOrders')}</p>
                )}
                {columnOrders.map((order) => {
                  const elapsed = minutesAgo(order.created_at)
                  const priority = elapsed > 20
                  return (
                    <Card key={order.id} className={`p-4 ${priority ? 'border-2 border-danger-500' : ''}`}>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-base font-extrabold text-ink-900">#{order.order_number}</span>
                          {/* Antes este contexto solo se veía en la pantalla
                              aparte de Pedidos — al quitarla, Cocina necesita
                              mostrarlo directamente. */}
                          <span className="block truncate text-xs text-ink-400">{order.customer_name}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`flex items-center gap-1 text-xs font-bold ${priority ? 'text-danger-500' : 'text-ink-400'}`}
                          >
                            {priority ? <Flame size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
                            {elapsed} min
                          </span>
                          <button
                            onClick={() => setLabelOrder(order)}
                            aria-label={t('kitchen.viewLabel', { number: order.order_number })}
                            className="grid h-7 w-7 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                          >
                            <Printer size={13} aria-hidden="true" />
                          </button>
                          {canCancel && col.status !== 'ready' && (
                            <button
                              onClick={() => cancelOrder(order)}
                              disabled={busyId === order.id}
                              aria-label={t('common.cancel')}
                              className="grid h-7 w-7 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95 disabled:opacity-50"
                            >
                              <Ban size={13} aria-hidden="true" />
                            </button>
                          )}
                        </div>
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
                      {col.status === 'ready' && order.order_type === 'delivery' && (
                        <Button fullWidth size="lg" className="mt-3" onClick={() => openAssign(order)}>
                          <Send size={16} aria-hidden="true" /> {t('kitchen.sendToDriver')}
                        </Button>
                      )}
                      {col.status === 'ready' && order.order_type === 'pickup' && (
                        <>
                          <p className="mt-3 rounded-xl bg-ink-50 p-2 text-center text-xs font-semibold text-ink-600">
                            {t('kitchen.pickupWaiting')}
                          </p>
                          <Button
                            fullWidth
                            size="lg"
                            className="mt-2"
                            disabled={busyId === order.id}
                            onClick={() => advance(order, 'delivered')}
                          >
                            {t('kitchen.markPickedUp')}
                          </Button>
                        </>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Etiqueta del pedido: pensada para imprimirse y pegarse en la caja. */}
      <Dialog open={!!labelOrder} onOpenChange={(open) => !open && setLabelOrder(null)}>
        <DialogContent className="max-w-sm">
          {labelOrder && (
            <div className="p-6">
              <div id="order-label-print" className="space-y-3 font-mono text-sm">
                <div className="text-center">
                  <p className="text-lg font-extrabold">
                    {t('kitchen.orderWord')} #{labelOrder.order_number}
                  </p>
                  <p className="text-xs">{formatDate(labelOrder.created_at)}</p>
                </div>
                <div className="border-t border-dashed border-ink-300 pt-2">
                  <p className="font-bold uppercase">
                    {labelOrder.order_type === 'delivery' ? t('kitchen.deliveryLabel') : t('home.pickup')}
                  </p>
                  <p>{labelOrder.customer_name}</p>
                  {labelOrder.phone && (
                    <p>
                      {t('kitchen.phonePrefix')} {labelOrder.phone}
                    </p>
                  )}
                  {labelOrder.address && <p>{labelOrder.address}</p>}
                </div>
                <div className="border-t border-dashed border-ink-300 pt-2">
                  {labelOrder.order_items.map((item) => (
                    <div key={item.id} className="mb-1.5">
                      <p className="font-bold">
                        {item.quantity}× {item.item_name}
                        {item.size_name ? ` (${item.size_name})` : ''}
                      </p>
                      {(item.crust_name || item.sauce_name) && (
                        <p className="pl-3 text-xs">{[item.crust_name, item.sauce_name].filter(Boolean).join(' · ')}</p>
                      )}
                      {item.order_item_toppings.length > 0 && (
                        <p className="pl-3 text-xs">+ {item.order_item_toppings.map((t) => t.topping_name).join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
                {labelOrder.notes && (
                  <div className="border-t border-dashed border-ink-300 pt-2">
                    <p className="font-bold">
                      {t('kitchen.noteLabel')} {labelOrder.notes}
                    </p>
                  </div>
                )}
                <div className="border-t border-dashed border-ink-300 pt-2">
                  <div className="flex justify-between">
                    <span>{t('checkout.subtotal')}</span>
                    <span>{formatCurrency(labelOrder.subtotal)}</span>
                  </div>
                  {labelOrder.discount > 0 && (
                    <div className="flex justify-between">
                      <span>{t('checkout.discount')}</span>
                      <span>-{formatCurrency(labelOrder.discount)}</span>
                    </div>
                  )}
                  {labelOrder.order_type === 'delivery' && labelOrder.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span>{t('checkout.shipping')}</span>
                      <span>{formatCurrency(labelOrder.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t('checkout.tax')}</span>
                    <span>{formatCurrency(labelOrder.tax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold">
                    <span>{t('kitchen.totalUpper')}</span>
                    <span>{formatCurrency(labelOrder.total)}</span>
                  </div>
                </div>
              </div>
              <Button fullWidth className="mt-4 print:hidden" onClick={() => window.print()}>
                <Printer size={16} aria-hidden="true" /> {t('kitchen.printLabelButton')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Asignar repartidor */}
      <Dialog open={!!assignOrder} onOpenChange={(open) => !open && setAssignOrder(null)}>
        <DialogContent className="max-w-sm">
          {assignOrder && (
            <div className="p-6">
              <DialogTitle className="mb-1 text-lg font-extrabold text-ink-900">
                {t('kitchen.sendOrderTitle', { number: assignOrder.order_number })}
              </DialogTitle>
              <p className="mb-4 text-sm text-ink-600">{t('kitchen.chooseDriver')}</p>

              {drivers.length === 0 ? (
                <p className="rounded-2xl bg-ink-50 p-4 text-center text-sm text-ink-400">
                  {t('kitchen.noDriversAvailable')}
                </p>
              ) : (
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('kitchen.chooseDriverPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.user_id} value={d.user_id}>
                        {d.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {assignError && (
                <p role="alert" className="mt-2 text-xs font-semibold text-danger-500">
                  {assignError}
                </p>
              )}

              <Button
                fullWidth
                className="mt-4"
                disabled={!selectedDriver || assigning}
                onClick={handleAssign}
              >
                {assigning ? t('kitchen.sending') : t('kitchen.confirmAndSend')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
