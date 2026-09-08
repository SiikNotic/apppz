'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ChefHat } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { loginSchema, firstFieldErrors } from '@/lib/validation/auth.schema'
import { BRAND_NAME } from '@/lib/config'

function LoginForm() {
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const result = loginSchema.safeParse({ email, password, rememberMe })
    if (!result.success) {
      setFieldErrors(firstFieldErrors(result.error))
      return
    }
    setFieldErrors({})
    setLoading(true)

    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      // Nunca revelar si el correo existe o no.
      setFormError('Correo o contraseña incorrectos.')
      return
    }
    router.push(redirectTo)
  }

  return (
    <div className="grid min-h-[calc(100vh-72px)] place-items-center px-4 py-10">
      <Card className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white">
            <ChefHat size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-lg font-extrabold text-ink-900">Inicia sesión</h1>
          <p className="text-sm text-ink-400">Entra a tu cuenta de {BRAND_NAME}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="mt-1 text-xs text-danger-500">
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link href="/forgot-password" className="text-xs font-semibold text-brand-500 hover:underline">
                ¿La olvidaste?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <Checkbox checked={rememberMe} onCheckedChange={(c) => setRememberMe(c === true)} />
            Recordarme
          </label>

          {formError && (
            <p role="alert" className="text-xs font-semibold text-danger-500">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-600">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-semibold text-brand-500 hover:underline">
            Crear cuenta
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
