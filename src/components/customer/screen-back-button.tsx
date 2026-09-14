'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

// Botón "atrás" en cuadro redondeado — mismo tratamiento que la
// referencia usa en Perfil/Menú/Chat/Order details en vez del header de
// sitio web que tenía la app antes.
export function ScreenBackButton() {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/15 text-brand-400 transition hover:bg-brand-500/25"
      aria-label={t('common.back')}
    >
      <ChevronLeft size={20} aria-hidden="true" />
    </button>
  )
}
