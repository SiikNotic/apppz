'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ComposedChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  DollarSign,
  ClipboardList,
  Users,
  AlertTriangle,
  Flame,
  Bike,
  PackageX,
  MessageCircleWarning,
  Timer,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { StatCard } from '@/components/ui/stat-card'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ItemThumb } from '@/components/ui/item-thumb'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/company/page-header'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import { type Order, type OrderStatus } from '@/lib/types'

const LOST_STATUSES: OrderStatus[] = ['cancelled', 'refunded', 'failed']
const PROCESSING_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'out_for_delivery']
const STUCK_MINUTES = 20

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

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

interface TopItem {
  name: string
  imageUrl: string | null
  quantity: number
  orders: number
}

interface RecentOrderRow extends Order {
  itemCount: number
}

export default function DashboardPage() {
  const { can } = useAuth()
  const { t, language } = useLanguage()
  const canView = can('orders.view')
  const [loading, setLoading] = useState(true)

  const [chartData, setChartData] = useState<{ day: string; thisWeek: number; lastWeek: number }[]>([])
  const [revenueThisWeek, setRevenueThisWeek] = useState(0)
  const [revenueLastWeek, setRevenueLastWeek] = useState(0)
  const [ordersThisWeek, setOrdersThisWeek] = useState(0)
  const [ordersLastWeek, setOrdersLastWeek] = useState(0)
  const [newCustomersThisWeek, setNewCustomersThisWeek] = useState(0)
  const [newCustomersLastWeek, setNewCustomersLastWeek] = useState(0)
  const [statusCounts, setStatusCounts] = useState({ delivered: 0, pending: 0, cancelled: 0, processing: 0 })
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrderRow[]>([])

  // --- Prioridades operativas del día (ver PageHeader de abajo) ---------
  const [salesToday, setSalesToday] = useState(0)
  const [ordersTodayCount, setOrdersTodayCount] = useState(0)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)
  const [kitchenCounts, setKitchenCounts] = useState({ pending: 0, preparing: 0, ready: 0 })
  const [outForDeliveryCount, setOutForDeliveryCount] = useState(0)
  const [driverCounts, setDriverCounts] = useState({ available: 0, on_delivery: 0 })
  const [lowStockCount, setLowStockCount] = useState(0)
  const [openSupportCount, setOpenSupportCount] = useState(0)
  const [stuckOrdersCount, setStuckOrdersCount] = useState(0)

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
    let active = true

    async function load() {
      const since30 = daysAgo(29).toISOString()
      const today0 = daysAgo(0)

      const [ordersRes, customersRes, menuItemsRes, recentRes, driversRes, ingredientsRes, supportRes] = await Promise.all([
        supabase.from('orders').select('*').gte('created_at', since30),
        supabase
          .from('profiles')
          .select('id, created_at')
          .eq('is_company_staff', false)
          .gte('created_at', daysAgo(13).toISOString()),
        supabase.from('menu_items').select('id, name, image_url'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(6),
        // Las 3 consultas siguientes son informativas para las alertas —
        // si el rol actual no tiene permiso para verlas, RLS simplemente
        // devuelve vacío y la alerta correspondiente no se muestra, en vez
        // de romper el resto del dashboard.
        supabase.from('drivers').select('status'),
        supabase.from('ingredients').select('stock_quantity, min_stock'),
        supabase.from('issue_reports').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
      ])
      if (!active) return

      const windowOrders = ordersRes.data ?? []
      const orderIds = windowOrders.map((o) => o.id)
      const { data: windowItems } = orderIds.length
        ? await supabase.from('order_items').select('*').in('order_id', orderIds)
        : { data: [] }

      // --- Serie de 14 días (esta semana vs. semana pasada), alineada por
      // día de la semana — así "hoy" se compara contra "el mismo día hace
      // una semana", no contra un día distinto.
      const revenueByDay = new Map<string, number>()
      for (const o of windowOrders) {
        if (LOST_STATUSES.includes(o.status as OrderStatus)) continue
        const key = dayKey(o.created_at)
        revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + o.total)
      }
      const days: { day: string; thisWeek: number; lastWeek: number }[] = []
      let sumThisWeek = 0
      let sumLastWeek = 0
      for (let i = 6; i >= 0; i--) {
        const thisDate = daysAgo(i)
        const lastDate = daysAgo(i + 7)
        const thisVal = revenueByDay.get(dayKey(thisDate)) ?? 0
        const lastVal = revenueByDay.get(dayKey(lastDate)) ?? 0
        sumThisWeek += thisVal
        sumLastWeek += lastVal
        days.push({
          day: thisDate.toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { weekday: 'short' }),
          thisWeek: thisVal,
          lastWeek: lastVal,
        })
      }

      const ordersThis = windowOrders.filter(
        (o) => new Date(o.created_at) >= daysAgo(6) && !LOST_STATUSES.includes(o.status as OrderStatus)
      ).length
      const ordersLast = windowOrders.filter((o) => {
        const d = new Date(o.created_at)
        return d >= daysAgo(13) && d < daysAgo(6) && !LOST_STATUSES.includes(o.status as OrderStatus)
      }).length

      const customersThis = (customersRes.data ?? []).filter((p) => new Date(p.created_at) >= daysAgo(6)).length
      const customersLast = (customersRes.data ?? []).filter((p) => {
        const d = new Date(p.created_at)
        return d >= daysAgo(13) && d < daysAgo(6)
      }).length

      // --- Hoy, operación activa y cocina/entrega en vivo — todo
      // derivado de la misma ventana de 30 días ya cargada, sin
      // consultas adicionales. "Activo" = no entregado ni perdido.
      let todaySalesSum = 0
      let todayCount = 0
      let activeCount = 0
      const kitchenTally = { pending: 0, preparing: 0, ready: 0 }
      let outForDelivery = 0
      let stuckCount = 0
      const statusTally = { delivered: 0, pending: 0, cancelled: 0, processing: 0 }
      const now = Date.now()
      for (const o of windowOrders) {
        const s = o.status as OrderStatus
        const createdAt = new Date(o.created_at)
        if (createdAt >= today0) {
          todayCount++
          if (!LOST_STATUSES.includes(s)) todaySalesSum += o.total
        }
        if (s === 'delivered') statusTally.delivered++
        else if (s === 'pending') statusTally.pending++
        else if (LOST_STATUSES.includes(s)) statusTally.cancelled++
        else if (PROCESSING_STATUSES.includes(s)) statusTally.processing++

        if (s === 'pending' || PROCESSING_STATUSES.includes(s)) {
          activeCount++
          const minutesElapsed = (now - createdAt.getTime()) / 60000
          if ((s === 'pending' || s === 'preparing') && minutesElapsed > STUCK_MINUTES) stuckCount++
        }
        if (s === 'pending') kitchenTally.pending++
        else if (s === 'preparing') kitchenTally.preparing++
        else if (s === 'ready') kitchenTally.ready++
        else if (s === 'out_for_delivery') outForDelivery++
      }

      const driverTally = { available: 0, on_delivery: 0 }
      for (const d of driversRes.data ?? []) {
        if (d.status === 'available') driverTally.available++
        else if (d.status === 'on_delivery') driverTally.on_delivery++
      }
      const lowStock = (ingredientsRes.data ?? []).filter((i) => i.stock_quantity <= i.min_stock).length

      // Más vendidos: solo de pedidos que sí se concretaron (se excluyen
      // cancelados/reembolsados/fallidos) — igual que en Analytics.
      const validOrderIds = new Set(
        windowOrders.filter((o) => !LOST_STATUSES.includes(o.status as OrderStatus)).map((o) => o.id)
      )
      const menuImageByName = new Map((menuItemsRes.data ?? []).map((m) => [m.name, m.image_url]))
      const itemTally = new Map<string, { quantity: number; orders: Set<string> }>()
      for (const item of windowItems ?? []) {
        if (!validOrderIds.has(item.order_id)) continue
        const entry = itemTally.get(item.item_name) ?? { quantity: 0, orders: new Set<string>() }
        entry.quantity += item.quantity
        entry.orders.add(item.order_id)
        itemTally.set(item.item_name, entry)
      }
      const top = Array.from(itemTally.entries())
        .map(([name, v]) => ({ name, imageUrl: menuImageByName.get(name) ?? null, quantity: v.quantity, orders: v.orders.size }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      const recent = recentRes.data ?? []
      const recentIds = recent.map((o) => o.id)
      const { data: recentItems } = recentIds.length
        ? await supabase.from('order_items').select('order_id, quantity').in('order_id', recentIds)
        : { data: [] }
      const countByOrder = new Map<string, number>()
      for (const it of recentItems ?? []) countByOrder.set(it.order_id, (countByOrder.get(it.order_id) ?? 0) + it.quantity)

      if (!active) return
      setChartData(days)
      setRevenueThisWeek(sumThisWeek)
      setRevenueLastWeek(sumLastWeek)
      setOrdersThisWeek(ordersThis)
      setOrdersLastWeek(ordersLast)
      setNewCustomersThisWeek(customersThis)
      setNewCustomersLastWeek(customersLast)
      setStatusCounts(statusTally)
      setTopItems(top)
      setRecentOrders(recent.map((o) => ({ ...o, itemCount: countByOrder.get(o.id) ?? 0 })))
      setSalesToday(todaySalesSum)
      setOrdersTodayCount(todayCount)
      setActiveOrdersCount(activeCount)
      setKitchenCounts(kitchenTally)
      setOutForDeliveryCount(outForDelivery)
      setDriverCounts(driverTally)
      setLowStockCount(lowStock)
      setOpenSupportCount(supportRes.count ?? 0)
      setStuckOrdersCount(stuckCount)
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [canView, language])

  if (!canView) {
    return <EmptyState icon={<AlertTriangle size={28} aria-hidden="true" />} message={t('ordersAdmin.noPermission')} />
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('dashboardHome.loadingDashboard')}</p>

  const totalStatusOrders = statusCounts.delivered + statusCounts.pending + statusCounts.cancelled + statusCounts.processing
  const donutData = [
    { key: 'delivered', name: t('dashboardHome.statusDelivered'), value: statusCounts.delivered, color: 'var(--success-500)' },
    { key: 'processing', name: t('dashboardHome.statusProcessing'), value: statusCounts.processing, color: 'var(--brand-500)' },
    { key: 'pending', name: t('dashboardHome.statusPending'), value: statusCounts.pending, color: 'var(--warning-500)' },
    // Gris neutro (no rojo) para "Cancelados" — el rojo/danger se
    // reserva para alertas activas; un pedido cancelado ya es historia,
    // no algo urgente, y con "En proceso" en brand-500 (rojo-naranja)
    // los dos tonos rojos eran casi indistinguibles en el donut.
    { key: 'cancelled', name: t('dashboardHome.statusCancelled'), value: statusCounts.cancelled, color: 'var(--border-strong)' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title={t('dashboardHome.title')} subtitle={t('dashboardHome.subtitle')} />

      {/* Alertas — solo aparecen si hay algo real que atender, nunca como
          relleno visual. Cada una usa datos ya cargados arriba. */}
      {(openSupportCount > 0 || stuckOrdersCount > 0 || lowStockCount > 0) && (
        <div className="space-y-2">
          {stuckOrdersCount > 0 && (
            <div role="status" className="flex items-center gap-2.5 rounded-2xl bg-danger-500/10 px-4 py-3 text-sm font-semibold text-danger-500">
              <Timer size={16} className="shrink-0" aria-hidden="true" />
              {t('dashboardHome.stuckOrdersAlert', { count: stuckOrdersCount })}
              <Link href="/company/kitchen" className="ml-auto shrink-0 font-bold underline">
                {t('dashboardHome.viewAll')}
              </Link>
            </div>
          )}
          {openSupportCount > 0 && (
            <div role="status" className="flex items-center gap-2.5 rounded-2xl bg-warning-500/10 px-4 py-3 text-sm font-semibold text-warning-300">
              <MessageCircleWarning size={16} className="shrink-0" aria-hidden="true" />
              {t('dashboardHome.openSupportAlert', { count: openSupportCount })}
              <Link href="/company/support" className="ml-auto shrink-0 font-bold underline">
                {t('dashboardHome.viewAll')}
              </Link>
            </div>
          )}
          {lowStockCount > 0 && (
            <div role="status" className="flex items-center gap-2.5 rounded-2xl bg-warning-500/10 px-4 py-3 text-sm font-semibold text-warning-300">
              <PackageX size={16} className="shrink-0" aria-hidden="true" />
              {t('dashboardHome.stockAlerts')}: {t('dashboardHome.lowIngredients')} ({lowStockCount})
              <Link href="/company/inventory" className="ml-auto shrink-0 font-bold underline">
                {t('dashboardHome.viewInventory')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Prioridad #1: cuánto se vendió y cuántos pedidos hoy — un vistazo,
          sin tener que interpretar un gráfico. Deliberadamente solo 2
          tarjetas (no una por cada métrica posible). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label={t('dashboardHome.salesToday')}
          value={formatCurrency(salesToday)}
          icon={<DollarSign size={20} />}
          tone="highlight"
        />
        <StatCard
          label={t('dashboardHome.ordersToday')}
          value={String(ordersTodayCount)}
          icon={<ClipboardList size={20} />}
          tone="brand"
          hint={t('dashboardHome.activeCount', { count: activeOrdersCount })}
        />
      </div>

      {/* Operación en vivo: cocina y entregas en una sola tarjeta densa en
          vez de una StatCard por número — es exactamente el tipo de
          "sobreuso de tarjetas de estadística" que se quiere evitar. */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t('dashboardHome.liveOperationsHeading')}
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Link href="/company/kitchen" className="flex items-center gap-3 rounded-2xl p-2 -m-2 transition hover:bg-accent">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
              <ClipboardList size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-extrabold leading-none text-foreground">{activeOrdersCount}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{t('dashboardHome.activeOrdersLabel')}</p>
            </div>
          </Link>

          <Link href="/company/kitchen" className="rounded-2xl p-2 -m-2 transition hover:bg-accent">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Flame size={14} className="text-brand-400" aria-hidden="true" /> {t('dashboardHome.kitchenStatusLabel')}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <span className="h-2 w-2 rounded-full bg-warning-500" aria-hidden="true" /> {kitchenCounts.pending} {t('kitchen.colNew')}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" /> {kitchenCounts.preparing} {t('kitchen.colPreparing')}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <span className="h-2 w-2 rounded-full bg-success-500" aria-hidden="true" /> {kitchenCounts.ready} {t('kitchen.colReady')}
              </span>
            </div>
          </Link>

          <Link href="/company/drivers" className="rounded-2xl p-2 -m-2 transition hover:bg-accent">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Bike size={14} className="text-success-500" aria-hidden="true" /> {t('dashboardHome.deliveryStatusLabel')}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <span className="font-bold text-foreground">
                {outForDeliveryCount} <span className="font-normal text-muted-foreground">{t('orderStatus.out_for_delivery')}</span>
              </span>
              <span className="font-bold text-foreground">
                {driverCounts.available}{' '}
                <span className="font-normal text-muted-foreground">{t('dashboardHome.availableDriversLabel')}</span>
              </span>
            </div>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-foreground">{t('dashboardHome.revenueOverview')}</h2>
            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" /> {t('dashboardHome.thisWeek')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/20" aria-hidden="true" /> {t('dashboardHome.lastWeek')}
              </span>
            </div>
          </div>
          <div className="h-64 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatCurrency(Number(v))} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--popover-foreground)' }}
                />
                <Area type="monotone" dataKey="thisWeek" stroke="var(--brand-500)" fill="var(--brand-500)" fillOpacity={0.15} strokeWidth={2.5} name={t('dashboardHome.thisWeek')} />
                <Line type="monotone" dataKey="lastWeek" stroke="var(--border-strong)" strokeWidth={2} strokeDasharray="4 4" dot={false} name={t('dashboardHome.lastWeek')} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-extrabold text-foreground">{t('dashboardHome.orderStatusHeading')}</h2>
          {totalStatusOrders === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboardHome.noDataYet')}</p>
          ) : (
            <>
              <div className="relative h-44 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                      {donutData.map((d) => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--popover-foreground)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-foreground">{totalStatusOrders}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{t('dashboardHome.totalOrders')}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {donutData.map((d) => (
                  <div key={d.key} className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                      {d.name}
                    </span>
                    <span className="text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-base font-extrabold text-foreground">{t('dashboardHome.recentOrders')}</h2>
          <Link href="/company/kitchen" className="text-xs font-bold text-brand-400">
            {t('dashboardHome.viewAll')}
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">{t('dashboardHome.noOrdersYet')}</p>
        ) : (
          <>
            {/* Móvil: tarjetas — la tabla de abajo necesitaba scroll
                horizontal para ver cliente/total/estado a la vez, justo lo
                que se quiere evitar en el teléfono (mismo patrón que ya se
                usa en el historial de pedidos del cliente). */}
            <div className="space-y-2 p-3 md:hidden">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">#{order.order_number}</p>
                      <p className="truncate text-xs text-muted-foreground">{order.customer_name}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[order.status as OrderStatus]}>
                      {t(`orderStatus.${order.status}`)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {t('dashboardHome.itemsSuffix', { count: order.itemCount })} · {formatDate(order.created_at)}
                    </span>
                    <span className="shrink-0 font-bold text-foreground">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>

            <Table className="mt-3 hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordersAdmin.orderLabel')}</TableHead>
                  <TableHead>{t('ordersAdmin.customer')}</TableHead>
                  <TableHead>{t('checkout.total')}</TableHead>
                  <TableHead>{t('ordersAdmin.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-semibold text-foreground">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboardHome.itemsSuffix', { count: order.itemCount })} · {formatDate(order.created_at)}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.customer_name}</TableCell>
                    <TableCell className="font-bold text-foreground">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status as OrderStatus]}>{t(`orderStatus.${order.status}`)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">{t('dashboardHome.topSellingItems')}</h2>
          <Link href="/company/menu" className="text-xs font-bold text-brand-400">
            {t('dashboardHome.viewAll')}
          </Link>
        </div>
        {topItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboardHome.noDataYet')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topItems.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <ItemThumb name={item.name} imageUrl={item.imageUrl} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboardHome.ordersSuffix', { count: item.orders })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Comparativa semanal (nuevos clientes/pedidos vs. semana pasada) —
          se mantiene, pero deliberadamente al final: es contexto de
          tendencia, no algo que la operación necesite ver antes que el
          estado de cocina/entregas de ahora mismo. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label={t('dashboardHome.totalOrders')}
          value={String(ordersThisWeek)}
          icon={<ClipboardList size={20} />}
          tone="brand"
          trend={{ pct: pctChange(ordersThisWeek, ordersLastWeek), label: t('dashboardHome.fromLastWeek', { pct: pctChange(ordersThisWeek, ordersLastWeek).toFixed(1) }) }}
        />
        <StatCard
          label={t('dashboardHome.newCustomers')}
          value={String(newCustomersThisWeek)}
          icon={<Users size={20} />}
          tone="success"
          trend={{ pct: pctChange(newCustomersThisWeek, newCustomersLastWeek), label: t('dashboardHome.fromLastWeek', { pct: pctChange(newCustomersThisWeek, newCustomersLastWeek).toFixed(1) }) }}
        />
      </div>
    </div>
  )
}
