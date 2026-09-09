'use client'

import Link from 'next/link'
import { LegalPage } from '@/components/customer/legal-page'
import { BRAND_NAME } from '@/lib/config'
import { useLanguage } from '@/contexts/LanguageContext'

export function AccessibilityPageClient() {
  const { t } = useLanguage()
  return (
    <LegalPage title={t('legal.accessibilityTitle')}>
      <p>{t('legal.accessibilityIntro', { brand: BRAND_NAME })}</p>
      <h2>{t('legal.accessibilityImplementHeading')}</h2>
      <ul>
        <li>{t('legal.accessibilityItem1')}</li>
        <li>{t('legal.accessibilityItem2')}</li>
        <li>{t('legal.accessibilityItem3')}</li>
        <li>{t('legal.accessibilityItem4')}</li>
        <li>{t('legal.accessibilityItem5')}</li>
        <li>{t('legal.accessibilityItem6')}</li>
      </ul>
      <h2>{t('legal.accessibilityBarrierHeading')}</h2>
      <p>
        {t('legal.accessibilityBarrierPre')}{' '}
        <Link href="/help" className="text-brand-900 underline">
          {t('nav.help')}
        </Link>{' '}
        {t('legal.accessibilityBarrierPost')}
      </p>
    </LegalPage>
  )
}
