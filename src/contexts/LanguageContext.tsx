'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translations, type Language } from '@/lib/i18n/translations'

const STORAGE_KEY = 'nero-pizza-language'

function getByPath(obj: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj)
}

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  /** Busca "namespace.key" en el diccionario activo; si falta, cae a
   *  español; si tampoco existe ahí, devuelve la clave cruda (nunca
   *  revienta la UI por una traducción faltante). */
  t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'es' || stored === 'en') setLanguageState(stored)
    } catch {
      // localStorage puede fallar (modo privado, etc.) — se queda en español.
    }
  }, [])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // no persiste, pero la sesión actual sigue funcionando igual.
    }
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }

  function t(path: string): string {
    const parts = path.split('.')
    const value = getByPath(translations[language], parts) ?? getByPath(translations.es, parts)
    return typeof value === 'string' ? value : path
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage debe usarse dentro de LanguageProvider')
  return ctx
}
