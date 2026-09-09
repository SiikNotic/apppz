'use client'

import Link from 'next/link'
import { LegalPage } from '@/components/customer/legal-page'
import { BRAND_NAME } from '@/lib/config'
import { useLanguage } from '@/contexts/LanguageContext'

export function PrivacyPageClient() {
  const { t } = useLanguage()
  return (
    <LegalPage title={t('legal.privacyTitle')} updated="8 de septiembre de 2026">
      <p>{t('legal.privacyIntro', { brand: BRAND_NAME })}</p>
      <h2>{t('legal.privacyCollectHeading')}</h2>
      <ul>
        <li>{t('legal.privacyCollectAccount')}</li>
        <li>{t('legal.privacyCollectAddresses')}</li>
        <li>{t('legal.privacyCollectHistory')}</li>
        <li>{t('legal.privacyCollectPayment')}</li>
      </ul>
      <h2>{t('legal.privacyUseHeading')}</h2>
      <p>{t('legal.privacyUseBody')}</p>
      <h2>{t('legal.privacyShareHeading')}</h2>
      <p>{t('legal.privacyShareBody')}</p>
      <h2>{t('legal.privacyRightsHeading')}</h2>
      <p>
        {t('legal.privacyRightsPre')}{' '}
        <Link href="/account/profile" className="text-brand-900 underline">
          {t('legal.privacyProfileLink')}
        </Link>
        .
      </p>
      <h2>{t('legal.privacyCookiesHeading')}</h2>
      <p>{t('legal.privacyCookiesBody')}</p>
    </LegalPage>
  )
}
