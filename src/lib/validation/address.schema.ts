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
})

export type AddressInput = z.infer<typeof addressSchema>
