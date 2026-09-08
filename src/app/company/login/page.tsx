'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { BRAND_NAME } from '@/lib/config'

export default function CompanyLoginPage() {
  const { signIn, signOut } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError, } = await signIn(email, password)
    if (signInError) {
      setLoading(false)
      // Mensaje genérico: nunca revelar si el correo existe o no.
      setError('Correo o contraseña incorrectos.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    const { data: profile } = userId
      ? await supabase.from('profiles').select('is_company_staff').eq('id', userId).maybeSingle()
      : { data: null }

    setLoading(false)

    if (!profile?.is_company_staff) {
      await signOut()
      setError('Esta cuenta no tiene acceso al dashboard de la compañía.')
      return
    }

    router.push('/company/dashboard')
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-900 px-4">
      <Card className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white">
            <ChefHat size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-lg font-extrabold text-ink-900">{BRAND_NAME}</h1>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Company dashboard
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <Label htmlFor="company-email">Correo</Label>
            <Input
              id="company-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="company-password">Contraseña</Label>
            <Input
              id="company-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-danger-500">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Un momento…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-4 text-center text-[11px] text-ink-400">
          Las cuentas de staff las crea un administrador desde el dashboard — no hay registro
          público aquí.
        </p>
      </Card>
    </div>
  )
}
