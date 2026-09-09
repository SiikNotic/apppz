'use client'

// "Reportar un problema" real — antes el botón llevaba a /help (un
// enlace que además se rompía en producción por el bug de basePath) y
// esa página es solo FAQ estática, sin ningún backend detrás. Este
// modal envía un reporte de verdad a `issue_reports`, visible para el
// staff en /company/support.
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ISSUE_REPORT_CATEGORY_LABELS } from '@/lib/types'

const CATEGORIES = Object.keys(ISSUE_REPORT_CATEGORY_LABELS)

interface ReportProblemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  customerId?: string | null
}

export function ReportProblemDialog({ open, onOpenChange, orderId, customerId }: ReportProblemDialogProps) {
  const [category, setCategory] = useState<string>('wrong_order')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset al cerrar, para que la próxima vez que se abra empiece limpio.
      setTimeout(() => {
        setSent(false)
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
    const { error: insertError } = await supabase.from('issue_reports').insert({
      order_id: orderId,
      customer_id: customerId ?? null,
      category,
      description: description.trim() || null,
    })
    setSending(false)
    if (insertError) {
      setError('No se pudo enviar el reporte. Intenta de nuevo.')
      return
    }
    setSent(true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="p-6">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={40} className="text-success-500" aria-hidden="true" />
              <DialogTitle className="text-lg font-extrabold text-ink-900">Reporte enviado</DialogTitle>
              <p className="text-sm text-ink-600">
                Nuestro equipo lo va a revisar. Si dejaste tu cuenta con correo, te avisamos ahí.
              </p>
              <Button fullWidth onClick={() => handleOpenChange(false)}>
                Listo
              </Button>
            </div>
          ) : (
            <>
              <DialogTitle className="mb-1 text-lg font-extrabold text-ink-900">Reportar un problema</DialogTitle>
              <p className="mb-4 text-sm text-ink-400">Cuéntanos qué pasó con este pedido.</p>

              <div className="mb-4">
                <Label>Categoría</Label>
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
                      {ISSUE_REPORT_CATEGORY_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="report-description">Descripción (opcional)</Label>
                <Textarea
                  id="report-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Danos más detalles si puedes…"
                />
              </div>

              {error && (
                <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}

              <Button fullWidth onClick={handleSubmit} disabled={sending}>
                {sending ? 'Enviando…' : 'Enviar reporte'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
