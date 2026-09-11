'use client'

import { Languages } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

interface LanguageToggleProps {
  className?: string
  /** 'dark' es para chrome oscuro fijo (sidebar de compañía, bg-ink-900)
   *  que no sigue el tema claro/oscuro del sitio — 'light' (default) es
   *  para el resto de la app. */
  variant?: 'light' | 'dark'
}

/** Selector ES/EN — pill con indicador deslizante, persiste en localStorage
 *  vía LanguageContext. Los dos botones miden lo mismo (w-9, sin espacio
 *  entre ellos) para que el indicador se desplace con un translate-x exacto. */
export function LanguageToggle({ className, variant = 'light' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage()
  const dark = variant === 'dark'
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Languages size={14} className={cn('shrink-0', dark ? 'text-white/40' : 'text-ink-400')} aria-hidden="true" />
      <div className={cn('relative inline-flex rounded-full p-1 text-xs font-bold', dark ? 'bg-white/10' : 'bg-ink-900/5')}>
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-1 left-1 w-9 rounded-full shadow-card transition-transform duration-200 ease-out',
            dark ? 'bg-white' : 'bg-brand-500',
            language === 'en' && 'translate-x-9'
          )}
        />
        <button
          onClick={() => setLanguage('es')}
          aria-pressed={language === 'es'}
          className={cn(
            'relative z-10 w-9 rounded-full py-1 text-center transition-colors duration-200',
            language === 'es'
              ? dark
                ? 'text-ink-900'
                : 'text-white'
              : dark
                ? 'text-white/60 hover:text-white'
                : 'text-ink-500 hover:text-ink-700'
          )}
        >
          ES
        </button>
        <button
          onClick={() => setLanguage('en')}
          aria-pressed={language === 'en'}
          className={cn(
            'relative z-10 w-9 rounded-full py-1 text-center transition-colors duration-200',
            language === 'en'
              ? dark
                ? 'text-ink-900'
                : 'text-white'
              : dark
                ? 'text-white/60 hover:text-white'
                : 'text-ink-500 hover:text-ink-700'
          )}
        >
          EN
        </button>
      </div>
    </div>
  )
}
