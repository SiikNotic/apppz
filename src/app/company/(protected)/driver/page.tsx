'use client'

import { useEffect, useState } from 'react'
import { Bike, MapPin, Phone, Package, CheckCircle2, X, Navigation } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import type { DeliveryAssignment, Driver, Order } from '@/lib/types'

type AssignmentWithOrder = DeliveryAssignment & { order: Order }

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

  return rows
    .map((a) => ({ ...a, order: ordersById.get(a.order_id) as Order }))
    .filter((a) => !!a.order)
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

  async function loadAll() {
    if (!user) return
    const [{ data: driverRow }, activeRows, historyRows] = await Promise.all([
      supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
      fetchAssignmentsWithOrders(ACTIVE_STATUSES, user.id),
      fetchAssignmentsWithOrders(CLOSED_STATUSES, user.id),
    ])
    setDriver(driverRow)
    setActive(activeRows)
    setHistory(historyRows.slice(0, 10))
    setLoading(false)
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
    loadAll()
  }

  async function markFailed(assignmentId: string) {
    if (!confirm('¿Marcar esta entrega como no completada? El pedido pasará a "fallido".')) return
    await updateAssignment(assignmentId, 'failed')
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

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-600">
          Activas <Badge variant="neutral">{active.length}</Badge>
        </h2>
        {active.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <Package size={24} className="text-ink-200" aria-hidden="true" />
            <p className="text-sm text-ink-400">
              {driver?.status === 'available'
                ? 'Sin entregas asignadas todavía. Te avisaremos aquí en cuanto llegue una.'
                : 'Ponte "Disponible" para poder recibir entregas.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((a) => (
              <Card key={a.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-ink-900">#{a.order.order_number}</span>
                  <Badge variant={a.status === 'en_route' ? 'brand' : 'warning'}>
                    {a.status === 'en_route' ? 'En camino' : 'Por recoger'}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm text-ink-600">
                  <p className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
                    {a.order.address || 'Sin dirección registrada'}
                  </p>
                  {a.order.phone && (
                    <a
                      href={`tel:${a.order.phone}`}
                      className="flex items-center gap-2 font-semibold text-brand-900 hover:underline"
                    >
                      <Phone size={16} aria-hidden="true" /> {a.order.phone}
                    </a>
                  )}
                  <p className="font-bold text-ink-900">{formatCurrency(a.order.total)}</p>
                </div>

                <div className="flex gap-2">
                  {a.status === 'assigned' && (
                    <Button
                      fullWidth
                      disabled={busyId === a.id}
                      onClick={() => updateAssignment(a.id, 'en_route')}
                    >
                      <Navigation size={16} aria-hidden="true" /> Voy en camino
                    </Button>
                  )}
                  {a.status === 'en_route' && (
                    <>
                      <Button fullWidth disabled={busyId === a.id} onClick={() => updateAssignment(a.id, 'delivered')}>
                        <CheckCircle2 size={16} aria-hidden="true" /> Entregado
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busyId === a.id}
                        onClick={() => markFailed(a.id)}
                        aria-label="No se pudo entregar"
                      >
                        <X size={16} aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
