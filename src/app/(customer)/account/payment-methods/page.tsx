import { CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Métodos de pago</h1>
        <p className="text-sm text-ink-400">Guarda una tarjeta para pagar más rápido.</p>
      </div>

      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <CreditCard size={28} className="text-ink-200" aria-hidden="true" />
        <p className="max-w-sm text-sm text-ink-400">
          Los pagos con tarjeta guardada llegan pronto. Cuando actives Stripe, tus tarjetas se
          tokenizan directamente con su SDK — nunca guardamos el número completo en nuestros
          servidores.
        </p>
      </Card>
    </div>
  )
}
