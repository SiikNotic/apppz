'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame, Clock, Printer, Send, Volume2, Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { deductInventoryForOrder } from '@/lib/inventoryDeduction'
import { useAuth } from '@/contexts/AuthContext'
import { useNewOrderAlert } from '@/hooks/useNewOrderAlert'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast, dismissToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/format'
import { OrderReceipt } from '@/components/customer/order-receipt'
import { StaffCancelOrderDialog } from '@/components/company/staff-cancel-order-dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader } from '@/components/company/page-header'
import { QUANTITY_LEVEL_I18N_KEY, type Order, type OrderItem, type OrderItemTopping, type OrderStatus, type Profile, type ToppingQuantityLevel } from '@/lib/types'

/** "Pepperoni (Extra)" — mismo criterio que en el recibo (order-receipt.tsx):
 *  el nivel solo se anota cuando NO es 'normal', para no repetir "(Normal)"
 *  en cada topping de cada pedido. */
function withQuantityLabel(name: string, level: string, t: (key: string) => string): string {
  if (level === 'normal' || !(level in QUANTITY_LEVEL_I18N_KEY)) return name
  return `${name} (${t(QUANTITY_LEVEL_I18N_KEY[level as ToppingQuantityLevel])})`
}

type KitchenOrder = Order & { order_items: (OrderItem & { order_item_toppings: OrderItemTopping[] })[] }
type AvailableDriver = { user_id: string; full_name: string; active_count: number }

// Barra de acento por columna — para que "Nuevos/Preparando/Listos" se
// distingan de un vistazo sin tener que leer la etiqueta.
const COLUMN_ACCENT: Record<string, string> = {
  pending: 'bg-warning-500',
  preparing: 'bg-brand-500',
  ready: 'bg-success-500',
}

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
  const [completedToday, setCompletedToday] = useState(0)
  const [, forceTick] = useState(0)

  const [labelOrder, setLabelOrder] = useState<KitchenOrder | null>(null)
  const [cancelOrderTarget, setCancelOrderTarget] = useState<KitchenOrder | null>(null)
  // Resalta brevemente la tarjeta a la que "Ver pedido" (del toast de
  // pedido nuevo) hizo scroll, para que quede claro cuál es sin tener que
  // adivinar entre varias tarjetas nuevas a la vez.
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null)
  // Un toast por pedido nuevo (no un solo banner genérico) para que, con
  // varios pedidos llegando seguidos, cada uno se pueda ver/despachar por
  // separado en vez de apilar modales de pantalla completa — ver
  // useNewOrderAlert más abajo para el sonido (sin cambios ahí).
  const orderToastIdsRef = useRef<Map<string, string>>(new Map())

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

  // Con la sección de Pedidos fuera del dashboard, Cocina es el único
  // lugar donde el equipo pasa el día — sin esto, un pedido "completada"
  // (entregado o recogido) simplemente desaparece de la vista sin dejar
  // ningún rastro de cuánto se ha resuelto hoy.
  async function loadCompletedToday() {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .gte('updated_at', startOfDay.toISOString())
    setCompletedToday(count ?? 0)
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

  // Suena en cuanto un pedido entra a "Nuevos" (pending) — es justo cuando
  // Cocina tiene que enterarse de que hay algo que aceptar. El aviso
  // visual (antes un banner de ancho completo que había que cerrar a
  // mano) ahora es un toast compacto por pedido, ver el efecto de abajo —
  // por eso acá solo se usan needsUnlock/unlock de este hook genérico
  // (compartido con el aviso de soporte en layout.tsx) y no su
  // alertActive/dismiss.
  const newOrderIds = orders.filter((o) => o.status === 'pending').map((o) => o.id)
  const { needsUnlock, unlock } = useNewOrderAlert(newOrderIds)

  // Un toast compacto por pedido nuevo, no un modal de pantalla completa:
  // se autodescarta solo a los ~10s (durationMs) y, si la persona toca
  // "Ver pedido", se cierra al toque y hace scroll con un resalte breve a
  // la tarjeta real — así nunca hay que cerrarlo a mano ni tapa el resto
  // del tablero mientras tanto. seenOrderIdsRef vive fuera de
  // useNewOrderAlert (que ya lleva el suyo para el sonido) porque acá se
  // necesita el pedido completo (número, total), no solo su id.
  const seenOrderIdsRef = useRef<Set<string> | null>(null)
  useEffect(() => {
    const pending = orders.filter((o) => o.status === 'pending')
    if (seenOrderIdsRef.current === null) {
      // Primera carga: lo que ya está ahí es historial, no "nuevo".
      seenOrderIdsRef.current = new Set(pending.map((o) => o.id))
      return
    }
    const seen = seenOrderIdsRef.current
    const fresh = pending.filter((o) => !seen.has(o.id))
    pending.forEach((o) => seen.add(o.id))
    for (const order of fresh) {
      const toastId = toast({
        title: t('kitchen.newOrderAlert'),
        description: `${t('ordersAdmin.orderLabel')} #${order.order_number} · ${formatCurrency(order.total)}`,
        durationMs: 10000,
        action: {
          label: t('kitchen.viewOrderAction'),
          onClick: () => {
            orderToastIdsRef.current.delete(order.id)
            const el = document.getElementById(`kitchen-order-${order.id}`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setHighlightedOrderId(order.id)
            window.setTimeout(() => setHighlightedOrderId((current) => (current === order.id ? null : current)), 2000)
          },
        },
      })
      orderToastIdsRef.current.set(order.id, toastId)
    }
  }, [orders, t])

  // Ahora se puede mandar un pedido más a un conductor que ya trae otro en
  // curso (assign_driver_to_order en el servidor solo rechaza a los que
  // están offline) — por eso ya no se filtra por status='available', solo
  // se excluye a quien no ha iniciado turno. El conteo de entregas activas
  // se muestra junto al nombre para que cocina elija con esa información.
  async function loadAvailableDrivers() {
    const { data: driverRows } = await supabase.from('drivers').select('user_id').neq('status', 'offline')
    const ids = (driverRows ?? []).map((d) => d.user_id)
    if (ids.length === 0) {
      setDrivers([])
      return
    }
    const [{ data: profiles }, { data: activeAssignments }] = await Promise.all([
      supabase.from('profiles').select('*').in('id', ids),
      supabase.from('delivery_assignments').select('driver_id').in('driver_id', ids).in('status', ['assigned', 'en_route']),
    ])
    const activeCounts = new Map<string, number>()
    for (const row of activeAssignments ?? []) {
      if (!row.driver_id) continue
      activeCounts.set(row.driver_id, (activeCounts.get(row.driver_id) ?? 0) + 1)
    }
    setDrivers(
      ids.map((id) => ({
        user_id: id,
        full_name: (profiles ?? []).find((p: Profile) => p.id === id)?.full_name || 'Sin nombre',
        active_count: activeCounts.get(id) ?? 0,
      }))
    )
  }

  useEffect(() => {
    load()
    loadAvailableDrivers()
    loadCompletedToday()
    const ordersChannel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        load()
        loadCompletedToday()
      })
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

  // El pedido ya se está "viendo/atendiendo" en cuanto se toca Aceptar,
  // Listo o Cancelar — si su toast de "pedido nuevo" seguía en pantalla,
  // ya no tiene sentido esperar a que se autodescarte solo.
  function dismissOrderToast(orderId: string) {
    const toastId = orderToastIdsRef.current.get(orderId)
    if (toastId) {
      dismissToast(toastId)
      orderToastIdsRef.current.delete(orderId)
    }
  }

  async function advance(order: KitchenOrder, next: OrderStatus) {
    dismissOrderToast(order.id)
    setBusyId(order.id)
    // El inventario se descuenta al aceptar (pending -> preparing, la
    // primera vez que el pedido se compromete a hacerse) y de nuevo al
    // pasar a "listo" por si hubo un ajuste manual mientras se preparaba.
    if ((order.status === 'pending' && next === 'preparing') || (order.status === 'preparing' && next === 'ready')) {
      await deductInventoryForOrder(order.id)
    }
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    setBusyId(null)
    if (error) {
      // Antes esto fallaba en silencio (el pedido se quedaba pegado en su
      // columna sin ningún aviso) — ahora se informa y se resincroniza la
      // lista, por si el estado ya había cambiado desde otra pantalla.
      alert(t('kitchen.actionFailed'))
      load()
      return
    }
    // La orden YA avanzó de estado sin importar lo que pase con la
    // impresión — imprimir es best-effort y nunca debe bloquearla.
    if (next === 'ready' && autoPrintRef.current && !order.label_printed_at) {
      printLabel(order)
    }
  }

  // Con la sección de Pedidos fuera del dashboard (ver nota arriba),
  // cancelar un pedido nuevo o en preparación solo se puede hacer desde
  // acá. Sesión 23: ya no es un confirm() + update crudo — abre el
  // diálogo completo (motivo, reembolso, confirmación) sobre el RPC
  // cancel_order_staff, que es quien de verdad decide qué se puede y
  // registra el reembolso real.
  function openCancelDialog(order: KitchenOrder) {
    dismissOrderToast(order.id)
    setCancelOrderTarget(order)
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

  if (loading) return <p className="text-sm text-muted-foreground">{t('kitchen.loadingKitchen')}</p>

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

      {/* grid-cols-1 explícito (no solo "grid"): Tailwind arma sus
          grid-cols-* con minmax(0, 1fr), que es lo que deja que una
          columna se achique por debajo del ancho de su contenido. Sin
          columnas explícitas en mobile/tablet, grid-template-columns
          queda en "none" y cada columna usa min-width:auto — un pedido
          con nombre de cliente largo o muchos toppings bastaba para
          forzar todo el tablero (y la página) a desbordar
          horizontalmente por debajo de lg. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) => o.status === col.status)
          return (
            <div key={col.status} className="min-w-0">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLUMN_ACCENT[col.status]}`} aria-hidden="true" />
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
                    <Card
                      key={order.id}
                      id={`kitchen-order-${order.id}`}
                      className={`animate-in fade-in slide-in-from-top-2 duration-300 p-4 transition-shadow ${priority ? 'border-2 border-danger-500' : ''} ${highlightedOrderId === order.id ? 'ring-2 ring-brand-500' : ''}`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        {/* Sin badge de estado por tarjeta a propósito: la
                            columna (punto de color + "Nuevos/Preparando/
                            Listos") ya lo comunica sin ambigüedad, y
                            repetirlo acá + el tiempo transcurrido en la
                            misma fila se encimaba en columnas angostas de
                            escritorio (3-4 por fila). */}
                        <div className="min-w-0">
                          <span className="text-base font-extrabold text-foreground">#{order.order_number}</span>
                          {/* Antes este contexto solo se veía en la pantalla
                              aparte de Pedidos — al quitarla, Cocina necesita
                              mostrarlo directamente. */}
                          <span className="block truncate text-xs text-muted-foreground">{order.customer_name}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`flex items-center gap-1 text-xs font-bold ${priority ? 'text-danger-500' : 'text-muted-foreground'}`}
                          >
                            {priority ? <Flame size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
                            {elapsed} min
                          </span>
                          <button
                            onClick={() => {
                              dismissOrderToast(order.id)
                              setLabelOrder(order)
                            }}
                            aria-label={t('kitchen.viewLabel', { number: order.order_number })}
                            className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-muted-foreground hover:bg-white/15 hover:text-foreground"
                          >
                            <Printer size={13} aria-hidden="true" />
                          </button>
                          {canCancel && col.status !== 'ready' && (
                            <button
                              onClick={() => openCancelDialog(order)}
                              disabled={busyId === order.id}
                              aria-label={t('common.cancel')}
                              className="grid h-7 w-7 place-items-center rounded-full bg-danger-500/15 text-danger-500 hover:bg-danger-500/25 disabled:opacity-50"
                            >
                              <Ban size={13} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {order.order_items.map((item) => (
                          <li key={item.id} className="border-b border-border pb-2 last:border-0">
                            <p className="font-semibold text-foreground">
                              {item.quantity}× {item.item_name}
                              {item.size_name ? ` (${item.size_name})` : ''}
                            </p>
                            {/* Variante (marca/sabor, Sesión 22) bien
                                visible arriba de todo lo demás — cocina no
                                debería tener que abrir otra pantalla para
                                saber qué sabor preparar/servir. */}
                            {item.variant_name && (
                              <p className="text-sm font-bold text-brand-400">→ {item.variant_name}</p>
                            )}
                            {(item.crust_name || item.sauce_name) && (
                              <p className="text-xs text-muted-foreground">
                                {[item.crust_name, item.sauce_name && withQuantityLabel(item.sauce_name, item.sauce_quantity_level, t)]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                            {item.order_item_toppings.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                +{' '}
                                {item.order_item_toppings
                                  .map((top) => withQuantityLabel(top.topping_name, top.quantity_level, t))
                                  .join(', ')}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {order.notes && (
                        <p className="mt-2 rounded-xl bg-warning-500/10 p-2 text-xs font-semibold text-warning-300">
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
                          <p className="mt-3 rounded-xl bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">
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

        {/* "Completados hoy" no es una cola accionable (no hay tarjetas que
            mover acá) pero necesita verse igual de reconocible que las
            otras tres columnas — mismo tratamiento visual, solo con un
            conteo en vez de una lista. */}
        <div className="min-w-0">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" aria-hidden="true" />
            {t('kitchen.colCompleted')}
          </h2>
          <Card className="flex flex-col items-center justify-center gap-1 p-8 text-center">
            <p className="text-3xl font-extrabold text-foreground">{completedToday}</p>
            <p className="text-xs text-muted-foreground">{t('kitchen.colCompleted')}</p>
          </Card>
        </div>
      </div>

      {/* Recibo del pedido: para imprimir (o guardar como PDF) y pegarlo
          en la caja / archivarlo. Reusa OrderReceipt (variant="sheet")
          en vez de mantener acá una copia propia del ticket — antes esta
          copia local no traía teléfono ni estado del pedido y se iba
          desalineando de a poco de la del cliente. Ver la nota grande
          sobre impresión en globals.css (@media print) para el porqué de
          #order-label-print y por qué el Dialog que lo envuelve necesita
          neutralizarse ahí también. */}
      <Dialog open={!!labelOrder} onOpenChange={(open) => !open && setLabelOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="sr-only">{t('receipt.title')}</DialogTitle>
          {labelOrder && (
            // print:p-0: el margen de la página impresa ya lo pone la regla
            // @page (globals.css) — sumar este padding encima solo dejaría
            // un doble margen innecesario en el PDF.
            <div className="p-6 print:p-0">
              <div id="order-label-print">
                <OrderReceipt order={labelOrder} items={labelOrder.order_items} variant="sheet" />
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
              <DialogTitle className="mb-1 text-lg font-extrabold text-foreground">
                {t('kitchen.sendOrderTitle', { number: assignOrder.order_number })}
              </DialogTitle>
              <p className="mb-4 text-sm text-muted-foreground">{t('kitchen.chooseDriver')}</p>

              {drivers.length === 0 ? (
                <p className="rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
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
                        {d.active_count > 0 ? ` — ${t('kitchen.driverActiveCount', { count: d.active_count })}` : ''}
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

      {cancelOrderTarget && (
        <StaffCancelOrderDialog
          open={!!cancelOrderTarget}
          onOpenChange={(open) => !open && setCancelOrderTarget(null)}
          orderId={cancelOrderTarget.id}
          orderNumber={cancelOrderTarget.order_number}
          onCancelled={() => {
            setCancelOrderTarget(null)
            load()
          }}
        />
      )}
    </div>
  )
}
