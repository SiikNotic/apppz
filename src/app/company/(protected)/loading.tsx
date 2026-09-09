'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export default function CompanyLoading() {
  const { t } = useLanguage()
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-3xl bg-white shadow-card" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl bg-white shadow-card" />
    </div>
  )
}
