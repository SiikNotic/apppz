import type { z } from 'zod'

/** Castea el primer error de un ZodError a un mensaje por campo. */
export function firstFieldErrors<T extends Record<string, unknown>>(
  error: z.ZodError<T>
): Partial<Record<keyof T, string>> {
  const out: Partial<Record<keyof T, string>> = {}
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof T | undefined
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}
