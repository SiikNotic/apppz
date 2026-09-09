'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

/** Selector ES/EN compacto — persiste en localStorage vía LanguageContext. */
export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  return (
    <div className={cn('flex items-center rounded-full bg-black/5 p-0.5 text-xs font-bold', className)}>
      <button
        onClick={() => setLanguage('es')}
        aria-pressed={language === 'es'}
        className={cn('rounded-full px-2.5 py-1 transition', language === 'es' ? 'bg-white shadow-sm' : 'opacity-60')}
      >
        ES
      </button>
      <button
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={cn('rounded-full px-2.5 py-1 transition', language === 'en' ? 'bg-white shadow-sm' : 'opacity-60')}
      >
        EN
      </button>
    </div>
  )
}
