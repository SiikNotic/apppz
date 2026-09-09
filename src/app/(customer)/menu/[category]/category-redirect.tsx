'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export function CategoryRedirect({ categoryId }: { categoryId: string }) {
  const router = useRouter()
  const { t } = useLanguage()
  useEffect(() => {
    router.replace(`/menu?category=${categoryId}`)
  }, [categoryId, router])
  return <p className="py-16 text-center text-sm text-ink-400">{t('product.redirecting')}</p>
}
