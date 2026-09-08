import { LegalPage } from '@/components/customer/legal-page'
import { BRAND_NAME } from '@/lib/config'

export const metadata = { title: `Política de privacidad · ${BRAND_NAME}` }

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated="8 de septiembre de 2026">
      <p>
        En {BRAND_NAME} recolectamos solo la información necesaria para procesar tus pedidos y
        mejorar tu experiencia. Seguimos un principio de minimización de datos: si no lo
        necesitamos para operar, no lo pedimos.
      </p>
      <h2>Qué recolectamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, correo, teléfono.</li>
        <li>Direcciones de entrega que decidas guardar.</li>
        <li>Historial de pedidos y puntos de recompensa.</li>
        <li>Datos de pago: los procesa directamente nuestro proveedor de pagos; nosotros nunca
          almacenamos el número completo de tu tarjeta.</li>
      </ul>
      <h2>Cómo lo usamos</h2>
      <p>
        Para procesar y entregar tus pedidos, darte soporte, prevenir fraude y, solo si lo
        autorizas, enviarte promociones.
      </p>
      <h2>Con quién lo compartimos</h2>
      <p>
        No vendemos tu información personal. La compartimos únicamente con proveedores que nos
        ayudan a operar (procesamiento de pagos, envío de notificaciones) y solo en la medida
        necesaria para el servicio.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes ver y editar tus datos desde tu perfil en cualquier momento, y solicitar la
        eliminación completa de tu cuenta desde{' '}
        <a href="/account/profile" className="text-brand-500 underline">
          Mi perfil
        </a>
        .
      </p>
      <h2>Cookies</h2>
      <p>
        Usamos almacenamiento local del navegador para mantener tu carrito y preferencias — no
        para rastrearte en otros sitios.
      </p>
    </LegalPage>
  )
}
