'use client'

// Este historial de pedidos vivía aquí, fuera de /account, así que la
// navegación de perfil (Perfil/Pedidos/Direcciones) desaparecía al entrarle
// — un layout de Next.js solo envuelve rutas dentro de su propio árbol. Se
// movió a /account/orders para que sí quede envuelta por AccountLayout;
// esta página se deja como redirect permanente por si algún enlace viejo
// (marcador, historial del navegador) todavía apunta a /orders.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyOrdersRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/account/orders')
  }, [router])
  return <p className="py-16 text-center text-sm text-ink-400">Redirigiendo…</p>
}
