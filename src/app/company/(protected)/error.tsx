'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reloadOnceIfChunkError } from '@/lib/chunk-error'

export default function CompanyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    console.error('[company-error]', error.digest, error)
    if (reloadOnceIfChunkError(error)) setReloading(true)
  }, [error])

  // No mostramos la tarjeta roja para esto — un segundo después ya se
  // fue a recargar. Verlo como error real solo confunde.
  if (reloading) {
    return <p className="py-24 text-center text-sm text-muted-foreground">Cargando la última versión…</p>
  }

  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-500/15 text-danger-500">
        <AlertTriangle size={24} aria-hidden="true" />
      </span>
      <h1 className="text-lg font-extrabold text-foreground">Algo no salió bien</h1>
      <p className="max-w-sm text-sm text-muted-foreground">No pudimos cargar esta sección del dashboard.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  )
}
