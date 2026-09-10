'use client'

// Chat temporal Driver <-> Cliente durante una entrega activa.
//
// Deliberadamente efímero: no hay tabla de mensajes, no hay historial, no
// se persiste nada. Usa un canal Realtime "private" (broadcast con
// autorización por RLS sobre realtime.messages — ver migración
// delivery_chat_realtime_auth): Supabase solo relaya el mensaje a quien
// esté escuchando en ese momento, nunca lo guarda. Cuando la entrega
// termina (o el componente se desmonta), el canal se cierra y los
// mensajes desaparecen con él — no hay nada que "borrar" después.
import { useEffect, useRef, useState } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ChatMessage {
  role: 'driver' | 'customer'
  text: string
  sentAt: number
}

interface DeliveryChatProps {
  assignmentId: string
  role: 'driver' | 'customer'
  /** El chat solo existe mientras la entrega sigue activa. */
  active: boolean
}

const MAX_MESSAGES = 200

export function DeliveryChat({ assignmentId, role, active }: DeliveryChatProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !active) return

    const channel = supabase.channel(`delivery-chat-${assignmentId}`, {
      config: { private: true },
    })
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), payload as ChatMessage])
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setConnected(false)
      // Al cerrar, los mensajes de esta sesión de chat se descartan — es
      // el comportamiento buscado, no un descuido.
      setMessages([])
    }
  }, [open, active, assignmentId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  function handleSend() {
    const text = draft.trim()
    if (!text || !channelRef.current) return
    const message: ChatMessage = { role, text, sentAt: Date.now() }
    channelRef.current.send({ type: 'broadcast', event: 'message', payload: message })
    setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), message])
    setDraft('')
  }

  if (!active) return null

  if (!open) {
    return (
      <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
        <MessageCircle size={16} aria-hidden="true" />
        {role === 'driver' ? t('sharedChat.chatWithCustomer') : t('sharedChat.chatWithDriver')}
      </Button>
    )
  }

  return (
    <Card className="flex h-80 flex-col gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <p className="text-sm font-bold text-ink-900">
          {role === 'driver' ? t('sharedChat.chatWithCustomer') : t('sharedChat.chatWithDriver')}
        </p>
        <button
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-ink-400 hover:text-ink-600"
        >
          {t('common.close')}
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {!connected && (
          <p className="text-center text-xs text-ink-400">{t('sharedChat.connecting')}</p>
        )}
        {connected && messages.length === 0 && (
          <p className="text-center text-xs text-ink-400">{t('sharedChat.ephemeralNotice')}</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn('flex', m.role === role ? 'justify-end' : 'justify-start')}
          >
            <p
              className={cn(
                'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                m.role === role ? 'bg-brand-500 text-white' : 'bg-ink-50 text-ink-900'
              )}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-ink-100 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('sharedChat.messagePlaceholder')}
          aria-label={t('sharedChat.messageAria')}
          disabled={!connected}
          className="h-10 flex-1 rounded-full border border-ink-100 bg-white px-4 text-sm outline-none focus:border-brand-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!connected || !draft.trim()}
          aria-label={t('sharedChat.sendMessageAria')}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white disabled:opacity-40"
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </div>
    </Card>
  )
}
