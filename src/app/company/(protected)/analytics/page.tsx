'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DollarSign, ShoppingCart, Receipt, Trophy, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/company/page-header'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Order, OrderItem } from '@/lib/types'

// Convierte un valor de celda a texto seguro para CSV: si contiene coma,
// comilla o salto de línea hay que envolverlo en comillas y duplicar las
// comillas internas (RFC 4180) — si no, un nombre de cliente con coma
// rompería las columnas al abrir el archivo en Excel/Sheets.
function csvCell(value: string | number): string {
  const str = String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // ﻿ (BOM) al inicio para que Excel detecte UTF-8 y no rompa acentos.
  const csv = '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { can } = useAuth()
  const { t } = useLanguage()
  const canView = can('analytics.view')

  const RANGES = [
    { key: 7, label: t('analyticsAdmin.range7') },
    { key: 14, label: t('analyticsAdmin.range14') },
    { key: 30, label: t('analyticsAdmin.range30') },
  ] as const
  const [rangeDays, setRangeDays] = useState<number>(7)
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - (rangeDays - 1))
      since.setHours(0, 0, 0, 0)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', since.toISOString())
        .neq('status', 'cancelled')
        .order('created_at')

      const orderIds = (ordersData ?? []).map((o) => o.id)
      const { data: itemsData } =
        orderIds.length > 0
          ? await supabase.from('order_items').select('*').in('order_id', orderIds)
          : { data: [] }

      if (!active) return
      setOrders(ordersData ?? [])
      setItems(itemsData ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [rangeDays, canView])

  const dailySeries = useMemo(() => {
    const buckets = new Map<string, number>()
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      buckets.set(key, 0)
    }
    for (const order of orders) {
      const key = new Date(order.created_at).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
      })
      buckets.set(key, (buckets.get(key) ?? 0) + order.total)
    }
    return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }))
  }, [orders, rangeDays])

  const topItems = useMemo(() => {
    const byName = new Map<string, { quantity: number; revenue: number }>()
    for (const item of items) {
      const entry = byName.get(item.item_name) ?? { quantity: 0, revenue: 0 }
      entry.quantity += item.quantity
      entry.revenue += item.subtotal
      byName.set(item.item_name, entry)
    }
    return Array.from(byName.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 6)
  }, [items])

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const totalOrders = orders.length
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const itemsSold = items.reduce((sum, i) => sum + i.quantity, 0)

  function exportOrdersCsv() {
    downloadCsv(`${t('analyticsAdmin.csvOrdersFilenamePrefix')}_${rangeDays}${t('analyticsAdmin.daysSuffix')}_${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        t('analyticsAdmin.csvHeaderOrder'),
        t('analyticsAdmin.csvHeaderDate'),
        t('ordersAdmin.customer'),
        t('ordersAdmin.type'),
        t('ordersAdmin.status'),
        t('checkout.subtotal'),
        t('checkout.shipping'),
        t('checkout.total'),
      ],
      ...orders.map((o) => [
        o.order_number,
        formatDate(o.created_at),
        o.customer_name,
        o.order_type === 'delivery' ? t('ordersAdmin.deliveryType') : t('ordersAdmin.pickupType'),
        o.status,
        o.subtotal,
        o.delivery_fee,
        o.total,
      ]),
    ])
  }

  function exportTopItemsCsv() {
    downloadCsv(`${t('analyticsAdmin.csvTopItemsFilenamePrefix')}_${rangeDays}${t('analyticsAdmin.daysSuffix')}_${new Date().toISOString().slice(0, 10)}.csv`, [
      [t('analyticsAdmin.csvHeaderProduct'), t('analyticsAdmin.csvHeaderUnitsSold'), t('analyticsAdmin.revenue')],
      ...topItems.map(([name, data]) => [name, data.quantity, data.revenue]),
    ])
  }

  if (!canView) {
    return <EmptyState icon={<Receipt size={28} aria-hidden="true" />} message={t('ordersAdmin.noPermission')} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('analyticsAdmin.title')}
        subtitle={t('analyticsAdmin.subtitle')}
        actions={
          <>
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeDays(r.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  rangeDays === r.key ? 'bg-brand-500 text-ink-900 shadow-card' : 'bg-card text-muted-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
            <Button size="sm" variant="secondary" onClick={exportOrdersCsv} disabled={loading || orders.length === 0}>
              <Download size={14} aria-hidden="true" /> {t('analyticsAdmin.downloadOrdersCsv')}
            </Button>
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('analyticsAdmin.loadingReports')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={t('analyticsAdmin.revenue')}
              value={formatCurrency(totalRevenue)}
              icon={<DollarSign size={20} />}
            />
            <StatCard label={t('ordersAdmin.title')} value={String(totalOrders)} icon={<ShoppingCart size={20} />} />
            <StatCard
              label={t('dashboardHome.avgTicket')}
              value={formatCurrency(avgTicket)}
              icon={<Receipt size={20} />}
              tone="success"
            />
            <StatCard label={t('analyticsAdmin.itemsSold')} value={String(itemsSold)} icon={<Trophy size={20} />} tone="warning" />
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink-900">{t('analyticsAdmin.salesByDay')}</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1dcbe" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#7a746b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#7a746b" width={70} tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="total" fill="#f2601c" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-ink-900">{t('analyticsAdmin.topProducts')}</h2>
              {topItems.length > 0 && (
                <Button size="sm" variant="secondary" onClick={exportTopItemsCsv}>
                  <Download size={14} aria-hidden="true" /> {t('analyticsAdmin.csvShort')}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {topItems.length === 0 && (
                <p className="text-sm text-ink-400">{t('analyticsAdmin.noSalesPeriod')}</p>
              )}
              {topItems.map(([name, data], i) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-900">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-ink-900">{name}</span>
                    <span className="text-xs text-ink-400">
                      {data.quantity} {t('analyticsAdmin.unitsSuffix')}
                    </span>
                  </div>
                  <span className="font-bold text-ink-900">{formatCurrency(data.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
