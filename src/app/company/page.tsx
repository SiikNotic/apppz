'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CompanyIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/company/dashboard')
  }, [router])

  return (
    <div className="grid min-h-screen place-items-center bg-ink-900">
      <p className="text-sm font-semibold text-white/70">Cargando…</p>
    </div>
  )
}
