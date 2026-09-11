'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { UserPlus, Users, UserX, UserCheck, Repeat, IdCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  EmployeeDetailsForm,
  EMPTY_EMPLOYEE_DETAILS,
  type EmployeeDetailsValues,
} from '@/components/company/team/employee-details-form'
import { formatDate, formatCurrency } from '@/lib/format'
import { fetchHoursByUser, type HoursPeriod } from '@/lib/hours'
import { fetchTipsByDriver } from '@/lib/tips'
import { useLanguage } from '@/contexts/LanguageContext'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/company/page-header'
import type { Profile } from '@/lib/types'
import type { CompanyRole } from '@/lib/auth/permissions'

interface EmployeeSummary {
  employmentStatus: string
  monthlySalary: number | null
}

function generateTempPassword(): string {
  // Contraseña temporal segura y fácil de dictar/copiar al nuevo empleado;
  // se le debe pedir que la cambie desde su perfil en su primer ingreso.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)]
  return `${pass}1$`
}

export default function TeamPage() {
  const { can } = useAuth()
  const { t } = useLanguage()
  const canManage = can('staff.manage')

  const ROLE_OPTIONS: { value: CompanyRole; label: string; hint: string }[] = [
    { value: 'kitchen', label: t('teamAdmin.roleKitchen'), hint: t('teamAdmin.roleKitchenHint') },
    { value: 'driver', label: t('teamAdmin.roleDriver'), hint: t('teamAdmin.roleDriverHint') },
    { value: 'cashier', label: t('teamAdmin.roleCashier'), hint: t('teamAdmin.roleCashierHint') },
    { value: 'manager', label: t('teamAdmin.roleManager'), hint: t('teamAdmin.roleManagerHint') },
    { value: 'admin', label: t('teamAdmin.roleAdmin'), hint: t('teamAdmin.roleAdminHint') },
  ]

  const ROLE_LABELS: Record<string, string> = {
    owner: t('teamAdmin.roleOwner'),
    admin: t('teamAdmin.roleAdmin'),
    manager: t('teamAdmin.roleManager'),
    kitchen: t('teamAdmin.roleKitchen'),
    cashier: t('teamAdmin.roleCashier'),
    driver: t('teamAdmin.roleDriver'),
    staff: t('teamAdmin.roleStaff'),
  }

  const STATUS_LABELS: Record<string, string> = {
    active: t('employeeForm.statusActive'),
    on_leave: t('employeeForm.statusOnLeave'),
    inactive: t('employeeForm.statusInactive'),
  }

  const PERIOD_OPTIONS: { value: HoursPeriod; label: string }[] = [
    { value: 'day', label: t('teamAdmin.periodDay') },
    { value: 'week', label: t('teamAdmin.periodWeek') },
    { value: 'month', label: t('teamAdmin.periodMonth') },
    { value: 'year', label: t('teamAdmin.periodYear') },
  ]

  const [staff, setStaff] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [summaryByUser, setSummaryByUser] = useState<Map<string, EmployeeSummary>>(new Map())
  const [hoursPeriod, setHoursPeriod] = useState<HoursPeriod>('week')
  const [hoursByUser, setHoursByUser] = useState<Map<string, number>>(new Map())
  const [tipsByUser, setTipsByUser] = useState<Map<string, number>>(new Map())
  const [formOpen, setFormOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<CompanyRole>('kitchen')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [extras, setExtras] = useState<EmployeeDetailsValues>(EMPTY_EMPLOYEE_DETAILS)

  // Ver/editar detalles de un empleado activo ya existente.
  const [detailsTarget, setDetailsTarget] = useState<Profile | null>(null)
  const [detailsValues, setDetailsValues] = useState<EmployeeDetailsValues>(EMPTY_EMPLOYEE_DETAILS)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsSaving, setDetailsSaving] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  // Despedir/reactivar/cambiar rol
  const [statusTarget, setStatusTarget] = useState<Profile | null>(null)
  const [statusAction, setStatusAction] = useState<'terminate' | 'reactivate' | 'change_role'>('terminate')
  const [reactivateRole, setReactivateRole] = useState<CompanyRole>('kitchen')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)

  async function load() {
    setLoading(true)
    // Se listan también los despedidos (terminated_at no es null) — es el
    // roster histórico del equipo, no solo el activo; el badge "Despedido"
    // los distingue y desde ahí se pueden reactivar.
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_company_staff', true)
      .order('created_at')
    const staffList = (data ?? []) as Profile[]
    setStaff(staffList)

    if (staffList.length > 0) {
      const { data: details } = await supabase
        .from('employee_details')
        .select('user_id, employment_status, monthly_salary')
        .in(
          'user_id',
          staffList.map((s) => s.id)
        )
      const byUser = new Map<string, EmployeeSummary>()
      for (const row of details ?? []) {
        byUser.set(row.user_id, { employmentStatus: row.employment_status, monthlySalary: row.monthly_salary })
      }
      setSummaryByUser(byUser)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Horas trabajadas del período elegido — un solo selector para todo el
  // roster (día/semana/mes/año) en vez de uno por tarjeta, más rápido de
  // usar para comparar a todo el equipo de un vistazo.
  useEffect(() => {
    const activeStaff = staff.filter((s) => !s.terminated_at)
    const driverIds = activeStaff.filter((s) => s.company_role === 'driver').map((s) => s.id)
    const otherIds = activeStaff.filter((s) => s.company_role !== 'driver').map((s) => s.id)
    if (driverIds.length === 0 && otherIds.length === 0) {
      setHoursByUser(new Map())
      return
    }
    fetchHoursByUser(driverIds, otherIds, hoursPeriod).then(setHoursByUser)
    if (driverIds.length > 0) {
      fetchTipsByDriver(driverIds, hoursPeriod).then(setTipsByUser)
    } else {
      setTipsByUser(new Map())
    }
  }, [staff, hoursPeriod])

  function openCreate() {
    setFullName('')
    setEmail('')
    setPassword(generateTempPassword())
    setRole('kitchen')
    setExtras(EMPTY_EMPLOYEE_DETAILS)
    setError(null)
    setCreated(null)
    setFormOpen(true)
  }

  /** employee_details/employee_sensitive_info son de solo staff.manage — no
   *  pasan por ninguna Edge Function, un insert/update directo ya está
   *  correctamente restringido por RLS. */
  async function saveExtras(userId: string, values: EmployeeDetailsValues) {
    await supabase.from('employee_details').upsert({
      user_id: userId,
      date_hired: values.dateHired || null,
      employment_status: values.employmentStatus,
      monthly_salary: values.monthlySalary.trim() ? Number(values.monthlySalary) : null,
      store_location: values.storeLocation.trim() || null,
      internal_notes: values.internalNotes.trim() || null,
    })
    await supabase.from('employee_sensitive_info').upsert({
      user_id: userId,
      residential_street: values.residentialStreet.trim() || null,
      residential_city: values.residentialCity.trim() || null,
      residential_state: values.residentialState.trim() || null,
      residential_zip: values.residentialZip.trim() || null,
      secondary_phone: values.secondaryPhone.trim() || null,
      emergency_contact_name: values.emergencyContactName.trim() || null,
      emergency_contact_relationship: values.emergencyContactRelationship.trim() || null,
      emergency_contact_phone: values.emergencyContactPhone.trim() || null,
      emergency_contact_secondary_name: values.emergencyContactSecondaryName.trim() || null,
      emergency_contact_secondary_phone: values.emergencyContactSecondaryPhone.trim() || null,
      drivers_license_number: values.driversLicenseNumber.trim() || null,
    })
    if (values.vehicleMakeId || values.vehicleModelId || values.vehicleYear || values.licensePlate.trim()) {
      await supabase
        .from('drivers')
        .update({
          vehicle_make_id: values.vehicleMakeId || null,
          vehicle_model_id: values.vehicleModelId || null,
          vehicle_year: values.vehicleYear ? Number(values.vehicleYear) : null,
          license_plate: values.licensePlate.trim() || null,
        })
        .eq('user_id', userId)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { data, error: fnError } = await supabase.functions.invoke('create-staff-user', {
      body: {
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        vehicle_make_id: extras.vehicleMakeId || undefined,
        vehicle_model_id: extras.vehicleModelId || undefined,
        vehicle_year: extras.vehicleYear ? Number(extras.vehicleYear) : undefined,
        license_plate: extras.licensePlate.trim() || undefined,
      },
    })

    // supabase-js reporta errores HTTP (4xx/5xx) de Edge Functions como
    // FunctionsHttpError sin exponer el body automáticamente — lo leemos
    // del contexto de la respuesta para mostrar el mensaje real.
    if (fnError) {
      setSaving(false)
      let message = t('teamAdmin.createAccountFailedGeneric')
      const ctx = (fnError as { context?: Response }).context
      if (ctx) {
        try {
          const body = await ctx.clone().json()
          if (body?.error) message = body.error
        } catch {
          // deja el mensaje genérico
        }
      }
      setError(message)
      return
    }

    if (data?.error) {
      setSaving(false)
      setError(data.error)
      return
    }

    if (data?.id) await saveExtras(data.id, extras)
    setSaving(false)
    setCreated({ email: email.trim(), password })
    load()
  }

  function openDetails(member: Profile) {
    setDetailsTarget(member)
    setDetailsError(null)
    setDetailsLoading(true)
    Promise.all([
      supabase.from('employee_details').select('*').eq('user_id', member.id).maybeSingle(),
      supabase.from('employee_sensitive_info').select('*').eq('user_id', member.id).maybeSingle(),
      supabase.from('drivers').select('*').eq('user_id', member.id).maybeSingle(),
    ]).then(([detailsRes, sensitiveRes, driverRes]) => {
      const d = detailsRes.data
      const s = sensitiveRes.data
      const drv = driverRes.data
      setDetailsValues({
        dateHired: d?.date_hired ?? '',
        employmentStatus: d?.employment_status ?? 'active',
        monthlySalary: d?.monthly_salary != null ? String(d.monthly_salary) : '',
        storeLocation: d?.store_location ?? '',
        internalNotes: d?.internal_notes ?? '',
        residentialStreet: s?.residential_street ?? '',
        residentialCity: s?.residential_city ?? '',
        residentialState: s?.residential_state ?? '',
        residentialZip: s?.residential_zip ?? '',
        secondaryPhone: s?.secondary_phone ?? '',
        emergencyContactName: s?.emergency_contact_name ?? '',
        emergencyContactRelationship: s?.emergency_contact_relationship ?? '',
        emergencyContactPhone: s?.emergency_contact_phone ?? '',
        emergencyContactSecondaryName: s?.emergency_contact_secondary_name ?? '',
        emergencyContactSecondaryPhone: s?.emergency_contact_secondary_phone ?? '',
        vehicleMakeId: drv?.vehicle_make_id ?? '',
        vehicleModelId: drv?.vehicle_model_id ?? '',
        vehicleYear: drv?.vehicle_year != null ? String(drv.vehicle_year) : '',
        licensePlate: drv?.license_plate ?? '',
        driversLicenseNumber: s?.drivers_license_number ?? '',
      })
      setDetailsLoading(false)
    })
  }

  async function submitDetails() {
    if (!detailsTarget) return
    setDetailsSaving(true)
    setDetailsError(null)
    await saveExtras(detailsTarget.id, detailsValues)
    setDetailsSaving(false)
    setDetailsTarget(null)
  }

  function openTerminate(member: Profile) {
    setStatusTarget(member)
    setStatusAction('terminate')
    setStatusError(null)
  }

  function openReactivate(member: Profile) {
    setStatusTarget(member)
    setStatusAction('reactivate')
    setReactivateRole('kitchen')
    setStatusError(null)
  }

  function openChangeRole(member: Profile) {
    setStatusTarget(member)
    setStatusAction('change_role')
    setReactivateRole((member.company_role as CompanyRole) ?? 'kitchen')
    setStatusError(null)
  }

  async function submitStatusChange() {
    if (!statusTarget) return
    setStatusSaving(true)
    setStatusError(null)

    const { data, error: fnError } = await supabase.functions.invoke('manage-staff-status', {
      body:
        statusAction === 'terminate'
          ? { user_id: statusTarget.id, action: 'terminate' }
          : { user_id: statusTarget.id, action: statusAction, role: reactivateRole },
    })

    setStatusSaving(false)

    if (fnError) {
      let message = t('teamAdmin.actionFailedGeneric')
      const ctx = (fnError as { context?: Response }).context
      if (ctx) {
        try {
          const responseBody = await ctx.clone().json()
          if (responseBody?.error) message = responseBody.error
        } catch {
          // deja el mensaje genérico
        }
      }
      setStatusError(message)
      return
    }
    if (data?.error) {
      setStatusError(data.error)
      return
    }

    setStatusTarget(null)
    load()
  }

  if (!canManage) {
    return <EmptyState icon={<Users size={28} aria-hidden="true" />} message={t('ordersAdmin.noPermission')} />
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('teamAdmin.title')}
        subtitle={t('teamAdmin.subtitle')}
        actions={
          <Button size="sm" onClick={openCreate}>
            <UserPlus size={14} /> {t('teamAdmin.hire')}
          </Button>
        }
      />

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}
      {!loading && staff.length === 0 && (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} message={t('teamAdmin.onlyYouForNow')} />
      )}

      {!loading && staff.length > 0 && (
        <>
          {/* Un solo selector de período para todo el roster — más rápido
              para comparar horas de todo el equipo que uno por tarjeta. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t('teamAdmin.hoursWorked')}:
            </span>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setHoursPeriod(opt.value)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  hoursPeriod === opt.value ? 'bg-brand-500 text-white shadow-card' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((member) => {
              const isTerminated = !!member.terminated_at
              const isOwner = member.company_role === 'owner'
              const summary = summaryByUser.get(member.id)
              const statusLabel = isTerminated
                ? t('teamAdmin.terminatedBadge')
                : STATUS_LABELS[summary?.employmentStatus ?? 'active']
              const hours = hoursByUser.get(member.id) ?? 0
              return (
                <Card key={member.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {member.full_name || t('teamAdmin.noName')}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email || t('teamAdmin.emailFallback')}
                      </p>
                    </div>
                    <Badge variant={isTerminated ? 'danger' : isOwner ? 'brand' : 'neutral'}>
                      {isTerminated ? t('teamAdmin.terminatedBadge') : member.company_role ? ROLE_LABELS[member.company_role] : t('teamAdmin.roleStaff')}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">{t('employeeForm.status')}</dt>
                    <dd className="text-right font-semibold text-foreground">{statusLabel}</dd>
                    <dt className="text-muted-foreground">{t('teamAdmin.salaryLabel')}</dt>
                    <dd className="text-right font-semibold text-foreground">
                      {summary?.monthlySalary != null ? formatCurrency(summary.monthlySalary) : t('teamAdmin.salaryNotSet')}
                    </dd>
                  </dl>

                  {!isTerminated && (
                    <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {t('teamAdmin.hoursWorked')} · {PERIOD_OPTIONS.find((o) => o.value === hoursPeriod)?.label}
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        {hours.toFixed(1)}
                        {t('teamAdmin.hoursShort')}
                      </span>
                    </div>
                  )}

                  {!isTerminated && member.company_role === 'driver' && (
                    <div className="flex items-center justify-between rounded-2xl bg-success-500/10 px-3 py-2">
                      <span className="text-[11px] font-semibold text-success-500">{t('teamAdmin.tipsLabel')}</span>
                      <span className="text-sm font-extrabold text-success-500">
                        {formatCurrency(tipsByUser.get(member.id) ?? 0)}
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    {isTerminated
                      ? t('teamAdmin.terminatedOn', { date: formatDate(member.terminated_at!) })
                      : t('teamAdmin.sinceDate', { date: formatDate(member.created_at) })}
                  </p>

                  {!isOwner && (
                    <div className="flex items-center gap-1.5 border-t border-border pt-3">
                      {isTerminated ? (
                        <Button size="sm" variant="secondary" onClick={() => openReactivate(member)} className="flex-1">
                          <UserCheck size={14} aria-hidden="true" /> {t('teamAdmin.reactivateTitle')}
                        </Button>
                      ) : (
                        <>
                          <button
                            onClick={() => openDetails(member)}
                            aria-label={t('teamAdmin.viewDetailsAria', { name: member.full_name || t('teamAdmin.employeeFallback') })}
                            title={t('teamAdmin.detailsTitle')}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                          >
                            <IdCard size={14} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => openChangeRole(member)}
                            aria-label={t('teamAdmin.changeRoleAria', { name: member.full_name || t('teamAdmin.employeeFallback') })}
                            title={t('teamAdmin.changeRoleTitle')}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                          >
                            <Repeat size={14} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => openTerminate(member)}
                            aria-label={t('teamAdmin.terminateAria', { name: member.full_name || t('teamAdmin.employeeFallback') })}
                            title={t('teamAdmin.terminateTitle')}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                          >
                            <UserX size={14} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <div className="max-h-[85vh] overflow-y-auto p-6">
            {created ? (
              <>
                <DialogTitle className="mb-2 text-lg font-extrabold text-ink-900">
                  {t('teamAdmin.accountCreated')}
                </DialogTitle>
                <p className="mb-4 text-sm text-ink-600">
                  {t('teamAdmin.shareCredentialsPre')}{' '}
                  <span className="font-semibold">/company/login</span> {t('teamAdmin.shareCredentialsPost')}
                </p>
                <div className="space-y-2 rounded-2xl bg-ink-50 p-4 text-sm">
                  <p>
                    <span className="font-semibold">{t('teamAdmin.emailLabel')}</span> {created.email}
                  </p>
                  <p>
                    <span className="font-semibold">{t('teamAdmin.tempPasswordLabel')}</span> {created.password}
                  </p>
                </div>
                <Button fullWidth className="mt-4" onClick={() => setFormOpen(false)}>
                  {t('teamAdmin.done')}
                </Button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <DialogTitle className="mb-1 text-lg font-extrabold text-ink-900">
                  {t('teamAdmin.newStaffAccount')}
                </DialogTitle>
                <div>
                  <Label htmlFor="staff-name">{t('auth.fullName')}</Label>
                  <Input id="staff-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="staff-email">{t('auth.email')}</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="staff-password">{t('teamAdmin.tempPasswordField')}</Label>
                  <Input
                    id="staff-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-ink-400">{t('teamAdmin.tempPasswordHint')}</p>
                </div>
                <div>
                  <Label>{t('teamAdmin.roleLabel')}</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as CompanyRole)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-ink-400">
                    {ROLE_OPTIONS.find((r) => r.value === role)?.hint}
                  </p>
                </div>

                <div className="border-t border-ink-100 pt-3">
                  <EmployeeDetailsForm role={role} values={extras} onChange={(patch) => setExtras((prev) => ({ ...prev, ...patch }))} />
                </div>

                {error && (
                  <p role="alert" className="text-xs font-semibold text-danger-500">
                    {error}
                  </p>
                )}

                <Button type="submit" fullWidth disabled={saving}>
                  {saving ? t('teamAdmin.creatingAccount') : t('teamAdmin.createAccountBtn')}
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            {statusAction === 'terminate' ? (
              <>
                <DialogTitle className="mb-2 text-lg font-extrabold text-ink-900">
                  {t('teamAdmin.confirmTerminateTitle', { name: statusTarget?.full_name || t('teamAdmin.personFallback') })}
                </DialogTitle>
                <p className="mb-4 text-sm text-ink-600">{t('teamAdmin.confirmTerminateBody')}</p>
                {statusError && (
                  <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                    {statusError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button fullWidth variant="secondary" onClick={() => setStatusTarget(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    fullWidth
                    variant="destructive"
                    onClick={submitStatusChange}
                    disabled={statusSaving}
                  >
                    {statusSaving ? t('teamAdmin.terminating') : t('teamAdmin.yesTerminate')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogTitle className="mb-2 text-lg font-extrabold text-ink-900">
                  {statusAction === 'reactivate'
                    ? t('teamAdmin.reactivatePersonTitle', { name: statusTarget?.full_name || t('teamAdmin.personFallback') })
                    : t('teamAdmin.changeRolePersonTitle', { name: statusTarget?.full_name || t('teamAdmin.personFallback') })}
                </DialogTitle>
                <p className="mb-4 text-sm text-ink-600">
                  {statusAction === 'reactivate' ? t('teamAdmin.reactivateBody') : t('teamAdmin.changeRoleBody')}
                </p>
                <div className="mb-4">
                  <Label>{t('teamAdmin.roleLabel')}</Label>
                  <Select value={reactivateRole} onValueChange={(v) => setReactivateRole(v as CompanyRole)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {statusError && (
                  <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                    {statusError}
                  </p>
                )}
                <Button fullWidth onClick={submitStatusChange} disabled={statusSaving}>
                  {statusSaving
                    ? t('menuMgmt.savingButton')
                    : statusAction === 'reactivate'
                      ? t('teamAdmin.reactivateBtn')
                      : t('teamAdmin.saveRoleBtn')}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsTarget} onOpenChange={(open) => !open && setDetailsTarget(null)}>
        <DialogContent className="max-w-lg">
          <div className="max-h-[85vh] overflow-y-auto p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {t('teamAdmin.detailsOf', { name: detailsTarget?.full_name || t('teamAdmin.employeeFallback') })}
            </DialogTitle>
            {detailsLoading ? (
              <p className="text-sm text-ink-400">{t('common.loading')}</p>
            ) : (
              <div className="space-y-4">
                <EmployeeDetailsForm
                  role={(detailsTarget?.company_role as CompanyRole) ?? 'kitchen'}
                  values={detailsValues}
                  onChange={(patch) => setDetailsValues((prev) => ({ ...prev, ...patch }))}
                />
                {detailsError && (
                  <p role="alert" className="text-xs font-semibold text-danger-500">
                    {detailsError}
                  </p>
                )}
                <Button fullWidth onClick={submitDetails} disabled={detailsSaving}>
                  {detailsSaving ? t('menuMgmt.savingButton') : t('teamAdmin.saveDetails')}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
