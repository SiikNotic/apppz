'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
  Flame,
  Users,
  Tag,
  Gift,
  Bike,
  Settings,
  Menu,
  X,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { BRAND_NAME } from '@/lib/config'
import { NAV_ITEMS_BY_PERMISSION } from '@/lib/auth/permissions'

// Rutas que ya tienen página implementada — controla qué aparece en el nav.
const IMPLEMENTED_ROUTES = new Set([
  '/company/dashboard',
  '/company/orders',
  '/company/kitchen',
  '/company/menu',
  '/company/customers',
  '/company/team',
  '/company/promotions',
  '/company/rewards',
  '/company/drivers',
  '/company/analytics',
  '/company/settings',
])

const ICONS: Record<string, LucideIcon> = {
  '/company/dashboard': LayoutDashboard,
  '/company/orders': ClipboardList,
  '/company/kitchen': Flame,
  '/company/menu': UtensilsCrossed,
  '/company/customers': Users,
  '/company/team': UserPlus,
  '/company/promotions': Tag,
  '/company/rewards': Gift,
  '/company/drivers': Bike,
  '/company/analytics': BarChart3,
  '/company/settings': Settings,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

      {/* Barra superior para móvil: con 10+ secciones no cabían como iconos
          en una barra inferior, así que en móvil se navega desde un menú
          de pantalla completa (mismas secciones que el sidebar de escritorio). */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-500">
            <ChefHat size={18} />
          </span>
          <div>
            <p className="text-sm font-extrabold leading-tight">{BRAND_NAME}</p>
            <p className="text-[10px] text-white/50">Company dashboard</p>
          </div>
        </div>
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileNavOpen}
          className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-ink-900 text-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-500">
                <ChefHat size={18} />
              </span>
              <p className="text-sm font-extrabold">{BRAND_NAME}</p>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Cerrar menú"
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
            {items.map(({ href, label }) => {
              const isActive = pathname === href
              const Icon = ICONS[href] ?? Package
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold transition',
                    isActive ? 'bg-brand-500 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="space-y-3 border-t border-white/10 px-4 py-4">
            <div className="px-1">
              <p className="truncate text-sm font-semibold">{profile?.full_name || user?.email}</p>
              <p className="text-[11px] uppercase tracking-wide text-white/40">
                {profile?.company_role ? ROLE_LABELS[profile.company_role] : 'Staff'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold text-white/70 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={20} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <main id="company-main" className="min-w-0 flex-1 p-4 pb-6 sm:p-6">
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
