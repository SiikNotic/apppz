'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthShell } from '@/components/customer/auth-shell'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { registerSchema, firstFieldErrors, type RegisterInput } from '@/lib/validation/auth.schema'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    password: '',
    confirmPassword: '',
  })
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

    const { error } = await signUp(result.data.email, result.data.password, result.data.fullName, result.data.phone, {
      street: result.data.street,
      apartment: result.data.apartment,
      city: result.data.city,
      state: result.data.state,
      zip: result.data.zip,
    })
    setLoading(false)
    if (error) {
      setFormError(error)
      return
    }
    router.push('/verify-email')
  }

  return (
    <AuthShell tagline={t('home.heroTitle')}>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-5">
          <h1 className="text-h1 font-extrabold text-foreground">{t('auth.registerTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('auth.registerSubtitle')}</p>
        </div>

        <form className="space-y-3.5" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
              <Input
                id="fullName"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                aria-invalid={!!fieldErrors.fullName}
                aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
              />
              {fieldErrors.fullName && (
                <p id="fullName-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">{t('auth.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
              />
              {fieldErrors.phone && (
                <p id="phone-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="border-t border-border pt-3.5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t('account.deliveryAddressHeading')}
            </p>
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[2fr_1fr]">
                <div>
                  <Label htmlFor="street">{t('account.street')}</Label>
                  <Input
                    id="street"
                    autoComplete="street-address"
                    value={form.street}
                    onChange={(e) => update('street', e.target.value)}
                    aria-invalid={!!fieldErrors.street}
                    aria-describedby={fieldErrors.street ? 'street-error' : undefined}
                  />
                  {fieldErrors.street && (
                    <p id="street-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                      {fieldErrors.street}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="apartment">{t('account.apartment')}</Label>
                  <Input id="apartment" value={form.apartment} onChange={(e) => update('apartment', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3.5">
                <div className="col-span-2">
                  <Label htmlFor="city">{t('account.city')}</Label>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    aria-invalid={!!fieldErrors.city}
                    aria-describedby={fieldErrors.city ? 'city-error' : undefined}
                  />
                  {fieldErrors.city && (
                    <p id="city-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                      {fieldErrors.city}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state">{t('account.state')}</Label>
                  <Input
                    id="state"
                    autoComplete="address-level1"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                    aria-invalid={!!fieldErrors.state}
                    aria-describedby={fieldErrors.state ? 'state-error' : undefined}
                  />
                  {fieldErrors.state && (
                    <p id="state-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                      {fieldErrors.state}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="zip">{t('account.zip')}</Label>
                <Input
                  id="zip"
                  autoComplete="postal-code"
                  value={form.zip}
                  onChange={(e) => update('zip', e.target.value)}
                  aria-invalid={!!fieldErrors.zip}
                  aria-describedby={fieldErrors.zip ? 'zip-error' : undefined}
                />
                {fieldErrors.zip && (
                  <p id="zip-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                    {fieldErrors.zip}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 border-t border-border pt-3.5 sm:grid-cols-2">
            <div>
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                aria-invalid={!!fieldErrors.password}
                aria-describedby="password-hint"
              />
              <p id="password-hint" className="mt-1 text-[11px] text-muted-foreground">
                {t('auth.passwordHint')}
              </p>
              {fieldErrors.password && (
                <p role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                  {fieldErrors.password}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                aria-invalid={!!fieldErrors.confirmPassword}
                aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {fieldErrors.confirmPassword && (
                <p id="confirmPassword-error" role="alert" className="mt-1 text-xs font-semibold text-danger-500">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {formError && (
            <p role="alert" className="rounded-2xl bg-danger-500/10 px-3 py-2 text-xs font-semibold text-danger-500">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="font-semibold text-brand-400 hover:underline">
            {t('auth.signInLink')}
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          {t('auth.agreeToTerms')}{' '}
          <Link href="/terms" className="underline">
            {t('nav.terms')}
          </Link>{' '}
          {t('auth.and')}{' '}
          <Link href="/privacy" className="underline">
            {t('auth.privacyPolicy')}
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  )
}
