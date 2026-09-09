import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="grid min-h-[calc(100vh-72px)] place-items-center px-4 py-10">
      <Card className="w-full max-w-sm p-7 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-ink-900">
          <MailCheck size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-3 text-lg font-extrabold text-ink-900">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-ink-600">
          Te enviamos un enlace de confirmación. Ábrelo desde tu correo para activar tu cuenta —
          si tu proyecto no requiere confirmación, ya puedes iniciar sesión directamente.
        </p>
        <Button asChild fullWidth size="lg" className="mt-6">
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </Card>
    </div>
  )
}
