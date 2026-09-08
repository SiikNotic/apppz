import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-16 w-full rounded-2xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground resize-none',
        'focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
