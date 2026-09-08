'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

  async function load() {
    setLoading(true)
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
    setError(null)
    setCreated(null)
    setFormOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { data, error: fnError } = await supabase.functions.invoke('create-staff-user', {
      body: { email: email.trim(), password, full_name: fullName.trim(), role },
    })

    setSaving(false)

    // supabase-js reporta errores HTTP (4xx/5xx) de Edge Functions como
    // FunctionsHttpError sin exponer el body automáticamente — lo leemos
    // del contexto de la respuesta para mostrar el mensaje real.
    if (fnError) {
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
      setError(data.error)
      return
    }

    setCreated({ email: email.trim(), password })
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
        {staff.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">
                {member.full_name || 'Sin nombre'}
              </p>
              <p className="text-xs text-ink-400">Desde {formatDate(member.created_at)}</p>
            </div>
            <Badge variant={member.company_role === 'owner' ? 'brand' : 'neutral'}>
              {member.company_role ? ROLE_LABELS[member.company_role] : 'Staff'}
            </Badge>
          </div>
        ))}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
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
    </div>
  )
}
