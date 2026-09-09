import { LegalPage } from '@/components/customer/legal-page'
import { BRAND_NAME } from '@/lib/config'

export const metadata = { title: `Accesibilidad · ${BRAND_NAME}` }

export default function AccessibilityPage() {
  return (
    <LegalPage title="Compromiso de accesibilidad">
      <p>
        Queremos que cualquier persona pueda ordenar en {BRAND_NAME}, sin importar cómo navegue
        la web. Trabajamos hacia el estándar WCAG 2.2 nivel AA en toda la aplicación.
      </p>
      <h2>Lo que implementamos</h2>
      <ul>
        <li>Navegación completa por teclado, con foco visible en todo momento.</li>
        <li>Etiquetas y roles ARIA en formularios, diálogos y menús.</li>
        <li>Contraste de color adecuado y soporte para modo oscuro.</li>
        <li>Respeto a la preferencia de movimiento reducido de tu sistema.</li>
        <li>Textos alternativos en imágenes de producto.</li>
        <li>Áreas de toque grandes para uso cómodo en móvil.</li>
      </ul>
      <h2>¿Encontraste una barrera?</h2>
      <p>
        Si algo no funciona bien con tu lector de pantalla, teclado, o cualquier tecnología de
        asistencia, cuéntanos desde{' '}
        <a href="/help" className="text-brand-900 underline">
          Ayuda
        </a>{' '}
        — lo tomamos como una prioridad real, no como una nota al pie.
      </p>
    </LegalPage>
  )
}
