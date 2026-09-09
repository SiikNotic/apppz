'use client'

// "Reportar un problema" real — antes el botón llevaba a /help (un
// enlace que además se rompía en producción por el bug de basePath) y
// esa página es solo FAQ estática, sin ningún backend detrás. Este
// modal envía un reporte de verdad a `issue_reports`, visible para el
// staff en /company/support, y — si ya existe un reporte abierto para
// este pedido — muestra directamente la conversación en curso (Problema
// 7) en vez de dejar crear reportes duplicados para el mismo problema.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SupportChatThread } from '@/components/shared/support-chat-thread'
import { useLanguage } from '@/contexts/LanguageContext'
import { ISSUE_REPORT_CATEGORY_LABELS } from '@/lib/types'
import type { IssueReport } from '@/lib/types'

const CATEGORIES = Object.keys(ISSUE_REPORT_CATEGORY_LABELS)

const CATEGORY_KEYS: Record<string, string> = {
  wrong_order: 'support.categoryWrongOrder',
  missing_item: 'support.categoryMissingItem',
  damaged_order: 'support.categoryDamagedOrder',
  delivery_issue: 'support.categoryDeliveryIssue',
  payment_issue: 'support.categoryPaymentIssue',
  other: 'support.categoryOther',
}

const STATUS_KEYS: Record<string, string> = {
  open: 'support.statusOpen',
  in_progress: 'support.statusInProgress',
  resolved: 'support.statusResolved',
}

interface ReportProblemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  customerId?: string | null
}

export function ReportProblemDialog({ open, onOpenChange, orderId, customerId }: ReportProblemDialogProps) {
  const { t } = useLanguage()
  const [checking, setChecking] = useState(true)
  const [existingReport, setExistingReport] = useState<IssueReport | null>(null)

  const [category, setCategory] = useState<string>('wrong_order')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setChecking(true)
    supabase
      .from('issue_reports')
      .select('*')
      .eq('order_id', orderId)
      .neq('status', 'resolved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setExistingReport(data)
        setChecking(false)
      })
    return () => {
      active = false
    }
  }, [open, orderId])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTimeout(() => {
        setCategory('wrong_order')
        setDescription('')
        setError(null)
      }, 200)
    }
    onOpenChange(next)
  }

  async function handleSubmit() {
    setSending(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('issue_reports')
      .insert({
        order_id: orderId,
        customer_id: customerId ?? null,
        category,
        description: description.trim() || null,
      })
      .select()
      .single()
    setSending(false)
    if (insertError || !data) {
      setError(t('sharedChat.sendReportFailed'))
      return
    }
    setExistingReport(data)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="p-6">
          {checking ? (
            <p className="py-6 text-center text-sm text-ink-400">{t('common.loading')}</p>
          ) : existingReport ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <DialogTitle className="text-lg font-extrabold text-ink-900">{t('sharedChat.yourReport')}</DialogTitle>
                <Badge variant={existingReport.status === 'resolved' ? 'success' : 'warning'}>
                  {STATUS_KEYS[existingReport.status] ? t(STATUS_KEYS[existingReport.status]) : existingReport.status}
                </Badge>
              </div>
              <p className="mb-3 text-xs text-ink-400">
                {CATEGORY_KEYS[existingReport.category] ? t(CATEGORY_KEYS[existingReport.category]) : existingReport.category}
                {existingReport.description ? ` — ${existingReport.description}` : ''}
              </p>
              {customerId ? (
                <SupportChatThread reportId={existingReport.id} currentUserId={customerId} isStaff={false} />
              ) : (
                <p className="text-xs text-ink-400">{t('sharedChat.loginToChat')}</p>
              )}
            </>
          ) : (
            <>
              <DialogTitle className="mb-1 text-lg font-extrabold text-ink-900">{t('sharedChat.reportProblemTitle')}</DialogTitle>
              <p className="mb-4 text-sm text-ink-400">{t('sharedChat.reportProblemSubtitle')}</p>

              <div className="mb-4">
                <Label>{t('sharedChat.category')}</Label>
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CATEGORIES.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      aria-pressed={category === key}
                      className={`rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition ${
                        category === key
                          ? 'border-brand-500 bg-brand-50 text-brand-900'
                          : 'border-ink-100 bg-white text-ink-600 hover:border-brand-200'
                      }`}
                    >
                      {t(CATEGORY_KEYS[key])}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="report-description">{t('rewardsAdmin.descriptionOptional')}</Label>
                <Textarea
                  id="report-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('sharedChat.descriptionPlaceholder')}
                />
              </div>

              {error && (
                <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}

              <Button fullWidth onClick={handleSubmit} disabled={sending}>
                {sending ? t('kitchen.sending') : t('sharedChat.sendReport')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
