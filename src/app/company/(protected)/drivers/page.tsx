'use client'

import { useEffect, useState } from 'react'
import { Bike, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/company/page-header'
import { formatDate, formatCurrency } from '@/lib/format'
import { fetchAllTimeTipsByDriver } from '@/lib/tips'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Driver, DriverShift, Profile } from '@/lib/types'

type DriverWithVehicle = Driver & {
  vehicle_makes: { name: string } | null
  vehicle_models: { name: string } | null
}

const STATUS_VARIANT = { offline: 'neutral', available: 'success', on_delivery: 'brand' } as const
const STATUS_KEYS = {
  offline: 'driversAdmin.statusOffline',
  available: 'driversAdmin.statusAvailable',
  on_delivery: 'driversAdmin.statusOnDelivery',
} as const

function vehicleLabel(driver: DriverWithVehicle): string | null {
  const makeModel = [driver.vehicle_makes?.name, driver.vehicle_models?.name].filter(Boolean).join(' ')
  if (!makeModel) return null
  return driver.vehicle_year ? `${makeModel} (${driver.vehicle_year})` : makeModel
}

export default function DriversPage() {
  const { t } = useLanguage()
  const [drivers, setDrivers] = useState<DriverWithVehicle[]>([])
  const [profilesByUser, setProfilesByUser] = useState<Record<string, Profile>>({})
  const [openShiftsByDriver, setOpenShiftsByDriver] = useState<Record<string, DriverShift>>({})
  const [tipsByDriver, setTipsByDriver] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: driverRows } = await supabase
        .from('drivers')
        .select('*, vehicle_makes(name), vehicle_models(name)')
      const list = driverRows ?? []
      setDrivers(list)

      if (list.length > 0) {
        const userIds = list.map((d) => d.user_id)
        const [{ data: profiles }, { data: shifts }, tips] = await Promise.all([
          supabase.from('profiles').select('*').in('id', userIds),
          supabase.from('driver_shifts').select('*').in('driver_id', userIds).is('clock_out_at', null),
          fetchAllTimeTipsByDriver(userIds),
        ])
        const map: Record<string, Profile> = {}
        for (const p of profiles ?? []) map[p.id] = p
        setProfilesByUser(map)
        const shiftMap: Record<string, DriverShift> = {}
        for (const s of shifts ?? []) shiftMap[s.driver_id] = s
        setOpenShiftsByDriver(shiftMap)
        setTipsByDriver(tips)
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
                  <p className="text-xs text-muted-foreground">{vehicleLabel(driver) ?? t('driversAdmin.noVehicle')}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} aria-hidden="true" />
                    {shift
                      ? t('driversAdmin.onShiftSince', { date: formatDate(shift.clock_in_at) })
                      : t('driversAdmin.noShiftStarted')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant={STATUS_VARIANT[driver.status]}>{t(STATUS_KEYS[driver.status])}</Badge>
                  <span className="text-xs font-bold text-success-500">
                    {t('driversAdmin.totalTips')} {formatCurrency(tipsByDriver.get(driver.user_id) ?? 0)}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
