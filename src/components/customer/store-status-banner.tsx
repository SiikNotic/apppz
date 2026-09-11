'use client'

import { Clock, AlertCircle } from 'lucide-react'
import { useStoreStatus } from '@/hooks/useStoreStatus'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'

// A partir de cuántos minutos antes del cierre se avisa — calculado
// siempre del horario real configurado, nunca un valor fijo mostrado sin
// checar la hora de verdad.
const CLOSING_SOON_THRESHOLD_MIN = 30

export function StoreStatusBanner() {
  const { status, loading } = useStoreStatus()
  const { t } = useLanguage()

  if (loading || !status) return null

  if (!status.is_open) {
    const reasonLine =
      status.closed_reason && status.closed_reason !== 'manual'
        ? t('storeStatus.closedReason', { reason: status.closed_reason })
        : t('storeStatus.closedGeneric')
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white shadow-card">
        <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{reasonLine}</p>
          <p className="text-xs text-white/70">
            {status.next_open_at ? t('storeStatus.nextOpen', { datetime: formatDate(status.next_open_at) }) : t('storeStatus.cannotOrder')}
          </p>
        </div>
      </div>
    )
  }

  if (status.minutes_to_close != null && status.minutes_to_close <= CLOSING_SOON_THRESHOLD_MIN) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-warning-500 shadow-card">
        <Clock size={18} className="shrink-0" aria-hidden="true" />
        <p className="text-sm font-bold">{t('storeStatus.closingSoon', { minutes: status.minutes_to_close })}</p>
      </div>
    )
  }

  return null
}
