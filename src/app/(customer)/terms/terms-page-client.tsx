'use client'

import Link from 'next/link'
import { LegalPage } from '@/components/customer/legal-page'
import { BRAND_NAME } from '@/lib/config'
import { useLanguage } from '@/contexts/LanguageContext'

export function TermsPageClient() {
  const { t } = useLanguage()
  return (
    <LegalPage title={t('legal.termsTitle')} updated="8 de septiembre de 2026">
      <p>
        {t('legal.termsIntro', { brand: BRAND_NAME })}{' '}
        <Link href="/privacy" className="text-brand-900 underline">
          {t('auth.privacyPolicy')}
        </Link>
        .
      </p>
      <h2>{t('legal.termsOrdersHeading')}</h2>
      <p>{t('legal.termsOrdersBody')}</p>
      <h2>{t('legal.termsPaymentsHeading')}</h2>
      <p>{t('legal.termsPaymentsBody')}</p>
      <h2>{t('legal.termsCancellationsHeading')}</h2>
      <p>
        {t('legal.termsCancellationsPre')}{' '}
        <Link href="/help" className="text-brand-900 underline">
          {t('nav.help')}
        </Link>{' '}
        {t('legal.termsCancellationsPost')}
      </p>
      <h2>{t('legal.termsPointsHeading')}</h2>
      <p>{t('legal.termsPointsBody')}</p>
      <h2>{t('legal.termsAccountsHeading')}</h2>
      <p>{t('legal.termsAccountsBody')}</p>
      <h2>{t('legal.termsContactHeading')}</h2>
      <p>
        {t('legal.termsContactPre')}{' '}
        <Link href="/help" className="text-brand-900 underline">
          {t('nav.help')}
        </Link>
        .
      </p>
    </LegalPage>
  )
}
