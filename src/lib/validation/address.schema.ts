import { z } from 'zod'

export const addressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']),
  street: z.string().trim().min(3, 'Escribe la calle y número'),
  apartment: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Escribe la ciudad'),
  state: z.string().trim().min(2, 'Escribe el estado'),
  zip: z.string().trim().min(3, 'Código postal inválido'),
  instructions: z.string().trim().optional(),
  accessCode: z.string().trim().optional(),
  deliveryNotes: z.string().trim().optional(),
  dogWarning: z.boolean().default(false),
  contactPreference: z.enum(['call', 'text', 'app']).default('call'),
  isDefault: z.boolean().default(false),
  // Se llenan solos cuando el cliente ubica la dirección en el mapa (ver
  // LocationPickerDialog) — opcionales porque la dirección también se
  // puede seguir escribiendo a mano, como siempre.
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>

export { firstFieldErrors } from './utils'
