'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  ClipboardList,
  BarChart3,
  LogOut,
  ChefHat,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { BRAND_NAME } from '@/lib/config'
import { NAV_ITEMS_BY_PERMISSION } from '@/lib/auth/permissions'

// Rutas que ya tienen página implementada. Cuando se agregue kitchen/
// customers/promotions/rewards/drivers/settings, basta con agregarlas
// aquí y automáticamente aparecen en el nav para quien tenga el permiso.
const IMPLEMENTED_ROUTES = new Set([
  '/company/dashboard',
  '/company/orders',
  '/company/menu',
  '/company/analytics',
])

const ICONS: Record<string, LucideIcon> = {
  '/company/dashboard': LayoutDashboard,
  '/company/orders': ClipboardList,
  '/company/menu': UtensilsCrossed,
  '/company/analytics': BarChart3,
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  kitchen: 'Kitchen',
  cashier: 'Cashier',
  driver: 'Driver',
  staff: 'Staff',
}

function CompanyChrome({ children }: { children: ReactNode }) {
  const { profile, user, can, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const navItems = NAV_ITEMS_BY_PERMISSION.filter(
    (item) => IMPLEMENTED_ROUTES.has(item.href) && can(item.permission)
  )
  // Inventario sigue siendo parte de "Menu/Products" para esta dark kitchen.
  const items = [
    ...navItems,
    ...(can('inventory.manage')
      ? [{ href: '/company/inventory', label: 'Inventory', permission: 'inventory.manage' as const }]
      : []),
  ]

  async function handleSignOut() {
    await signOut()
    router.push('/company/login')
  }

  return (
    <div className="min-h-screen bg-cream-100 lg:flex">
      <a
        href="#company-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-pop"
      >
        Saltar al contenido
      </a>
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-900 p-5 text-white lg:flex">
        <div>
          <div className="mb-8 flex items-center gap-2.5 px-1">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500">
              <ChefHat size={20} />
            </span>
            <div>
              <p className="text-sm font-extrabold leading-tight">{BRAND_NAME}</p>
              <p className="text-[11px] text-white/50">Company dashboard</p>
            </div>
          </div>
          <nav aria-label="Navegación principal" className="space-y-1">
            {items.map(({ href, label }) => {
              const isActive = pathname === href
              const Icon = ICONS[href] ?? Package
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="px-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name || user?.email}</p>
            <p className="text-[11px] uppercase tracking-wide text-white/40">
              {profile?.company_role ? ROLE_LABELS[profile.company_role] : 'Staff'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Nav inferior para móvil */}
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-ink-100 bg-white px-1 py-2 lg:hidden">
        {items.map(({ href, label }) => {
          const isActive = pathname === href
          const Icon = ICONS[href] ?? Package
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-semibold',
                isActive ? 'text-brand-500' : 'text-ink-400'
              )}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      <main id="company-main" className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:pb-6">
        {children}
      </main>
    </div>
  )
}

export default function ProtectedCompanyLayout({ children }: { children: ReactNode }) {
  const { session, loading, isCompanyStaff } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.replace('/company/login')
    } else if (!isCompanyStaff) {
      // Un cliente autenticado no tiene por qué ver el dashboard de la
      // compañía — lo mandamos de vuelta a su propia cuenta.
      router.replace('/account/profile')
    }
  }, [loading, session, isCompanyStaff, router])

  if (loading || !session || !isCompanyStaff) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-900">
        <p className="text-sm font-semibold text-white/70">Cargando…</p>
      </div>
    )
  }

  return <CompanyChrome>{children}</CompanyChrome>
}
