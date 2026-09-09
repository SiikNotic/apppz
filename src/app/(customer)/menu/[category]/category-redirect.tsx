'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function CategoryRedirect({ categoryId }: { categoryId: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/menu?category=${categoryId}`)
  }, [categoryId, router])
  return <p className="py-16 text-center text-sm text-ink-400">Redirigiendo…</p>
}
