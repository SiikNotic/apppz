'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ShoppingBag, Tag, Check, Truck, Store } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { calculateCartPrice, createOrder, type CartRpcItem } from '@/lib/data-access/orders'
import { fetchCreditBalance } from '@/lib/data-access/cancellations'
import { QUANTITY_LEVEL_I18N_KEY } from '@/lib/types'
import { saveLastOrderId } from '@/lib/active-order'
import { useStoreStatus } from '@/hooks/useStoreStatus'
import { fetchUserAddresses } from '@/lib/data-access/addresses'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ItemThumb } from '@/components/ui/item-thumb'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CartLine, Address, ToppingQuantityLevel } from '@/lib/types'

const NEW_ADDRESS = '__new__'

/** "Pepperoni (Extra), Champiñones (Poco)" — el nivel solo se anota
 *  cuando NO es 'normal' (el caso común), para no ensuciar la línea con
 *  un "(Normal)" en cada topping. Misma regla para la salsa. */
function nameWithLevel(name: string, level: ToppingQuantityLevel, translate: (key: string) => string): string {
  return level === 'normal' ? name : `${name} (${translate(QUANTITY_LEVEL_I18N_KEY[level])})`
}

function lineDescription(line: CartLine, translate: (key: string) => string): string {
  const parts: string[] = []
  if (line.size) parts.push(line.size.name)
  if (line.crust) parts.push(line.crust.name)
  if (line.sauce) parts.push(nameWithLevel(line.sauce.name, line.sauce.quantityLevel, translate))
  if (line.toppings.length) {
    parts.push(line.toppings.map((top) => nameWithLevel(top.name, top.quantityLevel, translate)).join(', '))
  }
  // Variante elegida (marca/sabor) — Sesión 22. Nunca se muestra solo
  // "Soda en lata / $3.50": el cliente y la cocina necesitan saber qué
  // sabor se eligió, igual que ya pasa con tamaño/masa/salsa arriba.
  if (line.variant) parts.push(line.variant.name)
  return parts.join(' · ')
}

function cartToRpcItems(lines: CartLine[]): CartRpcItem[] {
  return lines.map((line) => ({
    menu_item_id: line.menuItemId,
    size_id: line.size?.id ?? null,
    crust_id: line.crust?.id ?? null,
    sauce_id: line.sauce?.id ?? null,
    sauce_quantity_level: line.sauce?.quantityLevel ?? 'normal',
    topping_ids: line.toppings.map((top) => ({ id: top.id, quantity_level: top.quantityLevel })),
    variant_id: line.variant?.id ?? null,
    quantity: line.quantity,
  }))
}

export default function CheckoutPage() {
  const { lines, removeLine, updateQuantity, clear } = useCart()
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const { status: storeStatus } = useStoreStatus()

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>(NEW_ADDRESS)
  const [manualAddress, setManualAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [notes, setNotes] = useState('')
  const [promoCode, setPromoCode] = useState('')
  // Propina: 100% para el conductor, nunca se mezcla con el precio del
  // pedido — se muestra y se envía por separado (ver orders.tip_amount).
  // Solo aplica a domicilio: en pickup no hay conductor que la reciba.
  const [tipOption, setTipOption] = useState<number | 'custom' | null>(null)
  const [customTip, setCustomTip] = useState('')
  const tipAmount = orderType !== 'delivery' ? 0 : tipOption === 'custom' ? Number(customTip) || 0 : (tipOption ?? 0)

  const [pricing, setPricing] = useState<{
    subtotal: number
    discount: number
    delivery_fee: number
    tax: number
    credit_applied: number
    available_credit: number
    total: number
    promotion_code: string | null
  } | null>(null)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Pizzeria Credit — Sesión 23. Nunca se aplica solo porque existe: el
  // cliente decide con este toggle, y el servidor (calculate_cart_price)
  // es quien recorta lo pedido a lo realmente disponible.
  const [useCredit, setUseCredit] = useState(false)
  const [creditBalance, setCreditBalance] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchCreditBalance(user.id).then(setCreditBalance)
  }, [user])

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
      calculateCartPrice(cartItems, orderType, promoCode || undefined, user?.id, useCredit ? creditBalance : 0)
        .then((result) => {
          if (!active) return
          setPricing(result)
          setPricingError(null)
        })
        .catch((err) => {
          if (!active) return
          setPricingError(err instanceof Error ? err.message : t('checkout.errorPricing'))
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
  }, [JSON.stringify(cartItems), orderType, promoCode, user?.id, useCredit, creditBalance])

  async function handleSubmit() {
    setFormError(null)
    if (!customerName.trim()) return setFormError(t('checkout.errorName'))
    if (!phone.trim()) return setFormError(t('checkout.errorPhone'))

    const usingSavedAddress = selectedAddressId !== NEW_ADDRESS
    const addressText = usingSavedAddress
      ? formatAddress(addresses.find((a) => a.id === selectedAddressId))
      : manualAddress.trim()

    if (orderType === 'delivery' && !addressText) {
      return setFormError(t('checkout.errorAddress'))
    }
    if (lines.length === 0) return setFormError(t('checkout.emptyCart'))

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
        tipAmount,
        creditApplied: useCredit ? creditBalance : 0,
      })

      clear()
      saveLastOrderId(order.id)
      router.push(`/order?id=${order.id}`)
    } catch (err) {
      // Mensaje accionable, nunca un genérico "algo salió mal".
      const message = err instanceof Error ? err.message : ''
      if (message.includes('ya no está disponible')) {
        setFormError(t('checkout.errorItemUnavailable'))
      } else if (message.includes('carrito está vacío')) {
        setFormError(t('checkout.emptyCart'))
      } else if (message.includes('tienda está cerrada')) {
        // create_order() ya rechazó esto en el servidor — pasa si el
        // horario cerró justo entre que se cargó la página y se envió el
        // pedido. No confiamos solo en deshabilitar el botón en el cliente.
        setFormError(t('checkout.errorStoreClosed'))
      } else {
        setFormError(t('checkout.errorConnection'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-500/15 text-brand-400">
          <ShoppingBag size={28} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">{t('checkout.emptyCart')}</p>
        <Button onClick={() => router.push('/menu')}>{t('checkout.seeMenu')}</Button>
      </div>
    )
  }

  const storeClosed = storeStatus != null && !storeStatus.is_open
  const canSubmit = !submitting && !pricingLoading && !pricingError && !!pricing && !storeClosed
  const finalTotal = pricing ? pricing.total + tipAmount : null
  // Mismo texto/monto en el CTA fijo de mobile y en el de escritorio —
  // una sola fuente de verdad para que nunca queden desincronizados.
  const ctaLabel = submitting
    ? t('checkout.submitting')
    : storeClosed
      ? t('storeStatus.closedGeneric')
      : finalTotal != null
        ? `${t('checkout.confirmOrder')} · ${formatCurrency(finalTotal)}`
        : t('checkout.confirmOrder')

  return (
    // pb en mobile: espacio para DOS barras fijas apiladas abajo — el CTA
    // de Checkout (~7rem con su propio padding) y, debajo de esa,
    // BottomTabBar (--bottom-nav-h) — para que ninguna tape el último
    // campo, el mensaje de error o cualquier fila del resumen. lg: sin
    // espacio extra — ahí el botón vive dentro de la columna de resumen
    // (no fijo) y BottomTabBar es la única barra fija, ya contemplada por
    // el layout compartido.
    <div className="pb-[calc(7rem+var(--bottom-nav-h))] lg:pb-0">
      <h1 className="mb-4 text-xl font-extrabold text-foreground">{t('checkout.pageTitle')}</h1>

      {/* grid-cols-1 explícito: sin esto, un grid sin columnas declaradas
          para el breakpoint base puede crecer más allá del contenedor si
          algún hijo (una fila flex con varios elementos de ancho fijo,
          p.ej.) tiene un min-content ancho — "grid blowout" clásico, la
          causa real del overflow horizontal que apareció en mobile. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        {/* ------- Columna izquierda: información del checkout, en
            secciones separadas con su propio encabezado — antes todo esto
            vivía apilado sin separación dentro de una sola tarjeta. ------- */}
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {t('checkout.sectionAddressTitle')}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType('delivery')}
                aria-pressed={orderType === 'delivery'}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98]',
                  orderType === 'delivery' ? 'border-brand-500 bg-brand-500/10 text-foreground' : 'border-border text-muted-foreground hover:border-border-strong'
                )}
              >
                <Truck size={15} aria-hidden="true" /> {t('home.delivery')}
              </button>
              <button
                onClick={() => setOrderType('pickup')}
                aria-pressed={orderType === 'pickup'}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98]',
                  orderType === 'pickup' ? 'border-brand-500 bg-brand-500/10 text-foreground' : 'border-border text-muted-foreground hover:border-border-strong'
                )}
              >
                <Store size={15} aria-hidden="true" /> {t('home.pickup')}
              </button>
            </div>

            {orderType === 'delivery' && (
              <div>
                <Label>{t('checkout.address')}</Label>
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
                      <SelectItem value={NEW_ADDRESS}>{t('checkout.otherAddress')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {selectedAddressId === NEW_ADDRESS && (
                  <Textarea
                    className="mt-2"
                    rows={2}
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder={t('checkout.addressPlaceholder')}
                  />
                )}
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {t('checkout.sectionContactTitle')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="checkout-name">{t('checkout.name')}</Label>
                <Input id="checkout-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t('checkout.namePlaceholder')} />
              </div>
              <div>
                <Label htmlFor="checkout-phone">{t('auth.phone')}</Label>
                <Input id="checkout-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('checkout.phonePlaceholder')} />
              </div>
            </div>
          </Card>

          {creditBalance > 0 && (
            <Card className="space-y-2 p-5">
              <button
                type="button"
                onClick={() => setUseCredit((v) => !v)}
                aria-pressed={useCredit}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99]',
                  useCredit ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-card hover:border-border-strong'
                )}
              >
                <div>
                  <p className="text-sm font-bold text-foreground">{t('checkout.useCredit')}</p>
                  <p className="text-xs text-muted-foreground">{t('checkout.availableCredit', { amount: formatCurrency(creditBalance) })}</p>
                </div>
                <div
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-md border-2',
                    useCredit ? 'border-brand-500 bg-brand-500' : 'border-border'
                  )}
                >
                  {useCredit && <Check size={12} className="text-white" aria-hidden="true" />}
                </div>
              </button>
            </Card>
          )}

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {t('checkout.paymentMethod')}
            </h2>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full" id="checkout-payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">{t('checkout.cash')}</SelectItem>
                <SelectItem value="Tarjeta contra entrega">{t('checkout.cardOnDelivery')}</SelectItem>
                <SelectItem value="Transferencia">{t('checkout.transfer')}</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Label htmlFor="checkout-notes">{t('checkout.notes')}</Label>
              <Textarea
                id="checkout-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('checkout.notesPlaceholder')}
              />
            </div>
          </Card>

          {formError && (
            <p role="alert" className="rounded-2xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm font-semibold text-danger-300">
              {formError}
            </p>
          )}
        </div>

        {/* ------- Columna derecha: resumen del pedido — sticky en
            escritorio, en flujo normal en mobile (el CTA de acá se oculta
            en mobile, donde manda el fijo de abajo). ------- */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              {t('checkout.orderSummaryTitle')}
            </h2>
            <div className="space-y-3">
              {lines.map((line) => (
                <div key={line.lineId} className="flex items-center gap-3">
                  <ItemThumb name={line.name} imageUrl={line.imageUrl} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{line.name}</p>
                    {lineDescription(line, t) && (
                      <p className="truncate text-xs text-muted-foreground">{lineDescription(line, t)}</p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <QuantityStepper
                        size="sm"
                        value={line.quantity}
                        onDecrease={() => updateQuantity(line.lineId, line.quantity - 1)}
                        onIncrease={() => updateQuantity(line.lineId, line.quantity + 1)}
                        decreaseLabel={`${t('checkout.decreaseQty')} ${line.name}`}
                        increaseLabel={`${t('checkout.increaseQty')} ${line.name}`}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-foreground">
                          {formatCurrency(line.unitPrice * line.quantity)}
                        </span>
                        <button
                          onClick={() => removeLine(line.lineId)}
                          className="text-muted-foreground transition hover:text-danger-500"
                          aria-label={`${t('checkout.removeItem')} ${line.name} ${t('checkout.removeItemSuffix')}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Código de promoción: inline, dentro del mismo resumen que
                termina afectando — no una sección aparte. */}
            <div className="border-t border-border pt-3">
              <Label htmlFor="checkout-promo">{t('checkout.promoCode')}</Label>
              <div className="relative">
                <Tag size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="checkout-promo"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder={t('checkout.promoPlaceholder')}
                  className="pl-9"
                />
              </div>
              {pricing?.promotion_code && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-success-500">
                  <Check size={12} aria-hidden="true" /> {t('checkout.promoApplied', { code: pricing.promotion_code })}
                </p>
              )}
              {!pricing?.promotion_code && promoCode && !pricingLoading && (
                <p className="mt-1 text-xs text-muted-foreground">{t('checkout.promoNotApplicable')}</p>
              )}
            </div>
          </Card>

          {orderType === 'delivery' && (
            <Card className="space-y-2 p-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{t('checkout.tipLabel')}</h2>
              <p className="text-[11px] text-muted-foreground">{t('checkout.tipHint')}</p>
              <div className="flex flex-wrap gap-2">
                {[0, 2, 3, 5].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTipOption(amount)}
                    aria-pressed={tipOption === amount}
                    className={cn(
                      'rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition active:scale-95',
                      tipOption === amount ? 'border-brand-500 bg-brand-500/10 text-foreground' : 'border-border text-muted-foreground hover:border-border-strong'
                    )}
                  >
                    {amount === 0 ? t('checkout.tipNone') : formatCurrency(amount)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTipOption('custom')}
                  aria-pressed={tipOption === 'custom'}
                  className={cn(
                    'rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition active:scale-95',
                    tipOption === 'custom' ? 'border-brand-500 bg-brand-500/10 text-foreground' : 'border-border text-muted-foreground hover:border-border-strong'
                  )}
                >
                  {t('checkout.tipCustom')}
                </button>
              </div>
              {tipOption === 'custom' && (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="mt-1"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  placeholder={t('checkout.tipCustomPlaceholder')}
                />
              )}
            </Card>
          )}

          {/* Totales + CTA de escritorio, en su propia tarjeta de marca —
              el total final es lo más grande de toda la pantalla a
              propósito. En mobile el botón de acá se oculta: manda el
              fijo de abajo, que muestra el mismo monto. */}
          <Card className="space-y-3 border-transparent bg-brand-500 p-5 text-white shadow-pop">
            {pricingLoading ? (
              <p className="text-sm text-white/80">{t('checkout.calculatingTotal')}</p>
            ) : pricingError ? (
              <p role="alert" className="text-sm font-semibold text-white">
                {pricingError}
              </p>
            ) : pricing ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-white/80">
                  <span>{t('checkout.subtotal')}</span>
                  <span>{formatCurrency(pricing.subtotal)}</span>
                </div>
                {pricing.discount > 0 && (
                  <div className="flex justify-between text-white">
                    <span>{t('checkout.discount')}</span>
                    <span>-{formatCurrency(pricing.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white/80">
                  <span>{t('checkout.shipping')}</span>
                  <span>{pricing.delivery_fee > 0 ? formatCurrency(pricing.delivery_fee) : t('checkout.free')}</span>
                </div>
                {pricing.tax > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>{t('checkout.tax')}</span>
                    <span>{formatCurrency(pricing.tax)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>{t('checkout.tipLineLabel')}</span>
                    <span>{formatCurrency(tipAmount)}</span>
                  </div>
                )}
                {pricing.credit_applied > 0 && (
                  <div className="flex justify-between text-white">
                    <span>{t('checkout.creditApplied')}</span>
                    <span>-{formatCurrency(pricing.credit_applied)}</span>
                  </div>
                )}
                {/* El total: el número más dominante de toda la pantalla —
                    escala tipográfica display, no solo negrita. */}
                <div className="flex items-baseline justify-between border-t border-white/20 pt-2">
                  <span className="text-sm font-bold text-white/90">{t('checkout.totalToPay')}</span>
                  <span className="text-display font-extrabold text-white">{formatCurrency(finalTotal ?? pricing.total)}</span>
                </div>
              </div>
            ) : null}

            {storeClosed && (
              <p role="alert" className="text-center text-xs font-semibold text-white">
                {t('storeStatus.cannotOrder')}
              </p>
            )}
            {/* Oculto en mobile (< lg): ahí el CTA fijo de abajo es el que
                manda — mismo label, mismo estado disabled. */}
            <Button
              fullWidth
              size="lg"
              className="hidden bg-white text-brand-900 hover:bg-white/90 lg:flex"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {ctaLabel}
            </Button>
          </Card>
        </div>
      </div>

      {/* CTA fijo de mobile — se apila JUSTO ARRIBA de BottomTabBar
          (bottom: --bottom-nav-h, en vez de bottom-0) para que el cliente
          nunca pierda la navegación general al revisar/editar su carrito
          acá; el safe-area inferior ya lo reserva esa barra de abajo, así
          que este CTA no necesita el suyo propio. Content no tapado
          gracias al pb del contenedor raíz de arriba. */}
      <div className="fixed inset-x-0 bottom-[var(--bottom-nav-h)] z-20 border-t border-border bg-card p-4 shadow-elevated lg:hidden">
        <Button fullWidth size="lg" onClick={handleSubmit} disabled={!canSubmit}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  )
}

function formatAddress(address?: Address): string {
  if (!address) return ''
  const parts = [address.street, address.apartment, `${address.city}, ${address.state} ${address.zip}`]
  return parts.filter(Boolean).join(', ')
}
