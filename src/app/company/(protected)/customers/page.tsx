'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

      <Card className="overflow-x-auto p-0">
        <Table className="min-w-[600px]">
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
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-ink-400">{t('common.loading')}</TableCell>
              </TableRow>
            )}
            {!loading && customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-ink-400">{t('customersAdmin.noCustomers')}</TableCell>
              </TableRow>
            )}
            {customers.map((customer) => {
              const account = rewardsByUser[customer.id]
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-semibold text-ink-900">{customer.full_name || '—'}</TableCell>
                  <TableCell className="text-ink-600">{customer.phone || '—'}</TableCell>
                  <TableCell className="text-ink-600">{account?.points_balance ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant="brand">{account?.tier ?? 'Bronze'}</Badge>
                  </TableCell>
                  <TableCell className="text-ink-400">{formatDate(customer.created_at)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
