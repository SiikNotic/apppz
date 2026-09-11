'use client'

import { useEffect, useState } from 'react'
import { fetchStoreStatus } from '@/lib/store-status'
import type { StoreStatus } from '@/lib/types'

const REFRESH_MS = 60_000

/**
 * Estado real de la tienda, refrescado cada minuto — suficiente para que
 * "cierra en X minutos" y el bloqueo de nuevos pedidos se mantengan
 * correctos sin que el cliente tenga que recargar la página. El backend
 * (create_order) es quien de verdad hace cumplir esto; este hook es solo
 * para que la interfaz lo refleje de antemano.
 */
export function useStoreStatus() {
  const [status, setStatus] = useState<StoreStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    function load() {
      fetchStoreStatus().then((result) => {
        if (active) {
          setStatus(result)
          setLoading(false)
        }
      })
    }
    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return { status, loading }
}
