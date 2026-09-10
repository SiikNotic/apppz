'use client'

// Selector de dirección tocando el mapa — alternativa a escribirla a
// mano en el formulario de account/addresses. El pin se queda fijo al
// centro de la pantalla y es el MAPA el que se arrastra debajo (mismo
// patrón que Uber/Google Maps), así no hace falta lógica de arrastrar
// un marcador. Al soltar, se geocodifica el centro a una dirección
// aproximada (Nominatim) que el cliente puede seguir editando — nunca
// se guarda nada sin que él confirme.
//
// Se importa siempre vía next/dynamic con ssr:false (igual que
// LiveDeliveryMap) porque Leaflet necesita `window`.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Search, LocateFixed } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { geocodeAddress, reverseGeocode, type ReverseGeocodeResult } from '@/lib/geo'
import { useLanguage } from '@/contexts/LanguageContext'

interface LocationPickerDialogProps {
  open: boolean
  onClose: () => void
  initial?: { lat: number; lng: number } | null
  onConfirm: (result: { lat: number; lng: number; address: ReverseGeocodeResult | null }) => void
}

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332]

export function LocationPickerDialog({ open, onClose, initial, onConfirm }: LocationPickerDialogProps) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [address, setAddress] = useState<ReverseGeocodeResult | null>(null)
  const [locating, setLocating] = useState(false)
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    initial ?? { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
  )

  // Inicializa el mapa cada vez que se abre — se destruye al cerrar para
  // no dejar un mapa de Leaflet vivo detrás de un diálogo invisible.
  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current) return
    const start = initial ?? { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
    const map = L.map(containerRef.current, { zoomControl: true }).setView([start.lat, start.lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    circleRef.current = L.circle([start.lat, start.lng], {
      radius: 150,
      color: '#ff0000',
      fillColor: '#ff0000',
      fillOpacity: 0.15,
      weight: 1,
    }).addTo(map)

    function handleMoveEnd() {
      const c = map.getCenter()
      circleRef.current?.setLatLng(c)
      setCenter({ lat: c.lat, lng: c.lng })
    }
    map.on('moveend', handleMoveEnd)
    mapRef.current = map

    return () => {
      map.off('moveend', handleMoveEnd)
      map.remove()
      mapRef.current = null
      circleRef.current = null
    }
  }, [open, initial])

  // Geocodifica el centro cada vez que deja de moverse (con un pequeño
  // debounce) — así el panel inferior muestra una dirección legible en
  // vez de solo coordenadas.
  useEffect(() => {
    if (!open) return
    let active = true
    const timeout = setTimeout(() => {
      reverseGeocode(center.lat, center.lng).then((result) => {
        if (active) setAddress(result)
      })
    }, 500)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [center, open])

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    const result = await geocodeAddress(search)
    setSearching(false)
    if (result) mapRef.current?.setView([result.lat, result.lng], 16)
  }

  function handleUseMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 16)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function handleConfirm() {
    onConfirm({ lat: center.lat, lng: center.lng, address })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="sr-only">{t('account.pickOnMap')}</DialogTitle>
        <div className="space-y-0">
          <div className="flex items-center gap-2 p-4 pb-0">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('account.searchLocationPlaceholder')}
                className="pl-9"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white disabled:opacity-50"
              aria-label={t('common.search')}
            >
              <Search size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="relative mt-3 h-72 w-full">
            <div ref={containerRef} className="h-full w-full" />
            {/* Pin fijo al centro — el mapa se mueve debajo. */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-full">
              <MapPin size={36} className="fill-brand-500 text-brand-700 drop-shadow" aria-hidden="true" />
            </div>
            <button
              onClick={handleUseMyLocation}
              disabled={locating}
              className="absolute bottom-3 right-3 z-[1000] grid h-9 w-9 place-items-center rounded-full bg-white text-brand-900 shadow-pop disabled:opacity-50"
              aria-label={t('account.useMyLocation')}
              title={t('account.useMyLocation')}
            >
              <LocateFixed size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{t('account.yourLocation')}</p>
              <p className="text-sm font-semibold text-ink-900">
                {address ? [address.street, address.city, address.state].filter(Boolean).join(', ') : t('account.locatingAddress')}
              </p>
            </div>
            <Button fullWidth size="lg" onClick={handleConfirm}>
              {t('account.setLocation')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
