import { forwardRef, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-card',
  secondary: 'bg-white text-ink-900 border border-ink-100 hover:border-brand-300',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-50',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
  danger: 'bg-danger-500 text-white hover:brightness-95',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-full gap-1.5',
  md: 'text-sm px-5 py-2.5 rounded-full gap-2',
  lg: 'text-base px-6 py-3.5 rounded-full gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', fullWidth, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
