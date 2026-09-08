import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChefHat } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { FieldLabel, Input } from '../../components/ui/Input'
import { BRAND_NAME } from '../../lib/config'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      setLoading(false)
      if (error) return setError(error)
      navigate('/admin/dashboard')
      return
    }

    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) return setError(error)
    setInfo(
      'Cuenta creada. Si tu proyecto de Supabase requiere confirmación por correo, revisa tu bandeja antes de iniciar sesión.'
    )
    setMode('signin')
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-900 px-4">
      <Card className="w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white">
            <ChefHat size={24} />
          </span>
          <h1 className="mt-3 text-lg font-extrabold text-ink-900">{BRAND_NAME}</h1>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Panel administrativo
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-full bg-ink-50 p-1">
          <button
            onClick={() => setMode('signin')}
            className={`rounded-full py-2 text-xs font-bold transition ${
              mode === 'signin' ? 'bg-white shadow-card text-ink-900' : 'text-ink-400'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`rounded-full py-2 text-xs font-bold transition ${
              mode === 'signup' ? 'bg-white shadow-card text-ink-900' : 'text-ink-400'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div>
              <FieldLabel>Nombre completo</FieldLabel>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <FieldLabel>Correo</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <FieldLabel>Contraseña</FieldLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-xs font-semibold text-danger-500">{error}</p>}
          {info && <p className="text-xs font-semibold text-success-500">{info}</p>}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Un momento…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>

        {mode === 'signup' && (
          <p className="mt-4 text-center text-[11px] text-ink-400">
            Las cuentas nuevas entran con rol "staff". Pide a un administrador que te suba de rol
            desde la base de datos si necesitas permisos completos.
          </p>
        )}
      </Card>
    </div>
  )
}
