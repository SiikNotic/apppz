'use client'

import type { ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ShoppingBag, ChefHat } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/format'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/config'

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const { itemCount, subtotal } = useCart()
  const router = useRouter()
  const pathname = usePathname()
  const showCartBar = itemCount > 0 && pathname === '/'

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="sticky top-0 z-30 bg-brand-500 text-white shadow-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <button onClick={() => router.push('/')} className="flex items-center gap-2.5 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15">
              <ChefHat size={22} />
            </span>
            <span>
              <span className="block text-lg font-extrabold leading-tight">{BRAND_NAME}</span>
              <span className="block text-[11px] font-medium text-white/80">{BRAND_TAGLINE}</span>
            </span>
          </button>
          <button
            onClick={() => router.push('/checkout')}
            className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/15 hover:bg-white/25"
            aria-label="Ver carrito"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink-900 px-1 text-[10px] font-bold">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6">{children}</main>

      {showCartBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
          <button
            onClick={() => router.push('/checkout')}
            className="flex w-full max-w-md items-center justify-between rounded-full bg-ink-900 px-5 py-4 text-white shadow-pop"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingBag size={18} />
              Ver carrito · {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-base font-extrabold">{formatCurrency(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
