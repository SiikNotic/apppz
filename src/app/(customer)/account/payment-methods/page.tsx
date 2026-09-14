'use client'

import { CreditCard } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PaymentMethodsPage() {
  const { t } = useLanguage()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{t('account.paymentTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('account.paymentSubtitle')}</p>
      </div>

      <EmptyState icon={<CreditCard size={28} aria-hidden="true" />} message={t('account.paymentComingSoon')} />
    </div>
  )
}
