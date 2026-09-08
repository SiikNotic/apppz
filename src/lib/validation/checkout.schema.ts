import { z } from 'zod'

export const checkoutContactSchema = z.object({
  customerName: z.string().trim().min(2, 'Escribe tu nombre'),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s()-]{7,20}$/, 'Teléfono inválido'),
})

export const checkoutDeliverySchema = z.discriminatedUnion('orderType', [
  z.object({
    orderType: z.literal('delivery'),
    addressId: z.string().uuid().nullable(),
    addressText: z.string().trim().min(5, 'Escribe la dirección de entrega'),
  }),
  z.object({
    orderType: z.literal('pickup'),
  }),
])

export const checkoutSchema = checkoutContactSchema.and(
  z.object({
    orderType: z.enum(['delivery', 'pickup']),
    addressId: z.string().uuid().nullable().optional(),
    addressText: z.string().trim().optional(),
    paymentMethod: z.string().trim().min(1, 'Selecciona un método de pago'),
    notes: z.string().trim().max(500).optional(),
    promoCode: z.string().trim().optional(),
  })
)

export type CheckoutInput = z.infer<typeof checkoutSchema>
