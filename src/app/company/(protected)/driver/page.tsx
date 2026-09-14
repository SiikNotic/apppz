'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
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
  User,
  Wallet,
  Check,
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
import { useDriverShift } from '@/hooks/useDriverShift'
import { fetchAssignmentsWithOrders, ACTIVE_STATUSES, type AssignmentWithOrder } from '@/lib/driverAssignments'
import { resolveDeliveryLocation, distanceKm } from '@/lib/geo'
import type { RouteStop } from '@/components/company/driver/driver-route-map'
import { formatCurrency, formatDate } from '@/lib/format'
import { BRAND_NAME } from '@/lib/config'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { Driver } from '@/lib/types'

// mapbox-gl necesita `window` — con export estático, evaluarlo durante el
// build de prerenderizado rompería el build (mismo patrón que
// (customer)/order/page.tsx con LiveDeliveryMap).
const DriverRouteMap = dynamic(
  () => import('@/components/company/driver/driver-route-map').then((m) => m.DriverRouteMap),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse bg-muted" /> }
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
  const [advancingFlash, setAdvancingFlash] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  // Fichaje: el botón de entrada/salida vive en el menú lateral (mismo
  // lugar que el resto del personal), esta pantalla solo muestra el
  // estado (useDriverShift, compartido con ese botón). El estado
  // "on_delivery" sigue siendo del sistema, no algo que el conductor
  // active a mano — por eso no tiene botón, solo una etiqueta.
  const { openShift } = useDriverShift(user?.id)
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
  // lectura pública, no depende de que haya una entrega. La dirección en
  // texto es la misma que ya guarda esa pantalla (restaurant.address);
  // solo la mostramos, nunca la calculamos.
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null)
  const [pickupAddress, setPickupAddress] = useState<string | null>(null)
  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['restaurant.lat', 'restaurant.lng', 'restaurant.address'])
      .then(({ data }) => {
        const byKey: Record<string, unknown> = {}
        for (const row of data ?? []) byKey[row.key] = row.value
        const lat = byKey['restaurant.lat']
        const lng = byKey['restaurant.lng']
        if (typeof lat === 'number' && typeof lng === 'number') setPickupLocation({ lat, lng })
        if (typeof byKey['restaurant.address'] === 'string') setPickupAddress(byKey['restaurant.address'])
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
    const previousCurrentId = active[0]?.id ?? null
    const [{ data: driverRow }, activeRows] = await Promise.all([
      supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
      fetchAssignmentsWithOrders(ACTIVE_STATUSES, user.id),
    ])
    setDriver(driverRow)
    setActive(activeRows)
    setLoading(false)
    // Si tenía entregas activas y ahora ya no, la ruta se acaba de
    // completar — se lo hacemos notar en vez de dejarlo caer en el mismo
    // estado vacío de "todavía no te han asignado nada".
    if (wasWorkingOnSomething && activeRows.length === 0) setRouteCompletedFlash(true)
    // Si la entrega "actual" cambió (la de antes ya no está, pero hay una
    // nueva en su lugar), la interfaz ya avanzó sola a la siguiente de la
    // cola — se lo confirmamos con un aviso breve en vez de que la
    // tarjeta cambie de golpe sin explicación.
    const newCurrentId = activeRows[0]?.id ?? null
    if (previousCurrentId && newCurrentId && previousCurrentId !== newCurrentId) {
      setAdvancingFlash(true)
      setTimeout(() => setAdvancingFlash(false), 3000)
    }
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

  // Distancia real en línea recta entre el conductor y su entrega actual
  // — solo cuando ambos puntos son reales (su GPS y la dirección ya
  // geocodificada). Deliberadamente sin un "tiempo estimado" derivado de
  // esto: ver la nota en distanceKm (lib/geo.ts) sobre por qué convertir
  // distancia a minutos aquí sería inventar un dato, no calcularlo.
  const currentLoc = current ? stopLocations[current.id] : null
  const currentDistanceKm = driverPos && currentLoc ? distanceKm(driverPos, currentLoc) : null

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('driverPage.title')}
        subtitle={
          profile?.full_name
            ? t('driverPage.greeting', { name: profile.full_name.split(' ')[0] })
            : t('driverPage.subtitleFallback')
        }
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/company/driver/earnings">
              <Wallet size={14} aria-hidden="true" /> {t('driverPage.earningsShortcut')}
            </Link>
          </Button>
        }
      />

      {/* Solo lectura — el botón de entrada/salida vive en el menú
          lateral (ver nota junto a useDriverShift más arriba). */}
      <Card
        className={cn(
          'flex items-center justify-between gap-3 border-l-4 p-4',
          isOnDelivery
            ? 'border-l-brand-500 bg-brand-500/10'
            : isClockedIn
              ? 'border-l-success-500 bg-success-500/5'
              : 'border-l-border'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
              isOnDelivery ? 'bg-brand-500 text-white' : isClockedIn ? 'bg-success-500 text-white' : 'bg-white/10 text-muted-foreground'
            )}
          >
            {isClockedIn ? <Bike size={20} aria-hidden="true" /> : <Clock size={20} aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-foreground">
              {isOnDelivery ? t('driverPage.statusOnDelivery') : isClockedIn ? t('driverPage.shiftActive') : t('driversAdmin.noShiftStarted')}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {openShift ? t('teamAdmin.sinceDate', { date: formatDate(openShift.clock_in_at) }) : t('driverPage.shiftPromptOffline')}
            </p>
          </div>
        </div>
        {isOnDelivery ? (
          <Badge variant="brand">{t('driverPage.statusOnDelivery')}</Badge>
        ) : isClockedIn ? (
          <Badge variant="success">{t('driverPage.shiftActive')}</Badge>
        ) : (
          <Badge variant="neutral">{t('driversAdmin.statusOffline')}</Badge>
        )}
      </Card>

      {(locationSharing === 'denied' || locationSharing === 'unsupported') && (
        <p className="flex items-center gap-2 rounded-2xl bg-warning-500/10 p-3 text-xs font-semibold text-warning-300">
          <LocateFixed size={16} className="shrink-0" aria-hidden="true" />
          {locationSharing === 'denied' ? t('driverPage.locationSharingDenied') : t('driverPage.locationSharingUnsupported')}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-500">
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
                <PartyPopper size={28} className="text-brand-400" aria-hidden="true" />
                <p className="text-base font-extrabold text-foreground">{t('driverPage.routeCompletedTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('driverPage.routeCompletedBody')}</p>
              </>
            ) : (
              <>
                <Package size={24} className="text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  {isClockedIn ? t('driverPage.noAssignmentsAvailable') : t('driverPage.goAvailablePrompt')}
                </p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {advancingFlash && (
            <p className="flex items-center gap-2 rounded-2xl bg-success-500/10 p-3 text-xs font-semibold text-success-500">
              <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
              {t('driverPage.advancingToNext')}
            </p>
          )}

          {/* Entrega actual — la única en la que el conductor debería estar
              pensando en este momento. La franja de color de arriba + el
              indicador de 3 pasos debajo marcan de un vistazo en qué paso
              va la entrega, como en cualquier app de reparto de verdad —
              antes era solo un badge chico flotando en una tarjeta blanca
              plana. Son 3 pasos, no 4: el sistema solo distingue
              assigned/en_route/delivered — no existe un estado separado de
              "recogido" (ver delivery_assignment_status), así que ese paso
              se fusiona con "en camino" en vez de inventar una marca de
              tiempo de recogida que este proyecto no guarda. */}
          <Card className="overflow-hidden p-0">
            <div
              className={cn(
                'px-4 pt-3.5 pb-3',
                current.status === 'en_route' ? 'bg-brand-500 text-white' : 'bg-ink-900 text-white'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold">#{current.order.order_number}</span>
                <span className="text-xs font-bold uppercase tracking-wide text-white/90">
                  {current.status === 'en_route' ? t('driverPage.enRoute') : t('driverPage.toPickup')}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5" role="status" aria-label={t('driverPage.enRoute')}>
                {(['assigned', 'en_route', 'delivered'] as const).map((stage, i) => {
                  const stageIndex = ['assigned', 'en_route', 'delivered'].indexOf(current.status)
                  const reached = i <= stageIndex
                  return (
                    <div key={stage} className="flex flex-1 items-center gap-1.5 last:flex-none">
                      <span
                        className={cn(
                          'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold',
                          reached ? 'bg-white text-ink-900' : 'bg-white/25 text-white/70'
                        )}
                      >
                        {reached ? <Check size={12} aria-hidden="true" /> : i + 1}
                      </span>
                      {i < 2 && <span className={cn('h-0.5 flex-1 rounded-full', reached ? 'bg-white' : 'bg-white/25')} />}
                    </div>
                  )
                })}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-white/70">
                <span>{t('driverPage.stageAssigned')}</span>
                <span>{t('driverPage.enRoute')}</span>
                <span>{t('driverPage.delivered')}</span>
              </div>
            </div>

            {/* Mapa como elemento visual principal: recogida + cada parada
                de la cola numerada en el mismo orden que la lista de abajo
                — si cocina te manda más pedidos, aparecen aquí como los
                siguientes puntos. */}
            <DriverRouteMap
              driverPos={driverPos}
              pickup={pickupLocation}
              pickupLabel={BRAND_NAME}
              stops={routeStops}
              heightClassName="h-64"
            />

            {/* Acciones inmediatas junto al mapa — navegar, llamar o
                chatear con el cliente, sin tener que bajar entre bloques
                de texto para encontrarlas. El chat va en su propia fila
                (su texto de botón no cabe en un tercio de columna en
                mobile, y no se le puede acortar sin tocar su componente,
                que debe quedar intacto — ver DeliveryChat). */}
            <div className="space-y-2 border-b border-border p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button asChild fullWidth size="lg">
                  <a href={navigateUrl(current.order.address || '')} target="_blank" rel="noopener noreferrer">
                    <Navigation size={18} aria-hidden="true" /> {t('driverPage.navigate')}
                  </a>
                </Button>
                {current.order.phone ? (
                  <Button asChild fullWidth size="lg" variant="secondary">
                    <a href={`tel:${current.order.phone}`}>
                      <Phone size={18} aria-hidden="true" /> {t('driverPage.call')}
                    </a>
                  </Button>
                ) : (
                  <Button fullWidth size="lg" variant="secondary" disabled>
                    <Phone size={18} aria-hidden="true" /> {t('driverPage.noPhone')}
                  </Button>
                )}
              </div>
              <DeliveryChat assignmentId={current.id} role="driver" active />
            </div>

            <div className="space-y-4 p-4">
              {pickupAddress && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Package size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>
                    <span className="font-semibold text-foreground">{t('driverPage.pickupAt')}</span> {pickupAddress}
                  </span>
                </p>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                {current.order.customer_name && (
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <User size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    {current.order.customer_name}
                  </p>
                )}
                <p className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>
                    {current.order.address || t('driverPage.noAddress')}
                    {current.address?.apartment && ` · ${t('driverPage.apartmentPrefix')} ${current.address.apartment}`}
                  </span>
                </p>
                {currentDistanceKm != null && (
                  <p className="pl-6 text-xs font-semibold text-brand-400">
                    {t('driverPage.distanceAway', {
                      distance: currentDistanceKm < 1 ? `${Math.round(currentDistanceKm * 1000)} m` : `${currentDistanceKm.toFixed(1)} km`,
                    })}
                  </p>
                )}
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
                  <p className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                    {current.address?.instructions}
                    {current.address?.instructions && current.address?.delivery_notes ? ' · ' : ''}
                    {current.address?.delivery_notes}
                  </p>
                )}
                {current.notes && (
                  <p className="rounded-2xl bg-warning-500/10 p-3 text-xs text-warning-300">
                    {t('driverPage.orderNote')} {current.notes}
                  </p>
                )}
                <div className="flex items-baseline justify-between border-t border-border pt-3">
                  <p className="text-lg font-extrabold text-foreground">
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
                    needsCashConfirm ? 'border-warning-500 bg-warning-500/10' : 'border-success-500 bg-success-500/5'
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

              <button
                onClick={() => setReportOpen(true)}
                className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <MessageCircleWarning size={14} className="mr-1 inline-block" aria-hidden="true" /> {t('driverPage.reportProblem')}
              </button>

              {/* Acciones de estado — botones grandes para uso con guantes
                  o mientras se sostiene el teléfono con una mano. */}
              <div className="flex gap-2 border-t border-border pt-3">
                {current.status === 'assigned' && (
                  <Button
                    fullWidth
                    size="lg"
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
                      size="lg"
                      disabled={busyId === current.id || needsCashConfirm}
                      title={needsCashConfirm ? t('driverPage.cashConfirmFirst') : undefined}
                      onClick={() => updateAssignment(current.id, 'delivered')}
                    >
                      <CheckCircle2 size={18} aria-hidden="true" /> {t('driverPage.delivered')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      disabled={busyId === current.id}
                      onClick={() => markFailed(current.id)}
                      aria-label={t('driverPage.cannotDeliverAria')}
                    >
                      <X size={18} aria-hidden="true" />
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
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t('driverPage.nextCount', { count: queue.length })}
              </h2>
              <div className="space-y-2">
                {queue.map((a, i) => {
                  const queueIndex = i + 1 // índice real dentro de `active`
                  return (
                    <Card key={a.id} className="flex items-center gap-3 p-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-extrabold text-muted-foreground">
                        {i + 2}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          #{a.order.order_number} · {a.order.address || t('driverPage.noAddressShort')}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(a.order.total)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col">
                        <button
                          onClick={() => moveInQueue(queueIndex, -1)}
                          aria-label={t('driverPage.moveUpAria')}
                          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        >
                          <ChevronUp size={16} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => moveInQueue(queueIndex, 1)}
                          disabled={i === queue.length - 1}
                          aria-label={t('driverPage.moveDownAria')}
                          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown size={16} aria-hidden="true" />
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
