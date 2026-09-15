'use client'

// Cancelación de pedido por el cliente — Sesión 23. Nunca cancela al
// primer tap: siempre pasa por (1) elegir motivo, (2) si hay algo que
// reembolsar, elegir cómo, (3) confirmar viendo el monto real. La
// elegibilidad y el monto reembolsable SIEMPRE vienen del servidor
// (get_cancellation_preview) — este diálogo nunca decide ni calcula esos
// números por su cuenta, solo los muestra.
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/LanguageContext'
import { getCancellationPreview, cancelOrderSelf } from '@/lib/data-access/cancellations'
import { CANCELLATION_REASONS, CANCELLATION_REASON_I18N_KEY } from '@/lib/types'
import type { CancellationPreview, CancellationReason, RefundMethod } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface CancelOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderNumber: number
  onCancelled: () => void
}

type Step = 'loading' | 'blocked' | 'reason' | 'confirm'

const BLOCK_REASON_I18N_KEY: Record<string, string> = {
  already_cancelled: 'cancellation.blockAlreadyCancelled',
  window_expired: 'cancellation.blockWindowExpired',
  requires_support: 'cancellation.blockRequiresSupport',
  not_cancellable_status: 'cancellation.blockNotCancellable',
}

export function CancelOrderDialog({ open, onOpenChange, orderId, orderNumber, onCancelled }: CancelOrderDialogProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('loading')
  const [preview, setPreview] = useState<CancellationPreview | null>(null)
  const [reason, setReason] = useState<CancellationReason>('changed_mind')
  const [detail, setDetail] = useState('')
  const [refundMethod, setRefundMethod] = useState<Exclude<RefundMethod, 'none'>>('credit')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setStep('loading')
    setError(null)
    getCancellationPreview(orderId)
      .then((p) => {
        if (!active) return
        setPreview(p)
        setStep(p.can_customer_cancel ? 'reason' : 'blocked')
      })
      .catch(() => {
        if (!active) return
        setError(t('common.genericError'))
        setStep('blocked')
      })
    return () => {
      active = false
    }
  }, [open, orderId, t])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTimeout(() => {
        setReason('changed_mind')
        setDetail('')
        setRefundMethod('credit')
        setError(null)
      }, 200)
    }
    onOpenChange(next)
  }

  function goToConfirm() {
    if (reason === 'other' && !detail.trim()) {
      setError(t('cancellation.otherRequiresDetail'))
      return
    }
    setError(null)
    setStep('confirm')
  }

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      const hasRefund = (preview?.refundable_amount ?? 0) > 0
      await cancelOrderSelf(orderId, reason, detail.trim() || null, hasRefund ? refundMethod : null)
      handleOpenChange(false)
      onCancelled()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.genericError'))
    } finally {
      setSubmitting(false)
    }
  }

  const refundable = preview?.refundable_amount ?? 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="p-6">
          {step === 'loading' && <p className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}

          {step === 'blocked' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-warning-500/15 text-warning-500">
                <AlertTriangle size={22} aria-hidden="true" />
              </div>
              <DialogTitle className="text-base font-extrabold text-foreground">{t('cancellation.cannotCancelTitle')}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t(BLOCK_REASON_I18N_KEY[preview?.block_reason ?? ''] ?? 'cancellation.blockNotCancellable')}
              </p>
              <Button variant="secondary" onClick={() => handleOpenChange(false)}>
                {t('common.close')}
              </Button>
            </div>
          )}

          {step === 'reason' && (
            <>
              <DialogTitle className="mb-1 text-lg font-extrabold text-foreground">{t('cancellation.reasonTitle')}</DialogTitle>
              <p className="mb-4 text-sm text-muted-foreground">{t('cancellation.reasonSubtitle')}</p>

              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CANCELLATION_REASONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReason(key)}
                    aria-pressed={reason === key}
                    className={cn(
                      'rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition active:scale-[0.98]',
                      reason === key
                        ? 'border-brand-500 bg-brand-500/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-border-strong'
                    )}
                  >
                    {t(CANCELLATION_REASON_I18N_KEY[key])}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <Label htmlFor="cancel-detail">
                  {reason === 'other' ? t('cancellation.tellUsMoreRequired') : t('cancellation.tellUsMoreOptional')}
                </Label>
                <Textarea
                  id="cancel-detail"
                  rows={3}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={t('cancellation.tellUsMorePlaceholder')}
                />
              </div>

              {error && (
                <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}

              <Button fullWidth onClick={goToConfirm}>
                {t('common.continue')}
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <DialogTitle className="mb-1 text-lg font-extrabold text-foreground">
                {t('cancellation.confirmTitle', { number: orderNumber })}
              </DialogTitle>

              <div className="mb-4 rounded-2xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('cancellation.refundLabel')}</p>
                <p className="text-2xl font-extrabold text-foreground">{formatCurrency(refundable)}</p>
                {refundable === 0 && <p className="mt-1 text-xs text-muted-foreground">{t('cancellation.noChargeYet')}</p>}
              </div>

              {refundable > 0 && (
                <div className="mb-4 space-y-2">
                  <Label>{t('cancellation.refundMethodLabel')}</Label>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('credit')}
                    aria-pressed={refundMethod === 'credit'}
                    className={cn(
                      'block w-full rounded-2xl border-2 p-3 text-left transition active:scale-[0.99]',
                      refundMethod === 'credit' ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-card hover:border-border-strong'
                    )}
                  >
                    <p className="text-sm font-bold text-foreground">{t('cancellation.refundMethodCreditTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('cancellation.refundMethodCreditDesc')}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('original_payment')}
                    aria-pressed={refundMethod === 'original_payment'}
                    className={cn(
                      'block w-full rounded-2xl border-2 p-3 text-left transition active:scale-[0.99]',
                      refundMethod === 'original_payment' ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-card hover:border-border-strong'
                    )}
                  >
                    <p className="text-sm font-bold text-foreground">{t('cancellation.refundMethodOriginalTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('cancellation.refundMethodOriginalDesc')}</p>
                  </button>
                </div>
              )}

              {error && (
                <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('reason')} disabled={submitting}>
                  {t('common.back')}
                </Button>
                <Button fullWidth variant="destructive" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? t('cancellation.cancelling') : t('cancellation.confirmCancel')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
