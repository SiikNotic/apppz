'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, MapPin, CreditCard, Heart, Gift, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const TABS = [
  { href: '/account/profile', label: 'Perfil', icon: User },
  { href: '/account/orders', label: 'Pedidos', icon: ClipboardList },
  { href: '/account/addresses', label: 'Direcciones', icon: MapPin },
  { href: '/account/payment-methods', label: 'Pago', icon: CreditCard },
  { href: '/account/favorites', label: 'Favoritos', icon: Heart },
  { href: '/account/rewards', label: 'Rewards', icon: Gift },
]

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !session) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [loading, session, pathname, router])

  if (loading || !session) {
    return <p className="py-16 text-center text-sm text-ink-400">Cargando…</p>
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[220px,1fr]">
      <nav aria-label="Navegación de cuenta" className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-brand-500 text-ink-900 shadow-card' : 'bg-white text-ink-600 hover:bg-brand-50'
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div>{children}</div>
    </div>
  )
}
