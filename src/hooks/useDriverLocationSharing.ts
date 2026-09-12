'use client'

// Ubicación GPS del navegador del repartidor. Dos usos distintos:
// 1. Mientras tiene una entrega activa, la escribe en
//    drivers.current_lat/current_lng (limitado a como mínimo cada
//    MIN_INTERVAL_MS para no saturar la base de datos con cada evento de
//    watchPosition) — es lo que alimenta el mapa en vivo del cliente
//    (LiveDeliveryMap) vía postgres_changes.
// 2. Siempre que el navegador la conceda (haya o no entrega activa), la
//    expone en `position` para que el propio conductor se vea a sí mismo
//    en su mapa de ruta (DriverRouteMap) — nunca se comparte a la base de
//    datos fuera de una entrega activa, es puramente para centrar su
//    propio mapa.
//
// Limitación real de PWA/web, no un descuido: esto solo funciona
// mientras el navegador del repartidor sigue con esta pestaña abierta y
// la pantalla encendida — a diferencia de una app nativa, no hay
// tracking en segundo plano. Si el repartidor bloquea el teléfono, el
// cliente deja de ver el punto moverse hasta que lo desbloquee de nuevo.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const MIN_INTERVAL_MS = 5000

export type LocationSharingStatus = 'idle' | 'sharing' | 'denied' | 'unsupported'

interface LatLng {
  lat: number
  lng: number
}

export function useDriverLocationSharing(
  userId: string | undefined,
  active: boolean
): { status: LocationSharingStatus; position: LatLng | null } {
  const [status, setStatus] = useState<LocationSharingStatus>('idle')
  const [position, setPosition] = useState<LatLng | null>(null)
  const lastSentRef = useRef(0)

  useEffect(() => {
    if (!userId) {
      setStatus('idle')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('sharing')
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        if (!active) return
        const now = Date.now()
        if (now - lastSentRef.current < MIN_INTERVAL_MS) return
        lastSentRef.current = now
        supabase
          .from('drivers')
          .update({ current_lat: pos.coords.latitude, current_lng: pos.coords.longitude })
          .eq('user_id', userId)
          .then(() => {})
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unsupported')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [userId, active])

  return { status, position }
}
