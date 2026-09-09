'use client'

// Chat persistente de un ticket de soporte (Problema 7) — a diferencia
// de DeliveryChat (efímero, sin guardar nada), este SÍ conserva el
// historial completo en issue_report_messages para que soporte/admin
// puedan revisarlo después. Un solo componente reutilizado tanto en el
// dashboard (staff) como en el modal de "Reportar un problema" del
// cliente/conductor (reportante) — nunca dos sistemas de chat paralelos
// para el mismo propósito.
import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/LanguageContext'
import type { IssueReportMessage } from '@/lib/types'

type MessageWithSender = IssueReportMessage & { sender: { full_name: string | null } | null }

interface SupportChatThreadProps {
  reportId: string
  currentUserId: string
  /** Cambia solo el label mostrado para "el otro lado" de la conversación. */
  isStaff: boolean
}

export function SupportChatThread({ reportId, currentUserId, isStaff }: SupportChatThreadProps) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    const { data } = await supabase
      .from('issue_report_messages')
      .select('*, sender:profiles(full_name)')
      .eq('report_id', reportId)
      .order('created_at')
    setMessages((data as unknown as MessageWithSender[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`issue-report-${reportId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'issue_report_messages', filter: `report_id=eq.${reportId}` },
        load
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Recibo de lectura: se actualiza al abrir el hilo y cada vez que llega
  // un mensaje nuevo mientras está abierto. El backend solo permite que
  // cada lado toque su propia columna (ver trigger
  // lock_issue_report_reporter_updates para el reportante; el staff usa
  // la política general de gestión de issue_reports).
  useEffect(() => {
    const now = new Date().toISOString()
    const update = isStaff ? { staff_last_read_at: now } : { customer_last_read_at: now }
    supabase
      .from('issue_reports')
      .update(update)
      .eq('id', reportId)
      .then(() => {})
  }, [reportId, isStaff, messages.length])

  async function handleSend() {
    const body = text.trim()
    if (!body) return
    setSending(true)
    const { error } = await supabase.from('issue_report_messages').insert({
      report_id: reportId,
      sender_id: currentUserId,
      body,
    })
    setSending(false)
    if (!error) {
      setText('')
      load()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-ink-50 p-3">
        {loading && <p className="text-xs text-ink-400">{t('common.loading')}</p>}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-ink-400">{t('sharedChat.noMessagesYet')}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-brand-500 text-ink-900' : 'bg-white text-ink-700 shadow-card'
                }`}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">
                    {m.sender?.full_name || (isStaff ? t('rewardsAdmin.customerFallback') : t('sharedChat.supportFallback'))}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
          placeholder={t('sharedChat.messagePlaceholder')}
          aria-label={t('sharedChat.messageAria')}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()}>
          <Send size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
