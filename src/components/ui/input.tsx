import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full min-w-0 rounded-2xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground',
        'focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className
      )}
      {...props}
    />
  )
}

export { Input }
