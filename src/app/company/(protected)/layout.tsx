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
  Truck,
  Settings,
  Menu,
  X,
  UserPlus,
  MessageCircleWarning,
  Home,
  BellRing,
  Volume2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { supabase } from '@/lib/supabase'
import { useNewOrderAlert } from '@/hooks/useNewOrderAlert'
import { BRAND_NAME } from '@/lib/config'
import { NAV_ITEMS_BY_PERMISSION } from '@/lib/auth/permissions'

// Mapea cada ruta del nav a su clave en dashboardNav (translations.ts).
// Las labels en NAV_ITEMS_BY_PERMISSION ya venían hardcodeadas en inglés
// — esto las hace bilingües de verdad sin tocar esa lista (la usan otros
// consumidores) ni perder el fallback si alguna ruta nueva no está mapeada.
const NAV_LABEL_KEYS: Record<string, string> = {
  '/company/dashboard': 'dashboard',
  '/company/orders': 'orders',
  '/company/kitchen': 'kitchen',
  '/company/menu': 'menu',
  '/company/customers': 'customers',
  '/company/support': 'support',
  '/company/team': 'team',
  '/company/promotions': 'promotions',
  '/company/rewards': 'rewards',
  '/company/drivers': 'drivers',
  '/company/analytics': 'analytics',
  '/company/settings': 'settings',
  '/company/inventory': 'inventory',
  '/company/driver': 'myDeliveries',
}

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
  '/company/driver',
  '/company/analytics',
  '/company/settings',
  '/company/support',
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
  '/company/driver': Truck,
  '/company/analytics': BarChart3,
  '/company/settings': Settings,
  '/company/support': MessageCircleWarning,
}

const ROLE_KEYS: Record<string, string> = {
  owner: 'teamAdmin.roleOwner',
  admin: 'teamAdmin.roleAdmin',
  manager: 'teamAdmin.roleManager',
  kitchen: 'teamAdmin.roleKitchen',
  cashier: 'teamAdmin.roleCashier',
  driver: 'teamAdmin.roleDriver',
  staff: 'teamAdmin.roleStaff',
}

function CompanyChrome({ children }: { children: ReactNode }) {
  const { profile, user, can, signOut } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Reportes de soporte abiertos: visible en TODO el dashboard (no solo en
  // /company/support) mediante un badge en el nav + la misma alerta
  // visual/audible que ya usa Cocina para pedidos nuevos (useNewOrderAlert
  // es genérico — se reutiliza aquí en vez de duplicar el mecanismo).
  const canSeeSupport = can('customers.view')
  const [openReportIds, setOpenReportIds] = useState<string[]>([])
  useEffect(() => {
    if (!canSeeSupport) return
    let active = true
    async function loadOpenReports() {
      const { data } = await supabase.from('issue_reports').select('id').neq('status', 'resolved')
      if (active) setOpenReportIds((data ?? []).map((r) => r.id))
    }
    loadOpenReports()
    const channel = supabase
      .channel('support-reports-alert')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issue_reports' }, loadOpenReports)
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [canSeeSupport])
  const { alertActive, needsUnlock, unlock, dismiss } = useNewOrderAlert(openReportIds)

  const navItems = NAV_ITEMS_BY_PERMISSION.filter(
    (item) => IMPLEMENTED_ROUTES.has(item.href) && can(item.permission)
  )
  // Inventario sigue siendo parte de "Menu/Products" para esta dark kitchen.
  const items = [
    ...navItems,
    ...(can('inventory.manage')
      ? [{ href: '/company/inventory', label: 'Inventory', permission: 'inventory.manage' as const }]
      : []),
    // "Mis entregas" es específico del rol de conductor, no de un permiso
    // compartido con otros roles — no tendría sentido que lo vea cocina o
    // administración, así que se filtra por company_role directamente.
    ...(profile?.company_role === 'driver'
      ? [{ href: '/company/driver', label: 'Mis entregas', permission: 'orders.view' as const }]
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
        {t('common.skipToContent')}
      </a>
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-900 p-5 text-white lg:flex">
        <div>
          <Link
            href="/"
            title={t('nav.viewSite')}
            className="mb-8 flex items-center gap-2.5 rounded-2xl px-1 py-1 -mx-1 transition hover:bg-white/5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-500 text-ink-900">
              <ChefHat size={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-tight">{BRAND_NAME}</p>
              <p className="text-[11px] text-white/50">{t('nav.companyDashboard')}</p>
            </div>
          </Link>
          <nav aria-label={t('common.mainNav')} className="space-y-1">
            {items.map(({ href, label }) => {
              const isActive = pathname === href
              const Icon = ICONS[href] ?? Package
              const unreadCount = href === '/company/support' ? openReportIds.length : 0
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-brand-500 text-ink-900'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="flex-1">{NAV_LABEL_KEYS[href] ? t(`dashboardNav.${NAV_LABEL_KEYS[href]}`) : label}</span>
                  {unreadCount > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="px-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name || user?.email}</p>
            <p className="text-[11px] uppercase tracking-wide text-white/40">
              {profile?.company_role && ROLE_KEYS[profile.company_role] ? t(ROLE_KEYS[profile.company_role]) : t('teamAdmin.roleStaff')}
            </p>
          </div>
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Home size={18} aria-hidden="true" />
            {t('nav.viewSite')}
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} aria-hidden="true" />
            {t('nav.signOut')}
          </button>
          <LanguageToggle className="mx-1" />
        </div>
      </aside>

      {/* Barra superior para móvil: con 10+ secciones no cabían como iconos
          en una barra inferior, así que en móvil se navega desde un menú
          de pantalla completa (mismas secciones que el sidebar de escritorio). */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-3 text-white lg:hidden">
        <Link href="/" title={t('nav.viewSite')} className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-500 text-ink-900">
            <ChefHat size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold leading-tight">{BRAND_NAME}</p>
            {/* Sesión actual siempre visible: con varias cuentas de prueba
                (owner, cocina, conductor…) es fácil no notar con cuál
                quedaste conectado — sobre todo porque los permisos se
                aplican de verdad en el servidor, no solo se ocultan botones. */}
            <p className="truncate text-[10px] text-white/50">
              {profile?.full_name || user?.email} ·{' '}
              {profile?.company_role && ROLE_KEYS[profile.company_role] ? t(ROLE_KEYS[profile.company_role]) : t('teamAdmin.roleStaff')}
            </p>
          </div>
        </Link>
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label={t('common.openMenu')}
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
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-500 text-ink-900">
                <ChefHat size={18} />
              </span>
              <p className="text-sm font-extrabold">{BRAND_NAME}</p>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label={t('common.closeMenu')}
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label={t('common.mainNav')} className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
            {items.map(({ href, label }) => {
              const isActive = pathname === href
              const Icon = ICONS[href] ?? Package
              const unreadCount = href === '/company/support' ? openReportIds.length : 0
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold transition',
                    isActive ? 'bg-brand-500 text-ink-900' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span className="flex-1">{NAV_LABEL_KEYS[href] ? t(`dashboardNav.${NAV_LABEL_KEYS[href]}`) : label}</span>
                  {unreadCount > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="space-y-3 border-t border-white/10 px-4 py-4">
            <div className="px-1">
              <p className="truncate text-sm font-semibold">{profile?.full_name || user?.email}</p>
              <p className="text-[11px] uppercase tracking-wide text-white/40">
                {profile?.company_role && ROLE_KEYS[profile.company_role] ? t(ROLE_KEYS[profile.company_role]) : t('teamAdmin.roleStaff')}
              </p>
            </div>
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Home size={20} aria-hidden="true" />
              {t('nav.viewSite')}
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold text-white/70 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={20} aria-hidden="true" />
              {t('nav.signOut')}
            </button>
            <LanguageToggle className="mx-1" />
          </div>
        </div>
      )}

      <main id="company-main" className="min-w-0 flex-1 space-y-4 p-4 pb-6 sm:p-6">
        {/* Visible en cualquier página del dashboard, no solo en Soporte —
            si alguien necesita ayuda, el equipo debe enterarse esté donde
            esté. Se omite en /company/support porque ya está viendo la
            lista completa ahí mismo. */}
        {pathname !== '/company/support' && needsUnlock && (
          <button
            onClick={unlock}
            className="flex w-full items-center gap-2 rounded-2xl bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-600 hover:bg-ink-100"
          >
            <Volume2 size={16} aria-hidden="true" />
            {t('support.enableAlertSound')}
          </button>
        )}
        {pathname !== '/company/support' && alertActive && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-2xl bg-danger-500 px-4 py-3 font-bold text-white shadow-pop"
          >
            <span className="flex items-center gap-2">
              <BellRing size={18} aria-hidden="true" /> {t('support.newReportAlert')}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/company/support"
                onClick={dismiss}
                className="rounded-full bg-white/20 px-3 py-1 text-xs hover:bg-white/30"
              >
                {t('support.viewLink')}
              </Link>
              <button onClick={dismiss} aria-label={t('kitchen.closeAlert')} className="rounded-full p-1 hover:bg-white/20">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

export default function ProtectedCompanyLayout({ children }: { children: ReactNode }) {
  const { session, loading, isCompanyStaff } = useAuth()
  const { t } = useLanguage()
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
        <p className="text-sm font-semibold text-white/70">{t('common.loading')}</p>
      </div>
    )
  }

  return <CompanyChrome>{children}</CompanyChrome>
}
