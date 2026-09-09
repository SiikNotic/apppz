'use client'

import { Mail, Phone, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'

export function HelpPageClient() {
  const { t } = useLanguage()
  const faqs = [
    { q: t('help.faq1Q'), a: t('help.faq1A') },
    { q: t('help.faq2Q'), a: t('help.faq2A') },
    { q: t('help.faq3Q'), a: t('help.faq3A') },
    { q: t('help.faq4Q'), a: t('help.faq4A') },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{t('help.title')}</h1>
        <p className="text-sm text-ink-400">{t('help.subtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex flex-col items-center gap-2 p-5 text-center">
          <Phone size={20} className="text-brand-900" aria-hidden="true" />
          <p className="text-xs font-semibold text-ink-600">{t('help.callUs')}</p>
          <a href="tel:+10000000000" className="text-sm font-bold text-ink-900">
            (000) 000-0000
          </a>
        </Card>
        <Card className="flex flex-col items-center gap-2 p-5 text-center">
          <Mail size={20} className="text-brand-900" aria-hidden="true" />
          <p className="text-xs font-semibold text-ink-600">{t('help.writeUs')}</p>
          <a href="mailto:ayuda@neropizza.co" className="text-sm font-bold text-ink-900">
            ayuda@neropizza.co
          </a>
        </Card>
        <Card className="flex flex-col items-center gap-2 p-5 text-center">
          <MessageCircle size={20} className="text-brand-900" aria-hidden="true" />
          <p className="text-xs font-semibold text-ink-600">{t('help.liveChat')}</p>
          <p className="text-sm font-bold text-ink-900">{t('help.comingSoon')}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-base font-bold text-ink-900">{t('help.faqTitle')}</h2>
        <dl className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <dt className="text-sm font-bold text-ink-900">{faq.q}</dt>
              <dd className="mt-1 text-sm text-ink-600">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
