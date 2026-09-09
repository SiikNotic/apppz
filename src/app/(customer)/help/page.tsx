import { Mail, Phone, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { BRAND_NAME } from '@/lib/config'

export const metadata = { title: `Ayuda · ${BRAND_NAME}` }

const FAQS = [
  {
    q: '¿Cómo cancelo un pedido?',
    a: 'Puedes cancelarlo mientras esté en estado "Pendiente" desde la página del pedido. Una vez confirmado por la cocina, contáctanos directamente.',
  },
  {
    q: '¿Cómo funcionan los puntos de recompensa?',
    a: 'Ganas puntos con cada compra que se acreditan cuando tu pedido se marca como entregado. Puedes ver tu balance e historial en Mi cuenta → Rewards.',
  },
  {
    q: 'Mi pedido llegó incompleto o incorrecto',
    a: 'Lo sentimos mucho. Escríbenos con tu número de pedido y te ayudamos de inmediato.',
  },
  {
    q: '¿Puedo cambiar mi dirección de entrega?',
    a: 'Sí, administra tus direcciones guardadas desde Mi cuenta → Direcciones en cualquier momento.',
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Ayuda</h1>
        <p className="text-sm text-ink-400">Estamos para ayudarte con tu pedido.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex flex-col items-center gap-2 p-5 text-center">
          <Phone size={20} className="text-brand-900" aria-hidden="true" />
          <p className="text-xs font-semibold text-ink-600">Llámanos</p>
          <a href="tel:+10000000000" className="text-sm font-bold text-ink-900">
            (000) 000-0000
          </a>
        </Card>
        <Card className="flex flex-col items-center gap-2 p-5 text-center">
          <Mail size={20} className="text-brand-900" aria-hidden="true" />
          <p className="text-xs font-semibold text-ink-600">Escríbenos</p>
          <a href="mailto:ayuda@neropizza.co" className="text-sm font-bold text-ink-900">
            ayuda@neropizza.co
          </a>
        </Card>
        <Card className="flex flex-col items-center gap-2 p-5 text-center">
          <MessageCircle size={20} className="text-brand-900" aria-hidden="true" />
          <p className="text-xs font-semibold text-ink-600">Chat en vivo</p>
          <p className="text-sm font-bold text-ink-900">Próximamente</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-base font-bold text-ink-900">Preguntas frecuentes</h2>
        <dl className="space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <dt className="text-sm font-bold text-ink-900">{faq.q}</dt>
              <dd className="mt-1 text-sm text-ink-600">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
