'use client'

import { useEffect, useState } from 'react'
import { Bike, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/company/page-header'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Driver, DriverShift, Profile } from '@/lib/types'

const STATUS_VARIANT = { offline: 'neutral', available: 'success', on_delivery: 'brand' } as const
const STATUS_KEYS = {
  offline: 'driversAdmin.statusOffline',
  available: 'driversAdmin.statusAvailable',
  on_delivery: 'driversAdmin.statusOnDelivery',
} as const

export default function DriversPage() {
  const { t } = useLanguage()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [profilesByUser, setProfilesByUser] = useState<Record<string, Profile>>({})
  const [openShiftsByDriver, setOpenShiftsByDriver] = useState<Record<string, DriverShift>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: driverRows } = await supabase.from('drivers').select('*')
      const list = driverRows ?? []
      setDrivers(list)

      if (list.length > 0) {
        const userIds = list.map((d) => d.user_id)
        const [{ data: profiles }, { data: shifts }] = await Promise.all([
          supabase.from('profiles').select('*').in('id', userIds),
          supabase.from('driver_shifts').select('*').in('driver_id', userIds).is('clock_out_at', null),
        ])
        const map: Record<string, Profile> = {}
        for (const p of profiles ?? []) map[p.id] = p
        setProfilesByUser(map)
        const shiftMap: Record<string, DriverShift> = {}
        for (const s of shifts ?? []) shiftMap[s.driver_id] = s
        setOpenShiftsByDriver(shiftMap)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-5">
      <PageHeader title={t('driversAdmin.title')} subtitle={t('driversAdmin.subtitle')} />

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : drivers.length === 0 ? (
        <EmptyState icon={<Bike size={28} aria-hidden="true" />} message={t('driversAdmin.noDrivers')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {drivers.map((driver) => {
            const shift = openShiftsByDriver[driver.user_id]
            return (
              <Card key={driver.user_id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {profilesByUser[driver.user_id]?.full_name ?? t('driversAdmin.noName')}
                  </p>
                  <p className="text-xs text-muted-foreground">{driver.vehicle_type ?? t('driversAdmin.noVehicle')}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} aria-hidden="true" />
                    {shift
                      ? t('driversAdmin.onShiftSince', { date: formatDate(shift.clock_in_at) })
                      : t('driversAdmin.noShiftStarted')}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[driver.status]}>{t(STATUS_KEYS[driver.status])}</Badge>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
