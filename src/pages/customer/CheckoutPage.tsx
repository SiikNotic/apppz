import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { FieldLabel, Input, Select, Textarea } from '../../components/ui/Input'
import { ItemThumb } from '../../components/ui/ItemThumb'
import { formatCurrency } from '../../lib/format'
import { DELIVERY_FEE } from '../../lib/config'
import type { CartLine } from '../../lib/types'

function lineDescription(line: CartLine): string {
  const parts: string[] = []
  if (line.size) parts.push(line.size.name)
  if (line.crust) parts.push(line.crust.name)
  if (line.sauce) parts.push(line.sauce.name)
  if (line.toppings.length) parts.push(line.toppings.map((t) => t.name).join(', '))
  return parts.join(' · ')
}

export function CheckoutPage() {
  const { lines, removeLine, updateQuantity, subtotal, clear } = useCart()
  const navigate = useNavigate()

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const deliveryFee = orderType === 'delivery' ? DELIVERY_FEE : 0
  const total = subtotal + deliveryFee

  async function handleSubmit() {
    setFormError(null)
    if (!customerName.trim()) return setFormError('Escribe tu nombre.')
    if (!phone.trim()) return setFormError('Escribe un teléfono de contacto.')
    if (orderType === 'delivery' && !address.trim())
      return setFormError('Escribe la dirección de entrega.')
    if (lines.length === 0) return setFormError('Tu carrito está vacío.')

    setSubmitting(true)
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName.trim(),
          phone: phone.trim(),
          address: orderType === 'delivery' ? address.trim() : null,
          order_type: orderType,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
          subtotal,
          delivery_fee: deliveryFee,
          total,
        })
        .select()
        .single()

      if (orderError || !order) throw new Error(orderError?.message ?? 'No se pudo crear el pedido')

      for (const line of lines) {
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            menu_item_id: line.menuItemId,
            item_name: line.name,
            size_name: line.size?.name ?? null,
            crust_name: line.crust?.name ?? null,
            sauce_name: line.sauce?.name ?? null,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            subtotal: line.unitPrice * line.quantity,
          })
          .select()
          .single()

        if (itemError || !orderItem) throw new Error(itemError?.message ?? 'No se pudo guardar un item')

        if (line.toppings.length > 0) {
          const { error: toppingsError } = await supabase.from('order_item_toppings').insert(
            line.toppings.map((t) => ({
              order_item_id: orderItem.id,
              topping_name: t.name,
              price: t.free ? 0 : t.price,
            }))
          )
          if (toppingsError) throw new Error(toppingsError.message)
        }
      }

      clear()
      navigate(`/pedido/${order.id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-500">
          <ShoppingBag size={28} />
        </div>
        <p className="text-sm font-semibold text-ink-600">Tu carrito está vacío.</p>
        <Button onClick={() => navigate('/')}>Ver el menú</Button>
      </div>
    )
  }

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
                    className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-600 shadow-sm"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center text-xs font-bold">{line.quantity}</span>
                  <button
                    onClick={() => updateQuantity(line.lineId, line.quantity + 1)}
                    className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-600 shadow-sm"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-brand-500">
                    {formatCurrency(line.unitPrice * line.quantity)}
                  </span>
                  <button
                    onClick={() => removeLine(line.lineId)}
                    className="text-ink-400 hover:text-danger-500"
                    aria-label="Quitar"
                  >
                    <Trash2 size={16} />
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
              className={`rounded-2xl border-2 px-3 py-2 text-sm font-semibold transition ${
                orderType === 'delivery'
                  ? 'border-brand-500 bg-brand-50 text-brand-600'
                  : 'border-ink-100 text-ink-600'
              }`}
            >
              Entrega a domicilio
            </button>
            <button
              onClick={() => setOrderType('pickup')}
              className={`rounded-2xl border-2 px-3 py-2 text-sm font-semibold transition ${
                orderType === 'pickup'
                  ? 'border-brand-500 bg-brand-50 text-brand-600'
                  : 'border-ink-100 text-ink-600'
              }`}
            >
              Recoger en tienda
            </button>
          </div>

          <div>
            <FieldLabel>Nombre</FieldLabel>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <FieldLabel>Teléfono</FieldLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="55 1234 5678" />
          </div>
          {orderType === 'delivery' && (
            <div>
              <FieldLabel>Dirección</FieldLabel>
              <Textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, número, referencias"
              />
            </div>
          )}
          <div>
            <FieldLabel>Método de pago</FieldLabel>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>Efectivo</option>
              <option>Tarjeta contra entrega</option>
              <option>Transferencia</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Notas (opcional)</FieldLabel>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin cebolla, tocar el timbre, etc."
            />
          </div>

          <div className="space-y-1.5 border-t border-ink-100 pt-3 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Envío</span>
              <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Gratis'}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-ink-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {formError && <p className="text-xs font-semibold text-danger-500">{formError}</p>}

          <Button fullWidth size="lg" variant="dark" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Enviando pedido…' : `Confirmar pedido · ${formatCurrency(total)}`}
          </Button>
        </Card>
      </div>
    </div>
  )
}
