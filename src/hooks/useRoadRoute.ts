'use client'

// Ruta real por calles con recálculo controlado — pensado para un punto
// MÓVIL (la posición GPS del conductor, que llega ya throttleada a ~5s
// desde useDriverLocationSharing) seguido de uno o más puntos FIJOS
// (recogida, parada(s), destino). Nunca pide una ruta nueva en cada tick
// de GPS: solo cuando cambia algún punto fijo, cuando el punto móvil
// avanzó lo suficiente, o cuando se desvió de la ruta ya trazada — con un
// piso mínimo de tiempo entre pedidos como red de seguridad adicional.
import { useEffect, useRef, useState } from 'react'
import { fetchRoadRoute, distanceMeters, distanceToRouteMeters, type LatLng } from '@/lib/directions'
import { MAPBOX_TOKEN } from '@/lib/mapbox'

export type RoadRouteStatus = 'idle' | 'loading' | 'ready' | 'error'

// Qué tan lejos tiene que avanzar el punto móvil (en metros) para que
// valga la pena volver a pedir la ruta — evita recalcular por el ruido
// normal del GPS (unos pocos metros de un tick a otro) sin dejar que la
// línea se desactualice mientras el conductor sí avanza de verdad.
const MIN_RECALC_METERS = 60
// Si la posición vigente queda más lejos que esto de CUALQUIER punto de
// la ruta ya trazada, se considera un desvío real (dobló por otra calle,
// tomó un desvío) y amerita recalcular ya, no esperar el próximo avance
// "normal" de MIN_RECALC_METERS.
const DEVIATION_METERS = 120
// Piso duro entre pedidos a la API, pase lo que pase (incluido un
// desvío) — protege contra ruido de GPS oscilando justo en el borde de
// alguno de los umbrales de arriba.
const MIN_INTERVAL_MS = 8000
// Dos puntos a menos de esto se tratan como "el mismo" al comparar contra
// el último fijo usado — evita recalcular por el ruido de reponer un
// mismo valor de geocoding con un redondeo distinto.
const SAME_POINT_METERS = 5

function sameFixedPoints(a: LatLng[], b: LatLng[]): boolean {
  if (a.length !== b.length) return false
  return a.every((p, i) => distanceMeters(p, b[i]) < SAME_POINT_METERS)
}

/**
 * `points`: [móvil, fijo1, fijo2, ...] — típicamente
 * [posiciónDelConductor, destino] (cliente rastreando) o
 * [posiciónDelConductor, recogida, ...paradas] (conductor navegando).
 * `null` en cualquier posición significa "todavía no hay suficiente
 * información" — no se pide ninguna ruta y se devuelve coordinates=null.
 */
export function useRoadRoute(points: (LatLng | null)[]): {
  coordinates: [number, number][] | null
  status: RoadRouteStatus
} {
  const [coordinates, setCoordinates] = useState<[number, number][] | null>(null)
  const [status, setStatus] = useState<RoadRouteStatus>('idle')
  const coordinatesRef = useRef<[number, number][] | null>(null)
  const lastFetchRef = useRef<{ points: LatLng[]; at: number } | null>(null)
  const requestSeqRef = useRef(0)

  useEffect(() => {
    coordinatesRef.current = coordinates
  }, [coordinates])

  const validPoints = points.every((p): p is LatLng => p !== null) ? (points as LatLng[]) : null
  // Clave estable (~1m de resolución) para el arreglo de dependencias del
  // efecto de abajo — sin esto, un nuevo array (misma posición, otra
  // referencia) dispararía el efecto en cada render sin necesidad. 5
  // decimales de lat/lng ≈ 1.1m, suficiente para no perder movimiento
  // real del GPS ni disparar por ruido de punto flotante.
  const pointsKey = validPoints ? validPoints.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|') : null

  useEffect(() => {
    if (!validPoints || validPoints.length < 2 || !MAPBOX_TOKEN) {
      setCoordinates(null)
      setStatus('idle')
      lastFetchRef.current = null
      return
    }

    const last = lastFetchRef.current
    const now = Date.now()
    const [movingNow, ...fixedNow] = validPoints
    const fixedLast = last ? last.points.slice(1) : []

    const destinationsChanged = !last || !sameFixedPoints(fixedNow, fixedLast)
    const movedEnough = !last || distanceMeters(movingNow, last.points[0]) >= MIN_RECALC_METERS
    const currentRoute = coordinatesRef.current
    const deviated = !!currentRoute && distanceToRouteMeters(movingNow, currentRoute) >= DEVIATION_METERS
    const cooldownElapsed = !last || now - last.at >= MIN_INTERVAL_MS

    const shouldFetch = !last || destinationsChanged || ((movedEnough || deviated) && cooldownElapsed)
    if (!shouldFetch) return

    const seq = ++requestSeqRef.current
    lastFetchRef.current = { points: validPoints, at: now }
    setStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'))

    fetchRoadRoute(validPoints, MAPBOX_TOKEN).then((result) => {
      // Una petición más nueva ya salió (o ya volvió) mientras esta
      // seguía en vuelo — se descarta para no pisar un resultado más
      // reciente con uno viejo que tardó más en responder.
      if (seq !== requestSeqRef.current) return
      if (result) {
        setCoordinates(result.coordinates)
        setStatus('ready')
      } else {
        // Se deja la última ruta buena (si había) tal cual — es mejor
        // fallback que borrarla; el estado 'error' le sirve a quien
        // consume el hook para decidir si además muestra un aviso (solo
        // hace falta si NUNCA hubo una ruta, ver los componentes de mapa).
        setStatus('error')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se decide manualmente arriba cuándo re-pedir (throttle/desvío), no en cada cambio de referencia de `points`
  }, [pointsKey])

  return { coordinates, status }
}
