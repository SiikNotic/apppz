'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Trash2, ShoppingBag, Tag, Check } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { calculateCartPrice, createOrder, type CartRpcItem } from '@/lib/data-access/orders'
import { saveLastOrderId } from '@/lib/active-order'
import { fetchUserAddresses } from '@/lib/data-access/addresses'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ItemThumb } from '@/components/ui/item-thumb'
import { formatCurrency } from '@/lib/format'
import type { CartLine, Address } from '@/lib/types'

const NEW_ADDRESS = '__new__'

function lineDescription(line: CartLine): string {
  const parts: string[] = []
  if (line.size) parts.push(line.size.name)
  if (line.crust) parts.push(line.crust.name)
  if (line.sauce) parts.push(line.sauce.name)
  if (line.toppings.length) parts.push(line.toppings.map((t) => t.name).join(', '))
  return parts.join(' · ')
}

function cartToRpcItems(lines: CartLine[]): CartRpcItem[] {
  return lines.map((line) => ({
    menu_item_id: line.menuItemId,
    size_id: line.size?.id ?? null,
    crust_id: line.crust?.id ?? null,
    sauce_id: line.sauce?.id ?? null,
    topping_ids: line.toppings.map((t) => t.id),
    quantity: line.quantity,
  }))
}

export default function CheckoutPage() {
  const { lines, removeLine, updateQuantity, clear } = useCart()
  const { user, profile } = useAuth()
  const router = useRouter()

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>(NEW_ADDRESS)
  const [manualAddress, setManualAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [notes, setNotes] = useState('')
  const [promoCode, setPromoCode] = useState('')

  const [pricing, setPricing] = useState<{
    subtotal: number
    discount: number
    delivery_fee: number
    tax: number
    total: number
    promotion_code: string | null
  } | null>(null)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [pricingError, setPricingError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Idempotency key estable por intento de checkout — si el usuario toca
  // "Confirmar pedido" varias veces (doble clic, red lenta), el servidor
  // devuelve el mismo pedido en vez de crear uno duplicado.
  const idempotencyKeyRef = useRef(crypto.randomUUID())

  useEffect(() => {
    setCustomerName(profile?.full_name ?? '')
    setPhone(profile?.phone ?? '')
  }, [profile])

  useEffect(() => {
    if (!user) return
    fetchUserAddresses(user.id).then((list) => {
      setAddresses(list)
      const def = list.find((a) => a.is_default) ?? list[0]
      if (def) setSelectedAddressId(def.id)
    })
  }, [user])

  const cartItems = useMemo(() => cartToRpcItems(lines), [lines])

  // Recalcula el precio en el servidor cada vez que cambia el carrito, el
  // tipo de entrega o el código de promoción. Este es el número real.
  useEffect(() => {
    if (lines.length === 0) {
      setPricingLoading(false)
      return
    }
    let active = true
    setPricingLoading(true)
    const timeout = setTimeout(() => {
      calculateCartPrice(cartItems, orderType, promoCode || undefined, user?.id)
        .then((result) => {
          if (!active) return
          setPricing(result)
          setPricingError(null)
        })
        .catch((err) => {
          if (!active) return
          setPricingError(
            err instanceof Error ? err.message : 'No pudimos calcular el precio. Intenta de nuevo.'
          )
        })
        .finally(() => {
          if (active) setPricingLoading(false)
        })
    }, 350) // pequeño debounce para no golpear la RPC en cada tecla del código de promo

    return () => {
      active = false
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cartItems), orderType, promoCode, user?.id])

  async function handleSubmit() {
    setFormError(null)
    if (!customerName.trim()) return setFormError('Escribe tu nombre.')
    if (!phone.trim()) return setFormError('Escribe un teléfono de contacto.')

    const usingSavedAddress = selectedAddressId !== NEW_ADDRESS
    const addressText = usingSavedAddress
      ? formatAddress(addresses.find((a) => a.id === selectedAddressId))
      : manualAddress.trim()

    if (orderType === 'delivery' && !addressText) {
      return setFormError('Escribe o selecciona la dirección de entrega.')
    }
    if (lines.length === 0) return setFormError('Tu carrito está vacío.')

    setSubmitting(true)
    try {
      const order = await createOrder({
        cart: cartItems,
        orderType,
        customerName: customerName.trim(),
        phone: phone.trim(),
        addressId: usingSavedAddress ? selectedAddressId : null,
        addressText: orderType === 'delivery' ? addressText : null,
        paymentMethod,
        notes: notes.trim() || null,
        idempotencyKey: idempotencyKeyRef.current,
        promoCode: promoCode || undefined,
      })

      clear()
      saveLastOrderId(order.id)
      router.push(`/order?id=${order.id}`)
    } catch (err) {
      // Mensaje accionable, nunca un genérico "algo salió mal".
      const message = err instanceof Error ? err.message : ''
      if (message.includes('ya no está disponible')) {
        setFormError('Uno de los productos de tu carrito ya no está disponible. Quítalo para continuar.')
      } else if (message.includes('carrito está vacío')) {
        setFormError('Tu carrito está vacío.')
      } else {
        setFormError('Tu conexión se interrumpió y no pudimos confirmar el pedido. No se te cobró — intenta de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-900">
          <ShoppingBag size={28} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-ink-600">Tu carrito está vacío.</p>
        <Button onClick={() => router.push('/menu')}>Ver el menú</Button>
      </div>
    )
  }

  const canSubmit = !submitting && !pricingLoading && !pricingError && !!pricing

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr,1fr]">
      <div className="space-y-3">
        <h1 className="text-xl font-extrabold text-ink-900">Tu pedido</h1>
        {lines.map((line) => (
          <Card key={line.lineId} className="flex items-center gap-3 p-3.5">
            <ItemThumb name={line.name} imageUrl={line.imageUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">{line.name}</p>
              {lineDescription(line) && (
                <p className="truncate text-xs text-ink-400">{lineDescription(line)}</p>
              )}
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-full bg-ink-50 px-1.5 py-1">
                  <button
                    onClick={() => updateQuantity(line.lineId, line.quantity - 1)}
                    aria-label={`Disminuir cantidad de ${line.name}`}
                    className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-600 shadow-sm"
                  >
                    <Minus size={12} aria-hidden="true" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold" aria-live="polite">
                    {line.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(line.lineId, line.quantity + 1)}
                    aria-label={`Aumentar cantidad de ${line.name}`}
                    className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-600 shadow-sm"
                  >
                    <Plus size={12} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-brand-900">
                    {formatCurrency(line.unitPrice * line.quantity)}
                  </span>
                  <button
                    onClick={() => removeLine(line.lineId)}
                    className="text-ink-400 hover:text-danger-500"
                    aria-label={`Quitar ${line.name} del carrito`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <Card className="sticky top-24 space-y-4 p-5">
          <h2 className="text-base font-extrabold text-ink-900">Datos de entrega</h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderType('delivery')}
              aria-pressed={orderType === 'delivery'}
              className={`rounded-2xl border-2 px-3 py-2 text-sm font-semibold transition ${
                orderType === 'delivery' ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-ink-100 text-ink-600'
              }`}
            >
              Entrega a domicilio
            </button>
            <button
              onClick={() => setOrderType('pickup')}
              aria-pressed={orderType === 'pickup'}
              className={`rounded-2xl border-2 px-3 py-2 text-sm font-semibold transition ${
                orderType === 'pickup' ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-ink-100 text-ink-600'
              }`}
            >
              Recoger en tienda
            </button>
          </div>

          <div>
            <Label htmlFor="checkout-name">Nombre</Label>
            <Input id="checkout-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <Label htmlFor="checkout-phone">Teléfono</Label>
            <Input id="checkout-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="55 1234 5678" />
          </div>

          {orderType === 'delivery' && (
            <div>
              <Label>Dirección</Label>
              {addresses.length > 0 && (
                <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {addresses.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label} · {a.street}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_ADDRESS}>Otra dirección…</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {selectedAddressId === NEW_ADDRESS && (
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Calle, número, referencias"
                />
              )}
            </div>
          )}

          <div>
            <Label htmlFor="checkout-payment">Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full" id="checkout-payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Tarjeta contra entrega">Tarjeta contra entrega</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="checkout-promo">Código de promoción (opcional)</Label>
            <div className="relative">
              <Tag size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <Input
                id="checkout-promo"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="PIZZA10"
                className="pl-9"
              />
            </div>
            {pricing?.promotion_code && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-success-500">
                <Check size={12} aria-hidden="true" /> Código {pricing.promotion_code} aplicado
              </p>
            )}
            {!pricing?.promotion_code && promoCode && !pricingLoading && (
              <p className="mt-1 text-xs text-ink-400">Ese código no aplica a tu pedido.</p>
            )}
          </div>

          <div>
            <Label htmlFor="checkout-notes">Notas (opcional)</Label>
            <Textarea
              id="checkout-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin cebolla, tocar el timbre, etc."
            />
          </div>

          <div className="space-y-1.5 border-t border-ink-100 pt-3 text-sm">
            {pricingLoading ? (
              <p className="text-ink-400">Calculando total…</p>
            ) : pricingError ? (
              <p role="alert" className="text-xs font-semibold text-danger-500">{pricingError}</p>
            ) : pricing ? (
              <>
                <div className="flex justify-between text-ink-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(pricing.subtotal)}</span>
                </div>
                {pricing.discount > 0 && (
                  <div className="flex justify-between text-success-500">
                    <span>Descuento</span>
                    <span>-{formatCurrency(pricing.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-ink-600">
                  <span>Envío</span>
                  <span>{pricing.delivery_fee > 0 ? formatCurrency(pricing.delivery_fee) : 'Gratis'}</span>
                </div>
                {pricing.tax > 0 && (
                  <div className="flex justify-between text-ink-600">
                    <span>Impuesto</span>
                    <span>{formatCurrency(pricing.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-ink-900">
                  <span>Total</span>
                  <span>{formatCurrency(pricing.total)}</span>
                </div>
              </>
            ) : null}
          </div>

          {formError && (
            <p role="alert" className="text-xs font-semibold text-danger-500">
              {formError}
            </p>
          )}

          <Button fullWidth size="lg" variant="dark" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting
              ? 'Enviando pedido…'
              : pricing
                ? `Confirmar pedido · ${formatCurrency(pricing.total)}`
                : 'Confirmar pedido'}
          </Button>
        </Card>
      </div>
    </div>
  )
}

function formatAddress(address?: Address): string {
  if (!address) return ''
  const parts = [address.street, address.apartment, `${address.city}, ${address.state} ${address.zip}`]
  return parts.filter(Boolean).join(', ')
}
