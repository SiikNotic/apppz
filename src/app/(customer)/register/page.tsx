'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChefHat } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { registerSchema, firstFieldErrors, type RegisterInput } from '@/lib/validation/auth.schema'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const result = registerSchema.safeParse(form)
    if (!result.success) {
      setFieldErrors(firstFieldErrors(result.error))
      return
    }
    setFieldErrors({})
    setLoading(true)

    const { error } = await signUp(result.data.email, result.data.password, result.data.fullName, result.data.phone)
    setLoading(false)
    if (error) {
      setFormError(error)
      return
    }
    router.push('/verify-email')
  }

  return (
    <div className="grid min-h-[calc(100vh-72px)] place-items-center px-4 py-10">
      <Card className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white">
            <ChefHat size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-lg font-extrabold text-ink-900">Crea tu cuenta</h1>
          <p className="text-sm text-ink-400">Pedidos más rápidos, puntos y favoritos guardados</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              aria-invalid={!!fieldErrors.fullName}
            />
            {fieldErrors.fullName && <p role="alert" className="mt-1 text-xs text-danger-500">{fieldErrors.fullName}</p>}
          </div>
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && <p role="alert" className="mt-1 text-xs text-danger-500">{fieldErrors.email}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              aria-invalid={!!fieldErrors.phone}
            />
            {fieldErrors.phone && <p role="alert" className="mt-1 text-xs text-danger-500">{fieldErrors.phone}</p>}
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              aria-invalid={!!fieldErrors.password}
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="mt-1 text-[11px] text-ink-400">
              Mínimo 8 caracteres, con una mayúscula y un número.
            </p>
            {fieldErrors.password && <p role="alert" className="mt-1 text-xs text-danger-500">{fieldErrors.password}</p>}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              aria-invalid={!!fieldErrors.confirmPassword}
            />
            {fieldErrors.confirmPassword && (
              <p role="alert" className="mt-1 text-xs text-danger-500">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-xs font-semibold text-danger-500">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-brand-500 hover:underline">
            Inicia sesión
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px] text-ink-400">
          Al crear tu cuenta aceptas nuestros{' '}
          <Link href="/terms" className="underline">Términos</Link> y{' '}
          <Link href="/privacy" className="underline">Política de privacidad</Link>.
        </p>
      </Card>
    </div>
  )
}
