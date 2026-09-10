'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

// Reemplaza la barra roja de sitio web que tenía el área de cliente por
// una navegación fija abajo tipo app, igual que en cada pantalla de la
// referencia. La referencia trae un 4to ítem de chatbot de IA que nunca
// se pidió construir; el ítem "Menú" que iba en su lugar también se
// quitó a pedido del cliente — el menú de productos ya está a la vista
// desde Home, un tab aparte para eso era redundante.
export function BottomTabBar() {
  const pathname = usePathname()
  const { itemCount } = useCart()
  const { session } = useAuth()
  const { t } = useLanguage()

  const items = [
    { href: '/', label: t('nav.home'), Icon: Home, active: pathname === '/' },
    {
      href: '/checkout',
      label: t('nav.cart'),
      Icon: ShoppingBag,
      active: pathname.startsWith('/checkout'),
      badge: itemCount,
    },
    {
      href: session ? '/account/profile' : '/login',
      label: session ? t('nav.account') : t('nav.login'),
      Icon: User,
      active: pathname.startsWith('/account') || pathname.startsWith('/orders'),
    },
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-ink-100 bg-white px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-2px_16px_rgba(0,0,0,0.06)]"
      aria-label={t('nav.home')}
    >
      {items.map(({ href, label, Icon, active, badge }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition',
            active ? 'bg-brand-50 text-brand-500' : 'text-ink-300 hover:text-ink-400'
          )}
          aria-current={active ? 'page' : undefined}
        >
          <Icon size={20} aria-hidden="true" />
          {active && <span>{label}</span>}
          {!active && <span className="sr-only">{label}</span>}
          {!!badge && badge > 0 && (
            <span
              key={badge}
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 animate-in place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white zoom-in duration-200"
            >
              {badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
