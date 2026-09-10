'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
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
    <div className="grid min-h-[calc(100vh-72px)] place-items-center px-4 py-10">
      <Card className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white">
            <KeyRound size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-lg font-extrabold text-ink-900">{t('auth.forgotTitle')}</h1>
          <p className="text-sm text-ink-400">{t('auth.forgotSubtitle')}</p>
        </div>

        {sent ? (
          <div role="status" className="rounded-2xl bg-green-50 p-4 text-center text-sm text-success-500">
            {t('auth.forgotSuccess')}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              {error && <p role="alert" className="mt-1 text-xs text-danger-500">{error}</p>}
            </div>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? t('auth.sending') : t('auth.sendLink')}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-ink-600">
          <Link href="/login" className="font-semibold text-brand-900 hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
