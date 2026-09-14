'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { Users } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader } from '@/components/company/page-header'
import type { Profile, RewardsAccount } from '@/lib/types'

export default function CustomersPage() {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<Profile[]>([])
  const [rewardsByUser, setRewardsByUser] = useState<Record<string, RewardsAccount>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_company_staff', false)
        .order('created_at', { ascending: false })

      const list = profiles ?? []
      setCustomers(list)

      if (list.length > 0) {
        const { data: rewards } = await supabase
          .from('rewards_accounts')
          .select('*')
          .in('user_id', list.map((c) => c.id))
        const map: Record<string, RewardsAccount> = {}
        for (const r of rewards ?? []) map[r.user_id] = r
        setRewardsByUser(map)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-5">
      <PageHeader title={t('customersAdmin.title')} subtitle={t('customersAdmin.subtitle')} />

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}
      {!loading && customers.length === 0 && (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} message={t('customersAdmin.noCustomers')} />
      )}

      {!loading && customers.length > 0 && (
        <>
          {/* Móvil: tarjetas — la tabla de abajo forzaba scroll horizontal
              para ver teléfono/puntos/nivel/fecha a la vez, justo lo que se
              quiere evitar en pantallas angostas (mismo patrón ya usado en
              Pedidos recientes del Dashboard). */}
          <div className="space-y-2 md:hidden">
            {customers.map((customer) => {
              const account = rewardsByUser[customer.id]
              return (
                <Card key={customer.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{customer.full_name || '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">{customer.phone || '—'}</p>
                    </div>
                    <Badge variant="brand">{account?.tier ?? 'Bronze'}</Badge>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {account?.points_balance ?? 0} {t('customersAdmin.points')}
                    </span>
                    <span>{formatDate(customer.created_at)}</span>
                  </div>
                </Card>
              )
            })}
          </div>

          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordersAdmin.customer')}</TableHead>
                  <TableHead>{t('auth.phone')}</TableHead>
                  <TableHead>{t('customersAdmin.points')}</TableHead>
                  <TableHead>{t('customersAdmin.tier')}</TableHead>
                  <TableHead>{t('customersAdmin.registered')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const account = rewardsByUser[customer.id]
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-semibold text-foreground">{customer.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.phone || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{account?.points_balance ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="brand">{account?.tier ?? 'Bronze'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(customer.created_at)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}
