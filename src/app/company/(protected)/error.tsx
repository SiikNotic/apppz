'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CompanyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[company-error]', error.digest, error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-red-50 text-danger-500">
        <AlertTriangle size={24} aria-hidden="true" />
      </span>
      <h1 className="text-lg font-extrabold text-ink-900">Algo no salió bien</h1>
      <p className="max-w-sm text-sm text-ink-600">No pudimos cargar esta sección del dashboard.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  )
}
