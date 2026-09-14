'use client'

// Fichaje de conductor: abre/cierra driver_shifts Y sincroniza
// drivers.status (available/offline) a la vez — "estoy trabajando" y
// "puedo recibir una entrega" son la misma decisión para un conductor de
// esta cocina (ver nota histórica en driver/page.tsx). status='on_delivery'
// lo sigue poniendo el sistema aparte (assign_driver_to_order), nunca este
// hook. Compartido entre /company/driver (antes tenía esta lógica en
// línea) y el botón de entrada/salida del menú lateral (CompanyChrome),
// para no duplicarla ni fichar en dos lugares independientes.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DriverShift } from '@/lib/types'

export function useDriverShift(userId: string | undefined) {
  const [openShift, setOpenShift] = useState<DriverShift | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load(id: string) {
    const { data } = await supabase
      .from('driver_shifts')
      .select('*')
      .eq('driver_id', id)
      .is('clock_out_at', null)
      .maybeSingle()
    setOpenShift(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    load(userId)
    const channel = supabase
      .channel(`driver-shift-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_shifts', filter: `driver_id=eq.${userId}` },
        () => load(userId)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function clockIn() {
    if (!userId) return
    setBusy(true)
    await Promise.all([
      supabase.from('driver_shifts').insert({ driver_id: userId }),
      supabase.from('drivers').update({ status: 'available' }).eq('user_id', userId),
    ])
    setBusy(false)
    load(userId)
  }

  async function clockOut() {
    if (!userId || !openShift) return
    setBusy(true)
    await Promise.all([
      supabase.from('driver_shifts').update({ clock_out_at: new Date().toISOString() }).eq('id', openShift.id),
      supabase.from('drivers').update({ status: 'offline' }).eq('user_id', userId),
    ])
    setBusy(false)
    load(userId)
  }

  return { openShift, loading, busy, clockIn, clockOut }
}
