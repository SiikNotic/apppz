'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthShell } from '@/components/customer/auth-shell'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { forgotPasswordSchema, firstFieldErrors } from '@/lib/validation/auth.schema'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(firstFieldErrors(result.error).email ?? t('auth.invalidEmail'))
      return
    }

    setLoading(true)
    await resetPassword(result.data.email)
    setLoading(false)
    // Siempre mostramos éxito, exista o no la cuenta — evita filtrar qué
    // correos están registrados.
    setSent(true)
  }

  return (
    <AuthShell tagline={t('auth.registerSubtitle')}>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
            <KeyRound size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-h1 font-extrabold text-foreground">{t('auth.forgotTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('auth.forgotSubtitle')}</p>
        </div>

        {sent ? (
          <div role="status" className="rounded-2xl bg-success-500/10 p-4 text-center text-sm font-medium text-success-500">
            {t('auth.forgotSuccess')}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? 'email-error' : undefined}
              />
              {error && (
                <p id="email-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? t('auth.sending') : t('auth.sendLink')}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-brand-400 hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
