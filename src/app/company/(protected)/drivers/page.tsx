'use client'

import { useEffect, useState } from 'react'
import { Bike } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Driver, Profile } from '@/lib/types'

const STATUS_VARIANT = { offline: 'neutral', available: 'success', on_delivery: 'brand' } as const

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [profilesByUser, setProfilesByUser] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: driverRows } = await supabase.from('drivers').select('*')
      const list = driverRows ?? []
      setDrivers(list)

      if (list.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', list.map((d) => d.user_id))
        const map: Record<string, Profile> = {}
        for (const p of profiles ?? []) map[p.id] = p
        setProfilesByUser(map)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Drivers</h1>
        <p className="text-sm text-ink-400">
          Arquitectura lista para asignación de repartidores — la app dedicada del driver (ruta,
          navegación, prueba de entrega) es la siguiente pieza a construir sobre esta base.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Cargando…</p>
      ) : drivers.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Bike size={28} className="text-ink-200" aria-hidden="true" />
          <p className="text-sm text-ink-400">Todavía no hay conductores dados de alta.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {drivers.map((driver) => (
            <Card key={driver.user_id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-bold text-ink-900">
                  {profilesByUser[driver.user_id]?.full_name ?? 'Sin nombre'}
                </p>
                <p className="text-xs text-ink-400">{driver.vehicle_type ?? 'Vehículo no especificado'}</p>
              </div>
              <Badge variant={STATUS_VARIANT[driver.status]}>{driver.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
