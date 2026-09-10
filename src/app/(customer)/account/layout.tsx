'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

// Ya no lleva su propio menú de pestañas (Perfil/Pedidos/Direcciones...):
// Perfil ahora es la pantalla central con enlaces a cada sección, y el
// botón "atrás" del chrome compartido (ver (customer)/layout.tsx) alcanza
// para volver — un segundo menú acá era redundante y competía con el tab
// bar de abajo.
export default function AccountLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !session) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [loading, session, pathname, router])

  if (loading || !session) {
    return <p className="py-16 text-center text-sm text-ink-400">{t('common.loading')}</p>
  }

  return <>{children}</>
}
