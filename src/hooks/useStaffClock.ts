'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface OpenShift {
  id: string
  clock_in_at: string
}

/**
 * Fichaje genérico para todo el personal que NO es conductor — los
 * conductores ya fichan desde /company/driver (driver_shifts); duplicar el
 * control acá los dejaría fichando en dos sistemas distintos para la misma
 * persona. Alimenta "Horas trabajadas" en /company/team (ver lib/hours.ts).
 */
export function useStaffClock() {
  const { user, profile } = useAuth()
  const isDriver = profile?.company_role === 'driver'
  const [openShift, setOpenShift] = useState<OpenShift | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user || isDriver) {
      setLoading(false)
      return
    }
    let active = true
    supabase
      .from('staff_shifts')
      .select('id, clock_in_at')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setOpenShift(data)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [user, isDriver])

  async function toggle(): Promise<{ error: boolean }> {
    if (!user) return { error: true }
    setBusy(true)
    if (openShift) {
      const { error } = await supabase
        .from('staff_shifts')
        .update({ clock_out_at: new Date().toISOString() })
        .eq('id', openShift.id)
      setBusy(false)
      if (error) return { error: true }
      setOpenShift(null)
      return { error: false }
    }
    const { data, error } = await supabase
      .from('staff_shifts')
      .insert({ user_id: user.id })
      .select('id, clock_in_at')
      .single()
    setBusy(false)
    if (error || !data) return { error: true }
    setOpenShift(data)
    return { error: false }
  }

  return { isDriver, openShift, loading, busy, toggle }
}
