'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ActiveOrderBanner } from '@/components/customer/active-order-banner'
import { HomeTopBar } from '@/components/customer/home-top-bar'
import { ScreenBackButton } from '@/components/customer/screen-back-button'
import { DecorativeFoodPattern } from '@/components/customer/decorative-food-pattern'
import { BottomTabBar } from '@/components/customer/bottom-tab-bar'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { cn } from '@/lib/utils'

// Rutas de autenticación: sin chrome de app (ni tab bar, ni back button)
// porque el cliente todavía no tiene sesión ni carrito que navegar — cada
// una arma su propia pantalla completa (ver Lote de ilustración).
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/verify-email']

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isAuthPage = AUTH_PATHS.includes(pathname)

  return (
    <div className="min-h-screen bg-cream-100">
      {/* La barra roja de "sitio web" que había acá no aparece en ninguna
          de las 12 capturas de referencia — cada pantalla ahí es una app:
          Home lleva hamburguesa+ubicación+avatar, el resto lleva solo un
          botón de "atrás" sobre el patrón decorativo de marca. */}
      {isHome && <HomeTopBar />}
      {isAuthPage && (
        // Login/Registro/etc. no llevan tab bar ni footer — sin esto no
        // había NINGUNA forma de volver al sitio salvo el botón "atrás"
        // del navegador. Explícitamente va a "/" (no router.back()): el
        // pedido fue "un botón para regresar a la página principal".
        <div className="px-4 pt-5 sm:px-6">
          <Link
            href="/"
            className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-500 transition hover:bg-brand-100"
            aria-label={t('common.backToHome')}
            title={t('common.backToHome')}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </Link>
        </div>
      )}
      {!isHome && !isAuthPage && (
        <div className="relative overflow-hidden bg-cream-100 px-4 pb-1 pt-5 sm:px-6">
          <DecorativeFoodPattern />
          <div className="relative">
            <ScreenBackButton />
          </div>
        </div>
      )}

      <main className={cn('mx-auto max-w-5xl space-y-4 px-4 pt-5 sm:px-6', isAuthPage && 'pb-10')}>
        <ActiveOrderBanner />
        {children}
      </main>

      {!isAuthPage && (
        <footer className="mx-auto max-w-5xl px-4 pb-28 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-ink-100 pt-5 text-xs text-ink-400">
            <Link href="/help" className="hover:text-ink-600 hover:underline">
              {t('nav.help')}
            </Link>
            <Link href="/terms" className="hover:text-ink-600 hover:underline">
              {t('nav.terms')}
            </Link>
            <Link href="/privacy" className="hover:text-ink-600 hover:underline">
              {t('nav.privacy')}
            </Link>
            <Link href="/accessibility" className="hover:text-ink-600 hover:underline">
              {t('nav.accessibility')}
            </Link>
            <span aria-hidden="true" className="text-ink-100">
              ·
            </span>
            {/* Acceso del equipo: flujo separado del login de clientes, ver /company/login */}
            <Link href="/company/login" className="hover:text-ink-600 hover:underline">
              {t('nav.companyLogin')}
            </Link>
            <LanguageToggle className="ml-1" />
          </div>
        </footer>
      )}

      {!isAuthPage && <BottomTabBar />}
    </div>
  )
}
