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
    // Dirección de entrega: se pide desde el registro para que la
    // primera compra no se tope con un carrito vacío de direcciones —
    // el cliente igual puede agregar más o editarla después en Mi
    // cuenta > Direcciones.
    street: z.string().trim().min(3, 'Escribe la calle y número'),
    apartment: z.string().trim().optional(),
    city: z.string().trim().min(2, 'Escribe la ciudad'),
    state: z.string().trim().min(2, 'Escribe el estado'),
    zip: z.string().trim().min(3, 'Código postal inválido'),
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

export { firstFieldErrors } from './utils'
