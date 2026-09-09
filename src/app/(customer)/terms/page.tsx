import Link from 'next/link'
import { LegalPage } from '@/components/customer/legal-page'
import { BRAND_NAME } from '@/lib/config'

export const metadata = { title: `Términos de servicio · ${BRAND_NAME}` }

export default function TermsPage() {
  return (
    <LegalPage title="Términos de servicio" updated="8 de septiembre de 2026">
      <p>
        Al usar {BRAND_NAME} para ordenar comida aceptas estos términos. Léelos junto con nuestra{' '}
        <Link href="/privacy" className="text-brand-900 underline">
          Política de privacidad
        </Link>
        .
      </p>
      <h2>Pedidos y precios</h2>
      <p>
        Los precios se calculan en el momento de confirmar tu pedido y pueden cambiar sin previo
        aviso para pedidos futuros. Nos reservamos el derecho de rechazar o cancelar un pedido
        por disponibilidad de producto, error de precio evidente o sospecha de fraude.
      </p>
      <h2>Pagos</h2>
      <p>
        Aceptamos los métodos de pago mostrados en el checkout. Un pedido se considera pagado
        únicamente cuando lo confirma nuestro proveedor de pagos — nunca solo porque tu
        navegador muestre un mensaje de éxito.
      </p>
      <h2>Cancelaciones y reembolsos</h2>
      <p>
        Puedes cancelar un pedido mientras esté en estado &quot;Pendiente&quot;. Una vez que la
        cocina lo confirma, contáctanos desde{' '}
        <Link href="/help" className="text-brand-900 underline">
          Ayuda
        </Link>{' '}
        para resolver cualquier problema.
      </p>
      <h2>Programa de puntos</h2>
      <p>
        Los puntos y niveles de recompensa se otorgan según las reglas vigentes al momento de
        cada compra, pueden cambiar y son gestionados por nuestro sistema — no tienen valor
        monetario y no son transferibles.
      </p>
      <h2>Cuentas</h2>
      <p>
        Eres responsable de mantener la confidencialidad de tu contraseña. Puedes solicitar la
        eliminación de tu cuenta en cualquier momento desde tu perfil.
      </p>
      <h2>Contacto</h2>
      <p>
        Para dudas sobre estos términos, escríbenos desde la página de{' '}
        <Link href="/help" className="text-brand-900 underline">
          Ayuda
        </Link>
        .
      </p>
    </LegalPage>
  )
}
