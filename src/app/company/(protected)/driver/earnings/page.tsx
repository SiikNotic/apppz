'use client'

import { useEffect, useState } from 'react'
import { Bike, Clock, DollarSign, Wallet, PiggyBank } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/company/page-header'
import { fetchHoursByUser, type HoursPeriod } from '@/lib/hours'
import { fetchTipsByDriver, fetchAllTimeTipsByDriver } from '@/lib/tips'
import { fetchAssignmentsWithOrders, CLOSED_STATUSES, type AssignmentWithOrder } from '@/lib/driverAssignments'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

// Cuántas entregas cerradas (entregadas o fallidas) se muestran en el
// desglose — suficiente para ver de dónde salió la propina del período sin
// convertir esto en un historial infinito.
const RECENT_LIMIT = 15

export default function DriverEarningsPage() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const isDriver = profile?.company_role === 'driver'

  const PERIOD_OPTIONS: { value: HoursPeriod; label: string }[] = [
    { value: 'day', label: t('teamAdmin.periodDay') },
    { value: 'week', label: t('teamAdmin.periodWeek') },
    { value: 'month', label: t('teamAdmin.periodMonth') },
    { value: 'year', label: t('teamAdmin.periodYear') },
  ]

  const [period, setPeriod] = useState<HoursPeriod>('week')
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(0)
  const [tipsPeriod, setTipsPeriod] = useState(0)
  const [allTimeTips, setAllTimeTips] = useState(0)
  const [monthlySalary, setMonthlySalary] = useState<number | null>(null)
  const [recent, setRecent] = useState<AssignmentWithOrder[]>([])

  // Propinas totales, sueldo fijo y el desglose de entregas no dependen del
  // período elegido — se cargan una sola vez.
  useEffect(() => {
    if (!user || !isDriver) {
      setLoading(false)
      return
    }
    let active = true
    async function loadOnce() {
      if (!user) return
      const [allTime, { data: details }, recentRows] = await Promise.all([
        fetchAllTimeTipsByDriver([user.id]),
        supabase.from('employee_details').select('monthly_salary').eq('user_id', user.id).maybeSingle(),
        fetchAssignmentsWithOrders(CLOSED_STATUSES, user.id),
      ])
      if (!active) return
      setAllTimeTips(allTime.get(user.id) ?? 0)
      setMonthlySalary(details?.monthly_salary ?? null)
      setRecent(recentRows.slice(0, RECENT_LIMIT))
      setLoading(false)
    }
    loadOnce()
    return () => {
      active = false
    }
  }, [user, isDriver])

  // Horas trabajadas y propinas del período elegido — sí cambian con el
  // selector día/semana/mes/año.
  useEffect(() => {
    if (!user || !isDriver) return
    let active = true
    Promise.all([fetchHoursByUser([user.id], [], period), fetchTipsByDriver([user.id], period)]).then(
      ([hoursMap, tipsMap]) => {
        if (!active) return
        setHours(hoursMap.get(user.id) ?? 0)
        setTipsPeriod(tipsMap.get(user.id) ?? 0)
      }
    )
    return () => {
      active = false
    }
  }, [user, isDriver, period])

  if (!isDriver) {
    return <EmptyState icon={<Bike size={28} aria-hidden="true" />} message={t('driverPage.notDriverOnly')} />
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <div className="space-y-5">
      <PageHeader title={t('driverEarnings.title')} subtitle={t('driverEarnings.subtitle')} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t('teamAdmin.hoursWorked')}:
        </span>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              period === opt.value ? 'bg-brand-500 text-white shadow-card' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t('driverEarnings.hoursLabel')}
          value={`${hours.toFixed(1)}${t('teamAdmin.hoursShort')}`}
          icon={<Clock size={20} />}
        />
        <StatCard
          label={t('driverEarnings.tipsPeriodLabel')}
          value={formatCurrency(tipsPeriod)}
          icon={<DollarSign size={20} />}
          tone="success"
        />
        <StatCard
          label={t('driverEarnings.tipsAllTimeLabel')}
          value={formatCurrency(allTimeTips)}
          icon={<PiggyBank size={20} />}
          tone="success"
        />
        <StatCard
          label={t('driverEarnings.salaryLabel')}
          value={monthlySalary != null ? formatCurrency(monthlySalary) : t('teamAdmin.salaryNotSet')}
          icon={<Wallet size={20} />}
          hint={t('driverEarnings.salaryHint')}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-600">{t('driverPage.recentHeading')}</h2>
        {recent.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-400">{t('driverEarnings.noDeliveriesYet')}</Card>
        ) : (
          <Card className="divide-y divide-ink-100 p-0">
            {recent.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'flex items-center justify-between gap-3 border-l-4 px-4 py-3',
                  a.status === 'delivered' ? 'border-l-success-500' : 'border-l-danger-500'
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">#{a.order.order_number}</p>
                  <p className="text-xs text-ink-400">{formatDate(a.assigned_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.status === 'delivered' && a.order.tip_amount > 0 && (
                    <span className="text-xs font-bold text-success-500">
                      +{formatCurrency(a.order.tip_amount)}
                    </span>
                  )}
                  <Badge variant={a.status === 'delivered' ? 'success' : 'danger'}>
                    {a.status === 'delivered' ? t('driverPage.delivered') : t('driverPage.notDelivered')}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
