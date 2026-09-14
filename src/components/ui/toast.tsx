'use client'

// Sistema de toasts propio, sin dependencia externa (no hay sonner/radix
// toast instalado todavía) — un emisor a nivel de módulo + un solo
// <Toaster /> montado una vez en Providers. `toast(...)` se puede llamar
// desde cualquier handler de evento sin hooks ni contexto de por medio.
//
// Foundation only: se agrega el primitivo porque el sistema de
// componentes pedido lo incluye explícitamente, pero todavía no se
// conecta a ninguna acción existente (agregar al carrito, guardar
// cambios, etc.) — eso es trabajo de una sesión futura, página por
// página.
import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'success' | 'error'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  /** Botón de acción opcional (p. ej. "Ver pedido") — al tocarlo se
   *  ejecuta la acción Y se cierra el toast de una, así el llamador no
   *  tiene que acordarse de cerrarlo él mismo. */
  action?: { label: string; onClick: () => void }
}

type Listener = (items: ToastItem[]) => void

let items: ToastItem[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener(items))
}

function nextId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function toast(input: {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
  action?: { label: string; onClick: () => void }
}): string {
  const id = nextId()
  items = [...items, { id, variant: 'default', ...input }]
  emit()
  const duration = input.durationMs ?? 4000
  if (typeof window !== 'undefined') {
    window.setTimeout(() => dismissToast(id), duration)
  }
  return id
}

export function dismissToast(id: string) {
  items = items.filter((item) => item.id !== id)
  emit()
}

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: 'border-border text-foreground [&_svg]:text-muted-foreground',
  success: 'border-success-500/30 [&_svg]:text-success-500',
  error: 'border-danger-500/30 [&_svg]:text-danger-500',
}

/** Se monta una sola vez, en Providers — cualquier `toast(...)` de la app
 *  aparece acá, apilado sobre la tab bar sin taparla. */
export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items)

  useEffect(() => {
    listeners.add(setList)
    return () => {
      listeners.delete(setList)
    }
  }, [])

  if (list.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      aria-live="polite"
    >
      {list.map((item) => {
        const Icon = VARIANT_ICON[item.variant]
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-popover/95 px-4 py-3 shadow-elevated backdrop-blur animate-in fade-in-0 slide-in-from-bottom-2',
              VARIANT_CLASSES[item.variant]
            )}
          >
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              )}
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    // Cerrar primero: si onClick navega/desmonta algo, el
                    // toast no debe quedar huérfano en pantalla.
                    dismissToast(item.id)
                    item.action!.onClick()
                  }}
                  className="mt-1.5 text-xs font-bold text-brand-400 hover:underline"
                >
                  {item.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Cerrar"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
