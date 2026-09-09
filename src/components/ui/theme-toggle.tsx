'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evita mismatch de hidratación: el tema real solo se conoce en el
  // cliente (depende de localStorage / prefers-color-scheme).
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className={cn('h-9 w-[108px]', className)} aria-hidden="true" />

  return (
    <div role="radiogroup" aria-label="Tema" className={cn('inline-flex rounded-full bg-ink-50 p-1', className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'grid h-7 w-7 place-items-center rounded-full transition',
            theme === value ? 'bg-white text-brand-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
          )}
        >
          <Icon size={14} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
