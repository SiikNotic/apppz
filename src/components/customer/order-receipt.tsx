'use client'

import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Order, OrderItem, OrderItemTopping } from '@/lib/types'

// Los valores de payment_method se guardan tal cual salen del <Select> del
// checkout (en español, ver checkout/page.tsx) sin importar el idioma de
// quien pagó — para que el recibo respete el idioma actual del que lo ve,
// se traduce de vuelta aquí. Un método futuro que no esté en el mapa
// simplemente se muestra tal cual se guardó (nunca se pierde información).
const PAYMENT_METHOD_KEY: Record<string, string> = {
  Efectivo: 'checkout.cash',
  'Tarjeta contra entrega': 'checkout.cardOnDelivery',
  Transferencia: 'checkout.transfer',
}

const PAYMENT_STATUS_KEY: Record<string, string> = {
  pending: 'receipt.statusPending',
  authorized: 'receipt.statusAuthorized',
  paid: 'receipt.statusPaid',
  failed: 'receipt.statusFailed',
  refunded: 'receipt.statusRefunded',
  partially_refunded: 'receipt.statusPartiallyRefunded',
}

type ReceiptItem = OrderItem & { order_item_toppings?: OrderItemTopping[] }

interface OrderReceiptProps {
  order: Order
  items: ReceiptItem[]
}

/**
 * Recibo estilo "ticket térmico" (ver referencia de diseño del usuario):
 * ancho angosto, monoespaciado, divisores punteados. Siempre en papel
 * blanco/texto negro — a propósito NO sigue el tema claro/oscuro del resto
 * de la app, igual que un recibo físico siempre se imprime igual sin
 * importar la app que lo generó.
 *
 * Solo muestra datos que existen de verdad en el schema (orders/order_items/
 * order_item_toppings) — a diferencia de la referencia, aquí NO hay tarjeta
 * enmascarada, número de autorización ni propina porque esa información no
 * se captura en ningún lugar de este negocio.
 */
export function OrderReceipt({ order, items }: OrderReceiptProps) {
  const { t } = useLanguage()

  const paymentMethodLabel = order.payment_method
    ? t(PAYMENT_METHOD_KEY[order.payment_method] ?? '') || order.payment_method
    : null
  const paymentStatusKey = PAYMENT_STATUS_KEY[order.payment_status]
  const isDelivery = order.order_type === 'delivery'

  return (
    <div className="w-full rounded-3xl bg-white p-6 font-mono text-[13px] leading-relaxed text-black">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide">{BRAND_NAME}</p>
        <p className="text-[11px] text-neutral-500">{BRAND_TAGLINE}</p>
      </div>

      <Divider />

      <div className="text-center">
        <p className="font-bold">
          {t('ordersAdmin.orderLabel')} #{order.order_number}
        </p>
        <p className="text-[11px] text-neutral-500">{formatDate(order.created_at)}</p>
      </div>

      <Divider />

      <div className="space-y-0.5">
        <p>
          {t('receipt.customer')}: {order.customer_name}
        </p>
        {isDelivery ? (
          order.address && <p>{t('receipt.deliverTo')}: {order.address}</p>
        ) : (
          <p>{t('receipt.pickupNote')}</p>
        )}
      </div>

      <Divider />

      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between gap-2">
              <span>
                {item.quantity}× {item.item_name}
                {item.size_name ? ` (${item.size_name})` : ''}
              </span>
              <span className="shrink-0">{formatCurrency(item.subtotal)}</span>
            </div>
            {(item.crust_name || item.sauce_name) && (
              <p className="text-[11px] text-neutral-500">
                {[item.crust_name, item.sauce_name].filter(Boolean).join(' · ')}
              </p>
            )}
            {item.order_item_toppings && item.order_item_toppings.length > 0 && (
              <p className="text-[11px] text-neutral-500">
                {t('ordersAdmin.toppingsPrefix')} {item.order_item_toppings.map((tp) => tp.topping_name).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>

      <Divider />

      <div className="space-y-0.5">
        <Row label={t('checkout.subtotal')} value={formatCurrency(order.subtotal)} />
        {order.discount > 0 && <Row label={t('checkout.discount')} value={`-${formatCurrency(order.discount)}`} />}
        {isDelivery && <Row label={t('checkout.shipping')} value={formatCurrency(order.delivery_fee)} />}
        {order.tax > 0 && <Row label={t('checkout.tax')} value={formatCurrency(order.tax)} />}
      </div>

      <Divider />

      <Row label={t('checkout.total').toUpperCase()} value={formatCurrency(order.total)} bold />

      {(paymentMethodLabel || paymentStatusKey) && (
        <>
          <Divider />
          <div className="space-y-0.5">
            {paymentMethodLabel && <Row label={t('receipt.paymentMethod')} value={paymentMethodLabel} />}
            {paymentStatusKey && <Row label={t('receipt.paymentStatus')} value={t(paymentStatusKey)} />}
          </div>
        </>
      )}

      {order.notes && (
        <>
          <Divider />
          <p className="text-[11px]">
            {t('ordersAdmin.notesLabel')} {order.notes}
          </p>
        </>
      )}

      <Divider />

      <p className="text-center text-[11px] font-bold uppercase tracking-wide">{t('receipt.thanks')}</p>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-neutral-400" aria-hidden="true" />
}
