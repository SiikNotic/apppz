'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DollarSign, ClipboardList, AlertTriangle, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { StatCard } from '@/components/ui/stat-card'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import { type Ingredient, type Order, type OrderStatus } from '@/lib/types'

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const STATUS_VARIANT: Record<OrderStatus, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'brand',
  preparing: 'brand',
  ready: 'success',
  out_for_delivery: 'success',
  delivered: 'neutral',
  cancelled: 'danger',
  refunded: 'danger',
  failed: 'danger',
}

export default function DashboardPage() {
  const { can } = useAuth()
  const { t } = useLanguage()
  const canView = can('orders.view')
  const [todayOrders, setTodayOrders] = useState<Order[]>([])
  const [lowStock, setLowStock] = useState<Ingredient[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      const [todayRes, ingredientsRes, recentRes] = await Promise.all([
        supabase.from('orders').select('*').gte('created_at', startOfToday()),
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(6),
      ])
      if (!active) return
      setTodayOrders((todayRes.data ?? []).filter((o) => o.status !== 'cancelled'))
      setLowStock((ingredientsRes.data ?? []).filter((i) => i.stock_quantity <= i.min_stock))
      setRecentOrders(recentRes.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [canView])

  const revenueToday = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const activeOrders = todayOrders.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
  ).length
  const avgTicket = todayOrders.length > 0 ? revenueToday / todayOrders.length : 0

  if (!canView) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <AlertTriangle size={28} className="text-ink-200" aria-hidden="true" />
        <p className="text-sm text-ink-400">{t('ordersAdmin.noPermission')}</p>
      </Card>
    )
  }

  if (loading) return <p className="text-sm text-ink-400">{t('dashboardHome.loadingDashboard')}</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{t('dashboardHome.title')}</h1>
        <p className="text-sm text-ink-400">{t('dashboardHome.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t('dashboardHome.salesToday')}
          value={formatCurrency(revenueToday)}
          icon={<DollarSign size={20} />}
          tone="brand"
        />
        <StatCard
          label={t('dashboardHome.ordersToday')}
          value={String(todayOrders.length)}
          icon={<ClipboardList size={20} />}
          tone="brand"
          hint={t('dashboardHome.activeCount', { count: activeOrders })}
        />
        <StatCard
          label={t('dashboardHome.avgTicket')}
          value={formatCurrency(avgTicket)}
          icon={<TrendingUp size={20} />}
          tone="success"
        />
        <StatCard
          label={t('dashboardHome.lowIngredients')}
          value={String(lowStock.length)}
          icon={<AlertTriangle size={20} />}
          tone={lowStock.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink-900">{t('dashboardHome.recentOrders')}</h2>
            <Link href="/company/orders" className="text-xs font-bold text-brand-900">
              {t('dashboardHome.viewAll')}
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 && (
              <p className="text-sm text-ink-400">{t('dashboardHome.noOrdersYet')}</p>
            )}
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-ink-900">
                    #{order.order_number} · {order.customer_name}
                  </p>
                  <p className="text-xs text-ink-400">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900">{formatCurrency(order.total)}</span>
                  <Badge variant={STATUS_VARIANT[order.status as OrderStatus]}>
                    {t(`orderStatus.${order.status}`)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink-900">{t('dashboardHome.stockAlerts')}</h2>
            <Link href="/company/inventory" className="text-xs font-bold text-brand-900">
              {t('dashboardHome.viewInventory')}
            </Link>
          </div>
          <div className="space-y-3">
            {lowStock.length === 0 && (
              <p className="text-sm text-ink-400">{t('dashboardHome.allStockGood')}</p>
            )}
            {lowStock.map((ing) => (
              <div key={ing.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-900">{ing.name}</span>
                <span className="font-semibold text-danger-500">
                  {ing.stock_quantity} / {ing.min_stock} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
