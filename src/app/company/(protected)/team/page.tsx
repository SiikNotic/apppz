'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { UserPlus, Users, UserX, UserCheck, Repeat, IdCard } from 'lucide-react'
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
import { formatDate } from '@/lib/format'
import type { Profile } from '@/lib/types'
import type { CompanyRole } from '@/lib/auth/permissions'

const ROLE_OPTIONS: { value: CompanyRole; label: string; hint: string }[] = [
  { value: 'kitchen', label: 'Cocinero', hint: 'Ve y prepara los pedidos en la vista de Cocina.' },
  { value: 'driver', label: 'Conductor', hint: 'Aparece en Drivers para recibir entregas asignadas.' },
  { value: 'cashier', label: 'Cajero', hint: 'Ve pedidos y clientes, actualiza estados.' },
  { value: 'manager', label: 'Manager', hint: 'Acceso amplio: menú, promos, reportes, equipo no incluido.' },
  { value: 'admin', label: 'Admin', hint: 'Acceso total excepto administrar el equipo.' },
]

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  kitchen: 'Cocinero',
  cashier: 'Cajero',
  driver: 'Conductor',
  staff: 'Staff',
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
  const canManage = can('staff.manage')

  const [staff, setStaff] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
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
    setStaff((data ?? []) as Profile[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

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
      employee_code: values.employeeCode.trim() || null,
      position: values.position.trim() || null,
      date_hired: values.dateHired || null,
      employment_status: values.employmentStatus,
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
    if (values.vehicleType.trim() || values.licensePlate.trim()) {
      await supabase
        .from('drivers')
        .update({ vehicle_type: values.vehicleType.trim() || null, license_plate: values.licensePlate.trim() || null })
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
        vehicle_type: extras.vehicleType.trim() || undefined,
        license_plate: extras.licensePlate.trim() || undefined,
      },
    })

    // supabase-js reporta errores HTTP (4xx/5xx) de Edge Functions como
    // FunctionsHttpError sin exponer el body automáticamente — lo leemos
    // del contexto de la respuesta para mostrar el mensaje real.
    if (fnError) {
      setSaving(false)
      let message = 'No se pudo crear la cuenta. Intenta de nuevo.'
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
        employeeCode: d?.employee_code ?? '',
        position: d?.position ?? '',
        dateHired: d?.date_hired ?? '',
        employmentStatus: d?.employment_status ?? 'active',
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
        vehicleType: drv?.vehicle_type ?? '',
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
      let message = 'No se pudo completar la acción. Intenta de nuevo.'
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
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <Users size={28} className="text-ink-200" aria-hidden="true" />
        <p className="text-sm text-ink-400">No tienes permiso para ver esta sección.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Equipo</h1>
          <p className="text-sm text-ink-400">Da de alta cocineros, conductores y demás personal.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <UserPlus size={14} /> Contratar
        </Button>
      </div>

      <Card className="divide-y divide-ink-100 p-0">
        {loading && <p className="p-5 text-sm text-ink-400">Cargando…</p>}
        {!loading && staff.length === 0 && (
          <p className="p-5 text-sm text-ink-400">Solo estás tú por ahora.</p>
        )}
        {staff.map((member) => {
          const isTerminated = !!member.terminated_at
          const isOwner = member.company_role === 'owner'
          return (
            <div key={member.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {member.full_name || 'Sin nombre'}
                </p>
                <p className="text-xs text-ink-400">
                  {isTerminated
                    ? `Despedido ${formatDate(member.terminated_at!)}`
                    : `Desde ${formatDate(member.created_at)}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={isTerminated ? 'danger' : isOwner ? 'brand' : 'neutral'}>
                  {isTerminated ? 'Despedido' : member.company_role ? ROLE_LABELS[member.company_role] : 'Staff'}
                </Badge>
                {!isOwner &&
                  (isTerminated ? (
                    <button
                      onClick={() => openReactivate(member)}
                      aria-label={`Reactivar a ${member.full_name || 'este empleado'}`}
                      title="Reactivar"
                      className="grid h-8 w-8 place-items-center rounded-full bg-success-500/10 text-success-500 hover:brightness-95"
                    >
                      <UserCheck size={14} aria-hidden="true" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => openDetails(member)}
                        aria-label={`Ver detalles de ${member.full_name || 'este empleado'}`}
                        title="Detalles del empleado"
                        className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                      >
                        <IdCard size={14} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => openChangeRole(member)}
                        aria-label={`Cambiar rol de ${member.full_name || 'este empleado'}`}
                        title="Cambiar rol"
                        className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                      >
                        <Repeat size={14} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => openTerminate(member)}
                        aria-label={`Despedir a ${member.full_name || 'este empleado'}`}
                        title="Despedir"
                        className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                      >
                        <UserX size={14} aria-hidden="true" />
                      </button>
                    </>
                  ))}
              </div>
            </div>
          )
        })}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <div className="max-h-[85vh] overflow-y-auto p-6">
            {created ? (
              <>
                <DialogTitle className="mb-2 text-lg font-extrabold text-ink-900">
                  Cuenta creada
                </DialogTitle>
                <p className="mb-4 text-sm text-ink-600">
                  Comparte estos datos con la persona para que inicie sesión en{' '}
                  <span className="font-semibold">/company/login</span> y cambie su contraseña
                  desde su perfil.
                </p>
                <div className="space-y-2 rounded-2xl bg-ink-50 p-4 text-sm">
                  <p>
                    <span className="font-semibold">Correo:</span> {created.email}
                  </p>
                  <p>
                    <span className="font-semibold">Contraseña temporal:</span> {created.password}
                  </p>
                </div>
                <Button fullWidth className="mt-4" onClick={() => setFormOpen(false)}>
                  Listo
                </Button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <DialogTitle className="mb-1 text-lg font-extrabold text-ink-900">
                  Nueva cuenta de staff
                </DialogTitle>
                <div>
                  <Label htmlFor="staff-name">Nombre completo</Label>
                  <Input id="staff-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="staff-email">Correo</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="staff-password">Contraseña temporal</Label>
                  <Input
                    id="staff-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-ink-400">
                    Generada automáticamente — puedes cambiarla antes de crear la cuenta.
                  </p>
                </div>
                <div>
                  <Label>Rol</Label>
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
                  {saving ? 'Creando…' : 'Crear cuenta'}
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
                  ¿Despedir a {statusTarget?.full_name || 'esta persona'}?
                </DialogTitle>
                <p className="mb-4 text-sm text-ink-600">
                  Perderá acceso a la plataforma de inmediato: no podrá iniciar sesión ni realizar
                  ninguna acción protegida. Su historial (pedidos, entregas, auditoría) se conserva —
                  puedes reactivar la cuenta más adelante si hace falta.
                </p>
                {statusError && (
                  <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                    {statusError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button fullWidth variant="secondary" onClick={() => setStatusTarget(null)}>
                    Cancelar
                  </Button>
                  <Button
                    fullWidth
                    variant="destructive"
                    onClick={submitStatusChange}
                    disabled={statusSaving}
                  >
                    {statusSaving ? 'Despidiendo…' : 'Sí, despedir'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogTitle className="mb-2 text-lg font-extrabold text-ink-900">
                  {statusAction === 'reactivate'
                    ? `Reactivar a ${statusTarget?.full_name || 'esta persona'}`
                    : `Cambiar rol de ${statusTarget?.full_name || 'esta persona'}`}
                </DialogTitle>
                <p className="mb-4 text-sm text-ink-600">
                  {statusAction === 'reactivate'
                    ? 'Recupera acceso a la plataforma con el rol que elijas.'
                    : 'El cambio aplica de inmediato — no afecta su sesión activa ni su historial.'}
                </p>
                <div className="mb-4">
                  <Label>Rol</Label>
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
                    ? 'Guardando…'
                    : statusAction === 'reactivate'
                      ? 'Reactivar'
                      : 'Guardar rol'}
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
              Detalles de {detailsTarget?.full_name || 'este empleado'}
            </DialogTitle>
            {detailsLoading ? (
              <p className="text-sm text-ink-400">Cargando…</p>
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
                  {detailsSaving ? 'Guardando…' : 'Guardar detalles'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
