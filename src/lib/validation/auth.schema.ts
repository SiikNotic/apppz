import { z } from 'zod'

// La validación de frontend es solo para UX inmediata. Supabase Auth
// vuelve a validar formato/fortaleza en servidor; nunca confiamos
// exclusivamente en esto.

export const emailSchema = z.string().trim().min(1, 'El correo es obligatorio').email('Correo inválido')

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{7,20}$/, 'Teléfono inválido')

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Escribe tu nombre completo'),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Escribe tu contraseña'),
  rememberMe: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({ email: emailSchema })

/** Genérico: castea el primer error de un ZodError a un mensaje por campo. */
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
