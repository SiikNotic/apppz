'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function CustomerLoading() {
  const { t } = useLanguage()
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-3 p-3.5">
            <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
