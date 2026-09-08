import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  widthClass?: string
}

export function Modal({ open, onClose, children, widthClass = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative z-10 w-full bg-cream-50 rounded-t-3xl sm:rounded-3xl shadow-pop max-h-[92vh] overflow-y-auto no-scrollbar',
          widthClass
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-card text-ink-600 hover:text-ink-900"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
