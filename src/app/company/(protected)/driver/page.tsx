'use client'

import { useEffect, useState } from 'react'
import {
  Bike,
  MapPin,
  Phone,
  Package,
  CheckCircle2,
  X,
  Navigation,
  ChevronUp,
  ChevronDown,
  PartyPopper,
  Dog,
  KeyRound,
  MessageCircleWarning,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeliveryChat } from '@/components/shared/delivery-chat'
import { ReportProblemDialog } from '@/components/customer/report-problem-dialog'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Address, DeliveryAssignment, Driver, Order } from '@/lib/types'

type AssignmentWithOrder = DeliveryAssignment & { order: Order; address: Address | null }

const ACTIVE_STATUSES = ['assigned', 'en_route'] as const
const CLOSED_STATUSES = ['delivered', 'failed'] as const

async function fetchAssignmentsWithOrders(
  statuses: readonly DeliveryAssignment['status'][],
  driverId: string
): Promise<AssignmentWithOrder[]> {
  const { data: assignments } = await supabase
    .from('delivery_assignments')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', statuses)
    .order('assigned_at', { ascending: false })

  const rows = assignments ?? []
  if (rows.length === 0) return []

  const orderIds = rows.map((a) => a.order_id)
  const { data: orders } = await supabase.from('orders').select('*').in('id', orderIds)
  const ordersById = new Map((orders ?? []).map((o) => [o.id, o]))

  const addressIds = (orders ?? []).map((o) => o.address_id).filter((id): id is string => !!id)
  const { data: addresses } =
    addressIds.length > 0
      ? await supabase.from('addresses').select('*').in('id', addressIds)
      : { data: [] }
  const addressesById = new Map((addresses ?? []).map((a) => [a.id, a]))

  return rows
    .map((a) => {
      const order = ordersById.get(a.order_id) as Order
      return { ...a, order, address: order?.address_id ? (addressesById.get(order.address_id) ?? null) : null }
    })
    .filter((a) => !!a.order)
    // Orden de la cola: preferencia manual del conductor (route_order) si
    // la hay, si no por cuándo se le asignó. No es una optimización de
    // ruta por distancia real — este proyecto no guarda coordenadas de
    // las direcciones todavía (el campo lat/lng de `addresses` existe
    // pero nada lo llena hoy), así que "más cercano" no se puede calcular
    // de verdad sin antes agregar geocoding. Ver nota en el chat.
    .sort((a, b) => {
      if (a.route_order != null && b.route_order != null) return a.route_order - b.route_order
      if (a.route_order != null) return -1
      if (b.route_order != null) return 1
      return new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime()
    })
}

function navigateUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

export default function DriverPage() {
  const { user, profile } = useAuth()
  const isDriver = profile?.company_role === 'driver'

  const [driver, setDriver] = useState<Driver | null>(null)
  const [active, setActive] = useState<AssignmentWithOrder[]>([])
  const [history, setHistory] = useState<AssignmentWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [routeCompletedFlash, setRouteCompletedFlash] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  async function loadAll() {
    if (!user) return
    const wasWorkingOnSomething = active.length > 0
    const [{ data: driverRow }, activeRows, historyRows] = await Promise.all([
      supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
      fetchAssignmentsWithOrders(ACTIVE_STATUSES, user.id),
      fetchAssignmentsWithOrders(CLOSED_STATUSES, user.id),
    ])
    setDriver(driverRow)
    setActive(activeRows)
    setHistory(historyRows.slice(0, 10))
    setLoading(false)
    // Si tenía entregas activas y ahora ya no, la ruta se acaba de
    // completar — se lo hacemos notar en vez de dejarlo caer en el mismo
    // estado vacío de "todavía no te han asignado nada".
    if (wasWorkingOnSomething && activeRows.length === 0) setRouteCompletedFlash(true)
  }

  useEffect(() => {
    if (!user || !isDriver) {
      setLoading(false)
      return
    }
    loadAll()
    const channel = supabase
      .channel(`driver-assignments-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_assignments', filter: `driver_id=eq.${user.id}` },
        loadAll
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDriver])

  async function toggleAvailability() {
    if (!user || !driver) return
    setTogglingStatus(true)
    const next = driver.status === 'available' ? 'offline' : 'available'
    await supabase.from('drivers').update({ status: next }).eq('user_id', user.id)
    setTogglingStatus(false)
    loadAll()
  }

  async function updateAssignment(assignmentId: string, next: 'en_route' | 'delivered' | 'failed') {
    setBusyId(assignmentId)
    setError(null)
    const { error: rpcError } = await supabase.rpc('driver_update_assignment', {
      p_assignment_id: assignmentId,
      p_new_status: next,
    })
    setBusyId(null)
    if (rpcError) {
      // El RPC valida en servidor y regresa un motivo claro (ej. "marca
      // primero que vas en camino"), nunca un "algo salió mal".
      setError(rpcError.message)
      return
    }
    // Al marcar delivered/failed, el chat de esa entrega deja de existir
    // (era efímero — nunca se guardó en ningún lado) y loadAll() trae la
    // siguiente entrega de la cola automáticamente como "actual".
    loadAll()
  }

  async function markFailed(assignmentId: string) {
    if (!confirm('¿Marcar esta entrega como no completada? El pedido pasará a "fallido".')) return
    await updateAssignment(assignmentId, 'failed')
  }

  async function moveInQueue(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= active.length) return
    const a = active[index]
    const b = active[targetIndex]
    const aOrder = a.route_order ?? index
    const bOrder = b.route_order ?? targetIndex
    // Optimista: reordena en pantalla de inmediato, sin esperar la vuelta
    // del servidor — el conductor puede estar reordenando varias veces
    // seguidas y no debería sentir lag en cada tap.
    setActive((prev) => {
      const next = [...prev]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
    await Promise.all([
      supabase.from('delivery_assignments').update({ route_order: bOrder }).eq('id', a.id),
      supabase.from('delivery_assignments').update({ route_order: aOrder }).eq('id', b.id),
    ])
  }

  if (!isDriver) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <Bike size={28} className="text-ink-200" aria-hidden="true" />
        <p className="text-sm text-ink-400">Esta vista es solo para cuentas de conductor.</p>
      </Card>
    )
  }

  if (loading) return <p className="text-sm text-ink-400">Cargando…</p>

  const [current, ...queue] = active

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Mis entregas</h1>
          <p className="text-sm text-ink-400">
            {profile?.full_name ? `Hola, ${profile.full_name.split(' ')[0]}.` : 'Tus pedidos asignados.'}
          </p>
        </div>
        <Button
          size="sm"
          variant={driver?.status === 'available' ? 'default' : 'secondary'}
          disabled={togglingStatus || driver?.status === 'on_delivery'}
          onClick={toggleAvailability}
        >
          {driver?.status === 'on_delivery'
            ? 'En una entrega'
            : driver?.status === 'available'
              ? 'Disponible'
              : 'Desconectado'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-danger-500">
          {error}
        </p>
      )}

      {!current ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          {routeCompletedFlash ? (
            <>
              <PartyPopper size={28} className="text-brand-900" aria-hidden="true" />
              <p className="text-base font-extrabold text-ink-900">¡Ruta completada!</p>
              <p className="text-sm text-ink-400">No te quedan más entregas por ahora. Buen trabajo.</p>
            </>
          ) : (
            <>
              <Package size={24} className="text-ink-200" aria-hidden="true" />
              <p className="text-sm text-ink-400">
                {driver?.status === 'available'
                  ? 'Sin entregas asignadas todavía. Te avisaremos aquí en cuanto llegue una.'
                  : 'Ponte "Disponible" para poder recibir entregas.'}
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Entrega actual — la única en la que el conductor debería estar
              pensando en este momento. Navegar/Llamar/Chat aquí mismo,
              nada de modales de por medio. */}
          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-extrabold text-ink-900">#{current.order.order_number}</span>
              <Badge variant={current.status === 'en_route' ? 'brand' : 'warning'}>
                {current.status === 'en_route' ? 'En camino' : 'Por recoger'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm text-ink-600">
              <p className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  {current.order.address || 'Sin dirección registrada'}
                  {current.address?.apartment && ` · Depto/Unidad: ${current.address.apartment}`}
                </span>
              </p>
              {current.address?.access_code && (
                <p className="flex items-center gap-2 text-warning-500">
                  <KeyRound size={16} className="shrink-0" aria-hidden="true" />
                  Código de acceso: <span className="font-bold">{current.address.access_code}</span>
                </p>
              )}
              {current.address?.dog_warning && (
                <p className="flex items-center gap-2 font-semibold text-danger-500">
                  <Dog size={16} className="shrink-0" aria-hidden="true" /> Cuidado: hay perro en la propiedad
                </p>
              )}
              {(current.address?.instructions || current.address?.delivery_notes) && (
                <p className="rounded-2xl bg-ink-50 p-3 text-xs text-ink-600">
                  {current.address?.instructions}
                  {current.address?.instructions && current.address?.delivery_notes ? ' · ' : ''}
                  {current.address?.delivery_notes}
                </p>
              )}
              {current.notes && (
                <p className="rounded-2xl bg-amber-50 p-3 text-xs text-warning-500">
                  Nota del pedido: {current.notes}
                </p>
              )}
              <p className="font-bold text-ink-900">{formatCurrency(current.order.total)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button asChild fullWidth variant="secondary">
                <a href={navigateUrl(current.order.address || '')} target="_blank" rel="noopener noreferrer">
                  <Navigation size={16} aria-hidden="true" /> Navegar
                </a>
              </Button>
              {current.order.phone ? (
                <Button asChild fullWidth variant="secondary">
                  <a href={`tel:${current.order.phone}`}>
                    <Phone size={16} aria-hidden="true" /> Llamar
                  </a>
                </Button>
              ) : (
                <Button fullWidth variant="secondary" disabled>
                  <Phone size={16} aria-hidden="true" /> Sin teléfono
                </Button>
              )}
            </div>

            <DeliveryChat assignmentId={current.id} role="driver" active />

            <Button fullWidth variant="secondary" onClick={() => setReportOpen(true)}>
              <MessageCircleWarning size={16} aria-hidden="true" /> Reportar un problema
            </Button>

            <div className="flex gap-2 border-t border-ink-100 pt-3">
              {current.status === 'assigned' && (
                <Button
                  fullWidth
                  disabled={busyId === current.id}
                  onClick={() => updateAssignment(current.id, 'en_route')}
                >
                  Voy en camino
                </Button>
              )}
              {current.status === 'en_route' && (
                <>
                  <Button fullWidth disabled={busyId === current.id} onClick={() => updateAssignment(current.id, 'delivered')}>
                    <CheckCircle2 size={16} aria-hidden="true" /> Entregado
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busyId === current.id}
                    onClick={() => markFailed(current.id)}
                    aria-label="No se pudo entregar"
                  >
                    <X size={16} aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </Card>

          <ReportProblemDialog
            open={reportOpen}
            onOpenChange={setReportOpen}
            orderId={current.order.id}
            customerId={user?.id ?? null}
          />

          {/* Cola de siguientes entregas — orden manual del conductor
              (sube/baja), no una ruta óptima calculada (ver nota arriba). */}
          {queue.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                Siguientes ({queue.length})
              </h2>
              <div className="space-y-2">
                {queue.map((a, i) => {
                  const queueIndex = i + 1 // índice real dentro de `active`
                  return (
                    <Card key={a.id} className="flex items-center gap-3 p-3">
                      <div className="flex shrink-0 flex-col">
                        <button
                          onClick={() => moveInQueue(queueIndex, -1)}
                          aria-label="Subir en la cola"
                          className="grid h-6 w-6 place-items-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-900"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => moveInQueue(queueIndex, 1)}
                          disabled={i === queue.length - 1}
                          aria-label="Bajar en la cola"
                          className="grid h-6 w-6 place-items-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          #{a.order.order_number} · {a.order.address || 'Sin dirección'}
                        </p>
                        <p className="text-xs text-ink-400">{formatCurrency(a.order.total)}</p>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-600">Recientes</h2>
          <Card className="divide-y divide-ink-100 p-0">
            {history.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">#{a.order.order_number}</p>
                  <p className="text-xs text-ink-400">{formatDate(a.assigned_at)}</p>
                </div>
                <Badge variant={a.status === 'delivered' ? 'success' : 'danger'}>
                  {a.status === 'delivered' ? 'Entregado' : 'No entregado'}
                </Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
