'use client'

import { useEffect, useState } from 'react'
import { Bike, CheckCircle2, Clock, DollarSign, PiggyBank, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/company/page-header'
import { fetchHoursByUser, periodStart, type HoursPeriod } from '@/lib/hours'
import { fetchTipsByDriver, fetchAllTimeTipsByDriver } from '@/lib/tips'
import { fetchAssignmentsWithOrders, CLOSED_STATUSES, type AssignmentWithOrder } from '@/lib/driverAssignments'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

// Cuántas entregas cerradas (entregadas o fallidas) se muestran en el
// desglose — suficiente para ver de dónde salió la propina del período sin
// convertir esto en un historial infinito.
const RECENT_LIMIT = 15

// Los 3 períodos que pide la pantalla, simultáneos (no un selector) — cada
// uno reusa periodStart(), la misma función que ya usa fetchTipsByDriver
// para el corte de fecha en el servidor, así que "hoy/esta semana/este
// mes" acá significa exactamente lo mismo que en cualquier otro reporte
// de horas/propinas de la app.
const PERIODS: HoursPeriod[] = ['day', 'week', 'month']

export default function DriverEarningsPage() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const isDriver = profile?.company_role === 'driver'

  const PERIOD_LABELS: Record<HoursPeriod, string> = {
    day: t('teamAdmin.periodDay'),
    week: t('teamAdmin.periodWeek'),
    month: t('teamAdmin.periodMonth'),
    year: t('teamAdmin.periodYear'),
  }

  const [loading, setLoading] = useState(true)
  const [tipsByPeriod, setTipsByPeriod] = useState<Record<HoursPeriod, number>>({ day: 0, week: 0, month: 0, year: 0 })
  const [hoursByPeriod, setHoursByPeriod] = useState<Record<HoursPeriod, number>>({ day: 0, week: 0, month: 0, year: 0 })
  const [allTimeTips, setAllTimeTips] = useState(0)
  const [monthlySalary, setMonthlySalary] = useState<number | null>(null)
  const [allClosed, setAllClosed] = useState<AssignmentWithOrder[]>([])

  useEffect(() => {
    if (!user || !isDriver) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      if (!user) return
      const [allTime, { data: details }, closedRows, periodTips, periodHours] = await Promise.all([
        fetchAllTimeTipsByDriver([user.id]),
        supabase.from('employee_details').select('monthly_salary').eq('user_id', user.id).maybeSingle(),
        fetchAssignmentsWithOrders(CLOSED_STATUSES, user.id),
        Promise.all(PERIODS.map((p) => fetchTipsByDriver([user.id], p))),
        Promise.all(PERIODS.map((p) => fetchHoursByUser([user.id], [], p))),
      ])
      if (!active) return
      setAllTimeTips(allTime.get(user.id) ?? 0)
      setMonthlySalary(details?.monthly_salary ?? null)
      setAllClosed(closedRows)
      setTipsByPeriod((prev) => {
        const next = { ...prev }
        PERIODS.forEach((p, i) => {
          next[p] = periodTips[i].get(user.id) ?? 0
        })
        return next
      })
      setHoursByPeriod((prev) => {
        const next = { ...prev }
        PERIODS.forEach((p, i) => {
          next[p] = periodHours[i].get(user.id) ?? 0
        })
        return next
      })
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [user, isDriver])

  if (!isDriver) {
    return <EmptyState icon={<Bike size={28} aria-hidden="true" />} message={t('driverPage.notDriverOnly')} />
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  // Entregas completadas de verdad (status='delivered', nunca 'failed')
  // por período — mismo criterio y mismo corte de fecha (delivered_at)
  // que usa fetchTipsByDriver, aplicado aquí sobre los datos ya traídos
  // para no repetir la consulta.
  function deliveredCountSince(since: Date): number {
    return allClosed.filter((a) => a.status === 'delivered' && a.delivered_at && new Date(a.delivered_at) >= since).length
  }
  const allTimeDeliveredCount = allClosed.filter((a) => a.status === 'delivered').length
  // fetchAssignmentsWithOrders ordena por route_order (o si no hay,
  // assigned_at ascendente) — correcto para la cola ACTIVA del conductor
  // (FIFO), pero sin sentido para un historial: route_order es una
  // posición de cola relativa que se reutiliza en cada tanda de entregas
  // (varias entregas cerradas de días distintos pueden compartir el mismo
  // route_order, p. ej. 0), así que ese orden no refleja para nada cuál
  // se entregó más recientemente. Para el desglose "Recientes" de esta
  // pantalla se reordena explícitamente por delivered_at (con
  // assigned_at de respaldo si por lo que sea faltara) de más nueva a
  // más vieja antes de recortar a RECENT_LIMIT — si no, con más de
  // RECENT_LIMIT entregas cerradas en total, la lista mostraba las
  // primeras entregas que el conductor hizo alguna vez, no las últimas.
  const recent = [...allClosed]
    .sort((a, b) => {
      const aTime = new Date(a.delivered_at ?? a.assigned_at).getTime()
      const bTime = new Date(b.delivered_at ?? b.assigned_at).getTime()
      return bTime - aTime
    })
    .slice(0, RECENT_LIMIT)

  return (
    <div className="space-y-5">
      <PageHeader title={t('driverEarnings.title')} subtitle={t('driverEarnings.subtitle')} />

      {/* Hoy / Esta semana / Este mes, lado a lado — el punto de esta
          pantalla es que el conductor vea los 3 de un vistazo, sin tener
          que ir cambiando un selector como antes. */}
      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t('driverEarnings.periodSummaryHeading')}
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {PERIODS.map((p) => (
            <Card key={p} className="p-3.5 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{PERIOD_LABELS[p]}</p>
              <p className="mt-1.5 break-words text-xl font-extrabold text-foreground sm:text-2xl">
                {formatCurrency(tipsByPeriod[p])}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 size={12} className="shrink-0 text-success-500" aria-hidden="true" />
                {t('driverPage.deliveriesCompletedStat', { count: deliveredCountSince(periodStart(p)) })}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} className="shrink-0" aria-hidden="true" />
                {hoursByPeriod[p].toFixed(1)}{t('teamAdmin.hoursShort')}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label={t('driverEarnings.totalEarningsLabel')}
          value={formatCurrency(allTimeTips)}
          icon={<PiggyBank size={20} />}
          tone="success"
          hint={t('driverEarnings.totalEarningsHint')}
        />
        <StatCard
          label={t('driverEarnings.salaryLabel')}
          value={monthlySalary != null ? formatCurrency(monthlySalary) : t('teamAdmin.salaryNotSet')}
          icon={<Wallet size={20} />}
          hint={t('driverEarnings.salaryHint')}
        />
      </div>

      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
            <DollarSign size={20} aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-foreground">{t('driverEarnings.deliveriesCompletedLabel')}</p>
        </div>
        <p className="text-2xl font-extrabold text-foreground">{allTimeDeliveredCount}</p>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t('driverPage.recentHeading')}</h2>
        {recent.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">{t('driverEarnings.noDeliveriesYet')}</Card>
        ) : (
          <Card className="divide-y divide-border p-0">
            {recent.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'flex items-center justify-between gap-3 border-l-4 px-4 py-3',
                  a.status === 'delivered' ? 'border-l-success-500' : 'border-l-danger-500'
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">#{a.order.order_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.assigned_at)}</p>
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
