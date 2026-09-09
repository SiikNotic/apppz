'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ShoppingBag, ChefHat, User } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { ActiveOrderBanner } from '@/components/customer/active-order-banner'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { formatCurrency } from '@/lib/format'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/config'

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const { itemCount, subtotal } = useCart()
  const { session } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const showCartBar = itemCount > 0 && pathname === '/'

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="sticky top-0 z-30 bg-brand-500 text-ink-900 shadow-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <button onClick={() => router.push('/')} className="flex items-center gap-2.5 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900/10">
              <ChefHat size={22} />
            </span>
            <span>
              <span className="block text-lg font-extrabold leading-tight">{BRAND_NAME}</span>
              <span className="block text-[11px] font-medium text-ink-900/70">{BRAND_TAGLINE}</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(session ? '/account/profile' : '/login')}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-ink-900/10 hover:bg-ink-900/20"
              aria-label={session ? t('nav.account') : t('nav.login')}
            >
              <User size={20} aria-hidden="true" />
            </button>
            <button
              onClick={() => router.push('/checkout')}
              className="relative grid h-11 w-11 place-items-center rounded-2xl bg-ink-900/10 hover:bg-ink-900/20"
              aria-label={`${t('cart.viewCart')}${itemCount > 0 ? `, ${itemCount} ${itemCount === 1 ? t('cart.item') : t('cart.items')}` : ''}`}
            >
              <ShoppingBag size={20} aria-hidden="true" />
              {itemCount > 0 && (
                <span
                  key={itemCount}
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 animate-in place-items-center rounded-full bg-ink-900 px-1 text-[10px] font-bold text-white zoom-in duration-200"
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 pb-28 pt-5 sm:px-6">
        <ActiveOrderBanner />
        {children}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
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

      {showCartBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
          <button
            onClick={() => router.push('/checkout')}
            className="flex w-full max-w-md items-center justify-between rounded-full bg-ink-900 px-5 py-4 text-white shadow-pop"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingBag size={18} />
              {t('cart.viewCart')} · {itemCount} {itemCount === 1 ? t('cart.item') : t('cart.items')}
            </span>
            <span className="text-base font-extrabold">{formatCurrency(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
