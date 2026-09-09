'use client'

import { CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PaymentMethodsPage() {
  const { t } = useLanguage()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{t('account.paymentTitle')}</h1>
        <p className="text-sm text-ink-400">{t('account.paymentSubtitle')}</p>
      </div>

      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <CreditCard size={28} className="text-ink-200" aria-hidden="true" />
        <p className="max-w-sm text-sm text-ink-400">{t('account.paymentComingSoon')}</p>
      </Card>
    </div>
  )
}
