'use client'

// Cancelación por soporte/staff (permiso orders.cancel) — Sesión 23.
// Único lugar donde "Sin reembolso" es una opción real; nunca se expone
// al cliente (ver cancel-order-dialog.tsx, la versión de cliente). El
// monto máximo reembolsable SIEMPRE viene de get_cancellation_preview —
// lo que el staff escriba en el campo de monto es solo una PROPUESTA que
// el servidor recorta a ese máximo, nunca una orden directa.
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/LanguageContext'
import { getCancellationPreview, cancelOrderStaff } from '@/lib/data-access/cancellations'
import { CANCELLATION_REASONS, CANCELLATION_REASON_I18N_KEY } from '@/lib/types'
import type { CancellationPreview, CancellationReason, RefundMethod } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StaffCancelOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderNumber: number
  onCancelled: () => void
}

const REFUND_METHODS: { value: RefundMethod; titleKey: string }[] = [
  { value: 'credit', titleKey: 'cancellation.refundMethodCreditTitle' },
  { value: 'original_payment', titleKey: 'cancellation.refundMethodOriginalTitle' },
  { value: 'none', titleKey: 'cancellation.refundMethodNoneTitle' },
]

export function StaffCancelOrderDialog({ open, onOpenChange, orderId, orderNumber, onCancelled }: StaffCancelOrderDialogProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<CancellationPreview | null>(null)
  const [reason, setReason] = useState<CancellationReason>('restaurant_too_long')
  const [detail, setDetail] = useState('')
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('none')
  const [refundAmount, setRefundAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setConfirming(false)
    setError(null)
    getCancellationPreview(orderId)
      .then((p) => {
        if (!active) return
        setPreview(p)
        setRefundMethod(p.refundable_amount > 0 ? 'original_payment' : 'none')
        setRefundAmount(p.refundable_amount > 0 ? p.refundable_amount.toFixed(2) : '')
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : t('common.genericError'))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, orderId, t])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTimeout(() => {
        setReason('restaurant_too_long')
        setDetail('')
        setRefundMethod('none')
        setRefundAmount('')
        setError(null)
      }, 200)
    }
    onOpenChange(next)
  }

  function validateAndConfirm() {
    if (!detail.trim()) {
      setError(t('cancellation.staffDetailRequired'))
      return
    }
    setError(null)
    setConfirming(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const amount = refundMethod === 'none' ? 0 : Number(refundAmount) || 0
      await cancelOrderStaff(orderId, reason, detail.trim(), refundMethod, amount)
      handleOpenChange(false)
      onCancelled()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.genericError'))
    } finally {
      setSubmitting(false)
    }
  }

  const maxRefundable = preview?.refundable_amount ?? 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="p-6">
          <DialogTitle className="mb-1 text-lg font-extrabold text-foreground">
            {t('cancellation.staffCancelTitle', { number: orderNumber })}
          </DialogTitle>

          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : !preview?.can_staff_cancel ? (
            <div className="py-4 text-center">
              <p className="text-sm text-danger-400">{t('cancellation.blockAlreadyCancelled')}</p>
              <Button variant="secondary" className="mt-3" onClick={() => handleOpenChange(false)}>
                {t('common.close')}
              </Button>
            </div>
          ) : !confirming ? (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                {t('cancellation.refundLabel')}: {formatCurrency(maxRefundable)}
              </p>

              <div className="mb-4">
                <Label>{t('cancellation.reasonTitle')}</Label>
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CANCELLATION_REASONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReason(key)}
                      aria-pressed={reason === key}
                      className={cn(
                        'rounded-2xl border-2 px-3 py-2 text-left text-xs font-semibold transition active:scale-[0.98]',
                        reason === key
                          ? 'border-brand-500 bg-brand-500/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-border-strong'
                      )}
                    >
                      {t(CANCELLATION_REASON_I18N_KEY[key])}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="staff-cancel-detail">{t('cancellation.staffReasonLabel')}</Label>
                <Textarea id="staff-cancel-detail" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
              </div>

              <div className="mb-4">
                <Label>{t('cancellation.refundDestinationLabel')}</Label>
                <div className="mt-1.5 space-y-1.5">
                  {REFUND_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setRefundMethod(m.value)}
                      disabled={m.value !== 'none' && maxRefundable === 0}
                      aria-pressed={refundMethod === m.value}
                      className={cn(
                        'block w-full rounded-xl border-2 p-2.5 text-left text-sm font-semibold transition active:scale-[0.99] disabled:opacity-40',
                        refundMethod === m.value ? 'border-brand-500 bg-brand-500/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:border-border-strong'
                      )}
                    >
                      {t(m.titleKey)}
                    </button>
                  ))}
                </div>
              </div>

              {refundMethod !== 'none' && (
                <div className="mb-4">
                  <Label htmlFor="staff-refund-amount">{t('cancellation.refundAmountLabel')}</Label>
                  <Input
                    id="staff-refund-amount"
                    type="number"
                    min="0"
                    max={maxRefundable}
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{t('cancellation.refundAmountHint', { amount: formatCurrency(maxRefundable) })}</p>
                </div>
              )}

              {error && (
                <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}

              <Button fullWidth onClick={validateAndConfirm}>
                {t('common.continue')}
              </Button>
            </>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('cancellation.refundLabel')}</p>
                <p className="text-2xl font-extrabold text-foreground">
                  {formatCurrency(refundMethod === 'none' ? 0 : Math.min(Number(refundAmount) || 0, maxRefundable))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t(REFUND_METHODS.find((m) => m.value === refundMethod)!.titleKey)}</p>
              </div>

              {error && (
                <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                  {t('common.back')}
                </Button>
                <Button fullWidth variant="destructive" onClick={handleSubmit} disabled={submitting}>
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
