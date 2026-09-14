'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthShell } from '@/components/customer/auth-shell'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { loginSchema, firstFieldErrors } from '@/lib/validation/auth.schema'
import { BRAND_NAME } from '@/lib/config'
import { useLanguage } from '@/contexts/LanguageContext'

function LoginForm() {
  const { signIn } = useAuth()
  const { t } = useLanguage()
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
      setFormError(t('auth.invalidCredentials'))
      return
    }
    router.push(redirectTo)
  }

  return (
    <AuthShell tagline={t('auth.registerSubtitle')}>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-h1 font-extrabold text-foreground">{t('auth.loginTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('auth.loginSubtitle')} {BRAND_NAME}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <Label htmlFor="email">{t('auth.email')}</Label>
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
              <p id="email-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Link href="/forgot-password" className="mb-1.5 text-xs font-semibold text-brand-400 hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                {fieldErrors.password}
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={rememberMe} onCheckedChange={(c) => setRememberMe(c === true)} />
            {t('auth.rememberMe')}
          </label>

          {formError && (
            <p role="alert" className="rounded-2xl bg-danger-500/10 px-3 py-2 text-xs font-semibold text-danger-500">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="font-semibold text-brand-400 hover:underline">
            {t('auth.createAccount')}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
