import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-ink-900">{title}</h1>
      {updated && <p className="mt-1 text-xs text-ink-400">Última actualización: {updated}</p>}
      <Card className="mt-5 space-y-4 p-6 text-sm leading-relaxed text-ink-600 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink-900 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </Card>
    </div>
  )
}
