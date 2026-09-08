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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { BRAND_NAME } from '@/lib/config'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/inventario', label: 'Inventario', icon: Package },
  { href: '/admin/menu', label: 'Menú', icon: UtensilsCrossed },
  { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
]

function AdminChrome({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-cream-100 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-900 p-5 text-white lg:flex">
        <div>
          <div className="mb-8 flex items-center gap-2.5 px-1">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500">
              <ChefHat size={20} />
            </span>
            <div>
              <p className="text-sm font-extrabold leading-tight">{BRAND_NAME}</p>
              <p className="text-[11px] text-white/50">Panel de administración</p>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={18} />
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
              {profile?.role === 'admin' ? 'Administrador' : 'Staff'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Nav inferior para móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-ink-100 bg-white px-1 py-2 lg:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-semibold',
                isActive ? 'text-brand-500' : 'text-ink-400'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
    </div>
  )
}

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) router.replace('/admin/login')
  }, [loading, session, router])

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-900">
        <p className="text-sm font-semibold text-white/70">Cargando…</p>
      </div>
    )
  }

  return <AdminChrome>{children}</AdminChrome>
}
