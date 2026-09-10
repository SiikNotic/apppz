'use client'

import { Languages } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

/** Selector ES/EN — pill con indicador deslizante, persiste en localStorage
 *  vía LanguageContext. Los dos botones miden lo mismo (w-9, sin espacio
 *  entre ellos) para que el indicador se desplace con un translate-x exacto. */
export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Languages size={14} className="shrink-0 text-ink-400" aria-hidden="true" />
      <div className="relative inline-flex rounded-full bg-ink-900/5 p-1 text-xs font-bold">
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-1 left-1 w-9 rounded-full bg-brand-500 shadow-card transition-transform duration-200 ease-out',
            language === 'en' && 'translate-x-9'
          )}
        />
        <button
          onClick={() => setLanguage('es')}
          aria-pressed={language === 'es'}
          className={cn(
            'relative z-10 w-9 rounded-full py-1 text-center transition-colors duration-200',
            language === 'es' ? 'text-white' : 'text-ink-500 hover:text-ink-700'
          )}
        >
          ES
        </button>
        <button
          onClick={() => setLanguage('en')}
          aria-pressed={language === 'en'}
          className={cn(
            'relative z-10 w-9 rounded-full py-1 text-center transition-colors duration-200',
            language === 'en' ? 'text-white' : 'text-ink-500 hover:text-ink-700'
          )}
        >
          EN
        </button>
      </div>
    </div>
  )
}
