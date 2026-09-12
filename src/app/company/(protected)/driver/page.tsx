'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
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
  LocateFixed,
  Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeliveryChat } from '@/components/shared/delivery-chat'
import { ReportProblemDialog } from '@/components/customer/report-problem-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/company/page-header'
import { useDriverLocationSharing } from '@/hooks/useDriverLocationSharing'
import { fetchAssignmentsWithOrders, ACTIVE_STATUSES, type AssignmentWithOrder } from '@/lib/driverAssignments'
import { resolveDeliveryLocation } from '@/lib/geo'
import type { RouteStop } from '@/components/company/driver/driver-route-map'
import { formatCurrency, formatDate } from '@/lib/format'
import { BRAND_NAME } from '@/lib/config'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { Driver, DriverShift } from '@/lib/types'

// mapbox-gl necesita `window` — con export estático, evaluarlo durante el
// build de prerenderizado rompería el build (mismo patrón que
// (customer)/order/page.tsx con LiveDeliveryMap).
const DriverRouteMap = dynamic(
  () => import('@/components/company/driver/driver-route-map').then((m) => m.DriverRouteMap),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse bg-ink-100" /> }
)

interface LatLng {
  lat: number
  lng: number
}

function navigateUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

export default function DriverPage() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const isDriver = profile?.company_role === 'driver'

  const [driver, setDriver] = useState<Driver | null>(null)
  const [active, setActive] = useState<AssignmentWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [routeCompletedFlash, setRouteCompletedFlash] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  // Un solo registro de turno: antes había dos controles separados
  // (Disponible/Offline arriba, Marcar entrada/salida en su propia
  // tarjeta) que confundían — "estoy trabajando" y "puedo recibir una
  // entrega" son, en la práctica, la misma decisión para un conductor de
  // esta cocina. Marcar entrada abre el turno Y pone status=available a
  // la vez; marcar salida cierra el turno Y pone status=offline. El
  // estado "on_delivery" sigue siendo del sistema, no algo que el
  // conductor active a mano — por eso no tiene botón, solo una etiqueta.
  const [openShift, setOpenShift] = useState<DriverShift | null>(null)
  const [shiftBusy, setShiftBusy] = useState(false)
  // Cobro de efectivo: driver_update_assignment ya rechaza "entregado" en
  // el servidor si el pedido es en efectivo y no se confirmó el cobro —
  // esto solo hace que la interfaz lo pida antes de intentarlo.
  const [cashBusy, setCashBusy] = useState(false)

  // Comparte la ubicación GPS en drivers.current_lat/lng mientras haya
  // una entrega activa (para el mapa en vivo del cliente, LiveDeliveryMap)
  // y siempre expone `position` para que el conductor se vea a sí mismo en
  // su propio mapa de ruta (DriverRouteMap), haya o no entrega activa.
  // Debe llamarse antes de cualquier return temprano (reglas de hooks).
  const { status: locationSharing, position: driverPos } = useDriverLocationSharing(user?.id, active.length > 0)

  // Punto de recogida fijo (Configuración → Ubicación del restaurante) —
  // lectura pública, no depende de que haya una entrega.
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null)
  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['restaurant.lat', 'restaurant.lng'])
      .then(({ data }) => {
        const byKey: Record<string, unknown> = {}
        for (const row of data ?? []) byKey[row.key] = row.value
        const lat = byKey['restaurant.lat']
        const lng = byKey['restaurant.lng']
        if (typeof lat === 'number' && typeof lng === 'number') setPickupLocation({ lat, lng })
      })
  }, [])

  // Coordenadas de cada parada de la cola (misma resolución que usa el
  // cliente para rastrear su pedido — ver resolveDeliveryLocation).
  // Cacheado por assignment.id para no re-geocodificar en cada refresh de
  // loadAll() una dirección que ya se resolvió.
  const [stopLocations, setStopLocations] = useState<Record<string, LatLng>>({})
  const resolvingRef = useRef(new Set<string>())
  useEffect(() => {
    for (const a of active) {
      if (stopLocations[a.id] || resolvingRef.current.has(a.id)) continue
      resolvingRef.current.add(a.id)
      resolveDeliveryLocation(a.order).then((loc) => {
        resolvingRef.current.delete(a.id)
        if (loc) setStopLocations((prev) => ({ ...prev, [a.id]: loc }))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo dispara con cambios reales de `active`
  }, [active])

  async function loadAll() {
    if (!user) return
    const wasWorkingOnSomething = active.length > 0
    const [{ data: driverRow }, activeRows, { data: shiftRow }] = await Promise.all([
      supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
      fetchAssignmentsWithOrders(ACTIVE_STATUSES, user.id),
      supabase.from('driver_shifts').select('*').eq('driver_id', user.id).is('clock_out_at', null).maybeSingle(),
    ])
    setDriver(driverRow)
    setActive(activeRows)
    setOpenShift(shiftRow)
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

  async function clockIn() {
    if (!user) return
    setShiftBusy(true)
    await Promise.all([
      supabase.from('driver_shifts').insert({ driver_id: user.id }),
      supabase.from('drivers').update({ status: 'available' }).eq('user_id', user.id),
    ])
    setShiftBusy(false)
    loadAll()
  }

  async function clockOut() {
    if (!user || !openShift) return
    setShiftBusy(true)
    await Promise.all([
      supabase.from('driver_shifts').update({ clock_out_at: new Date().toISOString() }).eq('id', openShift.id),
      supabase.from('drivers').update({ status: 'offline' }).eq('user_id', user.id),
    ])
    setShiftBusy(false)
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

  async function confirmCashCollected(orderId: string) {
    setCashBusy(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('driver_confirm_cash_collected', { p_order_id: orderId })
    setCashBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    loadAll()
  }

  async function markFailed(assignmentId: string) {
    if (!confirm(t('driverPage.confirmMarkFailed'))) return
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
    return <EmptyState icon={<Bike size={28} aria-hidden="true" />} message={t('driverPage.notDriverOnly')} />
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  const [current, ...queue] = active
  const isOnDelivery = driver?.status === 'on_delivery'
  const isClockedIn = !!openShift
  const needsCashConfirm = !!current && current.order.payment_method === 'Efectivo' && current.order.payment_status !== 'paid'

  // Paradas para el mapa de ruta, en el mismo orden que la cola visible
  // (1 = entrega actual) — solo las que ya se lograron geocodificar.
  const routeStops: RouteStop[] = active
    .map((a, i) => {
      const loc = stopLocations[a.id]
      return loc ? { id: a.id, lat: loc.lat, lng: loc.lng, sequence: i + 1 } : null
    })
    .filter((s): s is RouteStop => s !== null)

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('driverPage.title')}
        subtitle={
          profile?.full_name
            ? t('driverPage.greeting', { name: profile.full_name.split(' ')[0] })
            : t('driverPage.subtitleFallback')
        }
      />

      {/* Un solo control de turno/disponibilidad — ver nota junto a
          openShift más arriba sobre por qué se fusionaron los dos que
          había antes. */}
      <Card
        className={cn(
          'flex items-center justify-between gap-3 border-l-4 p-4',
          isOnDelivery
            ? 'border-l-brand-500 bg-brand-50'
            : isClockedIn
              ? 'border-l-success-500 bg-success-500/5'
              : 'border-l-ink-200'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
              isOnDelivery ? 'bg-brand-500 text-white' : isClockedIn ? 'bg-success-500 text-white' : 'bg-ink-100 text-ink-400'
            )}
          >
            {isClockedIn ? <Bike size={20} aria-hidden="true" /> : <Clock size={20} aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink-900">
              {isOnDelivery ? t('driverPage.statusOnDelivery') : isClockedIn ? t('driverPage.shiftActive') : t('driversAdmin.noShiftStarted')}
            </p>
            <p className="truncate text-xs text-ink-400">
              {openShift ? t('teamAdmin.sinceDate', { date: formatDate(openShift.clock_in_at) }) : t('driverPage.shiftPromptOffline')}
            </p>
          </div>
        </div>
        {isOnDelivery ? (
          <Badge variant="brand">{t('driverPage.statusOnDelivery')}</Badge>
        ) : isClockedIn ? (
          <Button size="sm" variant="secondary" disabled={shiftBusy} onClick={clockOut}>
            {shiftBusy ? t('menuMgmt.savingButton') : t('driverPage.clockOut')}
          </Button>
        ) : (
          <Button size="sm" disabled={shiftBusy} onClick={clockIn}>
            {shiftBusy ? t('menuMgmt.savingButton') : t('driverPage.clockIn')}
          </Button>
        )}
      </Card>

      {(locationSharing === 'denied' || locationSharing === 'unsupported') && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-warning-500">
          <LocateFixed size={16} className="shrink-0" aria-hidden="true" />
          {locationSharing === 'denied' ? t('driverPage.locationSharingDenied') : t('driverPage.locationSharingUnsupported')}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-danger-500">
          {error}
        </p>
      )}

      {!current ? (
        // Sin entregas: mapa centrado en el propio conductor (si compartió
        // ubicación) con el punto de recogida como referencia — mismo
        // vistazo "esperando" de cualquier app de reparto, pero sin
        // fabricar un estimado de espera ni una zona de cobertura que este
        // proyecto no tiene definida en ningún lado.
        <Card className="overflow-hidden p-0">
          <DriverRouteMap driverPos={driverPos} pickup={pickupLocation} pickupLabel={BRAND_NAME} stops={[]} heightClassName="h-56" />
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            {routeCompletedFlash ? (
              <>
                <PartyPopper size={28} className="text-brand-900" aria-hidden="true" />
                <p className="text-base font-extrabold text-ink-900">{t('driverPage.routeCompletedTitle')}</p>
                <p className="text-sm text-ink-400">{t('driverPage.routeCompletedBody')}</p>
              </>
            ) : (
              <>
                <Package size={24} className="text-ink-200" aria-hidden="true" />
                <p className="text-sm text-ink-400">
                  {isClockedIn ? t('driverPage.noAssignmentsAvailable') : t('driverPage.goAvailablePrompt')}
                </p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Entrega actual — la única en la que el conductor debería estar
              pensando en este momento. La franja de color de arriba marca
              de un vistazo en qué paso de la entrega va (recoger vs en
              camino), como en cualquier app de reparto de verdad — antes
              era solo un badge chico flotando en una tarjeta blanca plana. */}
          <Card className="overflow-hidden p-0">
            <div
              className={cn(
                'flex items-center justify-between px-4 py-3',
                current.status === 'en_route' ? 'bg-brand-500 text-white' : 'bg-ink-900 text-white'
              )}
            >
              <span className="text-base font-extrabold">#{current.order.order_number}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-white/90">
                {current.status === 'en_route' ? t('driverPage.enRoute') : t('driverPage.toPickup')}
              </span>
            </div>

            {/* Ruta: recogida + cada parada de la cola numerada en el
                mismo orden que la lista de abajo — si cocina te manda más
                pedidos, aparecen aquí como los siguientes puntos. */}
            <DriverRouteMap
              driverPos={driverPos}
              pickup={pickupLocation}
              pickupLabel={BRAND_NAME}
              stops={routeStops}
              heightClassName="h-52"
            />

            <div className="space-y-4 p-4">
              <div className="space-y-2 text-sm text-ink-600">
                <p className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
                  <span>
                    {current.order.address || t('driverPage.noAddress')}
                    {current.address?.apartment && ` · ${t('driverPage.apartmentPrefix')} ${current.address.apartment}`}
                  </span>
                </p>
                {current.address?.access_code && (
                  <p className="flex items-center gap-2 text-warning-500">
                    <KeyRound size={16} className="shrink-0" aria-hidden="true" />
                    {t('driverPage.accessCode')} <span className="font-bold">{current.address.access_code}</span>
                  </p>
                )}
                {current.address?.dog_warning && (
                  <p className="flex items-center gap-2 font-semibold text-danger-500">
                    <Dog size={16} className="shrink-0" aria-hidden="true" /> {t('driverPage.dogWarning')}
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
                    {t('driverPage.orderNote')} {current.notes}
                  </p>
                )}
                <div className="flex items-baseline justify-between">
                  <p className="text-lg font-extrabold text-ink-900">
                    {formatCurrency(current.order.total + current.order.tip_amount)}
                  </p>
                  {current.order.tip_amount > 0 && (
                    <p className="text-xs font-semibold text-success-500">
                      {t('driverPage.tipIncluded', { amount: formatCurrency(current.order.tip_amount) })}
                    </p>
                  )}
                </div>
              </div>

              {/* Efectivo: el conductor tiene que cobrar antes de poder
                  marcar la entrega como completada — driver_update_assignment
                  ya lo rechaza en el servidor si esto no se confirma primero. */}
              {current.order.payment_method === 'Efectivo' && (
                <div
                  className={cn(
                    'rounded-2xl border-2 p-3.5',
                    needsCashConfirm ? 'border-warning-500 bg-amber-50' : 'border-success-500 bg-success-500/5'
                  )}
                >
                  <p className={cn('text-sm font-bold', needsCashConfirm ? 'text-warning-500' : 'text-success-500')}>
                    {needsCashConfirm
                      ? t('driverPage.cashToCollect', { amount: formatCurrency(current.order.total + current.order.tip_amount) })
                      : t('driverPage.cashConfirmed')}
                  </p>
                  {needsCashConfirm && (
                    <Button
                      fullWidth
                      size="sm"
                      className="mt-2"
                      disabled={cashBusy}
                      onClick={() => confirmCashCollected(current.order.id)}
                    >
                      {cashBusy ? t('menuMgmt.savingButton') : t('driverPage.confirmCashCollected')}
                    </Button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button asChild fullWidth>
                  <a href={navigateUrl(current.order.address || '')} target="_blank" rel="noopener noreferrer">
                    <Navigation size={16} aria-hidden="true" /> {t('driverPage.navigate')}
                  </a>
                </Button>
                {current.order.phone ? (
                  <Button asChild fullWidth variant="secondary">
                    <a href={`tel:${current.order.phone}`}>
                      <Phone size={16} aria-hidden="true" /> {t('driverPage.call')}
                    </a>
                  </Button>
                ) : (
                  <Button fullWidth variant="secondary" disabled>
                    <Phone size={16} aria-hidden="true" /> {t('driverPage.noPhone')}
                  </Button>
                )}
              </div>

              <DeliveryChat assignmentId={current.id} role="driver" active />

              <Button fullWidth variant="secondary" onClick={() => setReportOpen(true)}>
                <MessageCircleWarning size={16} aria-hidden="true" /> {t('driverPage.reportProblem')}
              </Button>

              <div className="flex gap-2 border-t border-ink-100 pt-3">
                {current.status === 'assigned' && (
                  <Button
                    fullWidth
                    disabled={busyId === current.id}
                    onClick={() => updateAssignment(current.id, 'en_route')}
                  >
                    {t('driverPage.onTheWay')}
                  </Button>
                )}
                {current.status === 'en_route' && (
                  <>
                    <Button
                      fullWidth
                      disabled={busyId === current.id || needsCashConfirm}
                      title={needsCashConfirm ? t('driverPage.cashConfirmFirst') : undefined}
                      onClick={() => updateAssignment(current.id, 'delivered')}
                    >
                      <CheckCircle2 size={16} aria-hidden="true" /> {t('driverPage.delivered')}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busyId === current.id}
                      onClick={() => markFailed(current.id)}
                      aria-label={t('driverPage.cannotDeliverAria')}
                    >
                      <X size={16} aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          <ReportProblemDialog
            open={reportOpen}
            onOpenChange={setReportOpen}
            orderId={current.order.id}
            customerId={user?.id ?? null}
          />

          {/* Cola de siguientes entregas — orden manual del conductor
              (sube/baja), no una ruta óptima calculada (ver nota arriba).
              El número en el círculo continúa la numeración de la entrega
              actual (que es la "1" implícita), para que se sienta como
              una sola ruta y no una lista suelta de pedidos. */}
          {queue.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                {t('driverPage.nextCount', { count: queue.length })}
              </h2>
              <div className="space-y-2">
                {queue.map((a, i) => {
                  const queueIndex = i + 1 // índice real dentro de `active`
                  return (
                    <Card key={a.id} className="flex items-center gap-3 p-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-100 text-sm font-extrabold text-ink-600">
                        {i + 2}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          #{a.order.order_number} · {a.order.address || t('driverPage.noAddressShort')}
                        </p>
                        <p className="text-xs text-ink-400">{formatCurrency(a.order.total)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col">
                        <button
                          onClick={() => moveInQueue(queueIndex, -1)}
                          aria-label={t('driverPage.moveUpAria')}
                          className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-900"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => moveInQueue(queueIndex, 1)}
                          disabled={i === queue.length - 1}
                          aria-label={t('driverPage.moveDownAria')}
                          className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-30"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
