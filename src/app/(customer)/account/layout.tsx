'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, MapPin, CreditCard, Heart, Gift, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

const TABS = [
  { href: '/account/profile', key: 'account.navProfile', icon: User },
  { href: '/account/orders', key: 'account.navOrders', icon: ClipboardList },
  { href: '/account/addresses', key: 'account.navAddresses', icon: MapPin },
  { href: '/account/payment-methods', key: 'account.navPayment', icon: CreditCard },
  { href: '/account/favorites', key: 'account.navFavorites', icon: Heart },
  { href: '/account/rewards', key: 'account.navRewards', icon: Gift },
] as const

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

  return (
    <div className="grid gap-5 lg:grid-cols-[220px,1fr]">
      <nav aria-label={t('account.accountNav')} className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
        {TABS.map(({ href, key, icon: Icon }) => {
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
              {t(key)}
            </Link>
          )
        })}
      </nav>
      <div>{children}</div>
    </div>
  )
}
