'use client'

import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
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

// orderStatus.* (translations.ts) cubre todo OrderStatus real (ver
// lib/types.ts) — un valor futuro que no esté aquí se muestra tal cual
// llegó de la base de datos en vez de una ruta de traducción rota
// ("orderStatus.algo_nuevo") en el papel impreso.
const ORDER_STATUS_I18N_KEYS = new Set([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
  'failed',
])

type ReceiptItem = OrderItem & { order_item_toppings?: OrderItemTopping[] }

interface OrderReceiptProps {
  order: Order
  items: ReceiptItem[]
  /**
   * 'ticket' (por defecto): angosto, monoespaciado — como un rollo de
   * papel térmico, pensado para verse dentro de un diálogo en pantalla
   * (historial de pedidos del cliente).
   * 'sheet': hoja completa tipo factura/invoice, para imprimir en papel
   * Letter o generar el PDF (etiqueta de cocina) — misma información y
   * misma lógica de armado, solo con tipografía normal, más espacio y
   * usando el ancho completo de la página en vez de imitar un ticket
   * angosto (que se vería vacío y descentrado estirado a tamaño carta).
   */
  variant?: 'ticket' | 'sheet'
}

/**
 * Recibo del pedido — única fuente de verdad para el contenido de un
 * recibo en toda la app (antes /company/kitchen tenía su propia copia a
 * mano del mismo marcado para la etiqueta imprimible, desalineada de esta
 * y le faltaban campos reales como teléfono/estado del pedido). Ambas
 * variantes comparten exactamente los mismos datos derivados; solo
 * cambia la presentación.
 *
 * Siempre en papel blanco/texto negro — a propósito NO sigue el tema
 * claro/oscuro del resto de la app, igual que un recibo físico siempre se
 * imprime igual sin importar la app que lo generó.
 *
 * Solo muestra datos que existen de verdad en el schema (orders/order_items/
 * order_item_toppings) — a diferencia de referencias de diseño típicas,
 * aquí NO hay tarjeta enmascarada ni número de autorización porque esa
 * información no se captura en ningún lugar de este negocio. La propina
 * (tip_amount) sí es un dato real y se muestra aparte del total del
 * pedido, nunca sumada a él.
 */
export function OrderReceipt({ order, items, variant = 'ticket' }: OrderReceiptProps) {
  const { t } = useLanguage()
  const sheet = variant === 'sheet'

  const paymentMethodLabel = order.payment_method
    ? t(PAYMENT_METHOD_KEY[order.payment_method] ?? '') || order.payment_method
    : null
  const paymentStatusKey = PAYMENT_STATUS_KEY[order.payment_status]
  const isDelivery = order.order_type === 'delivery'
  const orderStatusLabel = ORDER_STATUS_I18N_KEYS.has(order.status) ? t(`orderStatus.${order.status}`) : order.status

  if (sheet) {
    return (
      <div className="w-full bg-white p-8 text-black sm:p-10">
        <div className="text-center">
          <p className="text-2xl font-extrabold uppercase tracking-wide">{BRAND_NAME}</p>
          <p className="text-sm text-neutral-500">{BRAND_TAGLINE}</p>
        </div>

        <SheetDivider />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold">
              {t('ordersAdmin.orderLabel')} #{order.order_number}
            </p>
            <p className="text-sm text-neutral-500">{formatDate(order.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{t('receipt.orderStatusLabel')}</p>
            <p className="text-sm font-bold">{orderStatusLabel}</p>
          </div>
        </div>

        <SheetDivider />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{t('receipt.customer')}</p>
            <p className="font-semibold">{order.customer_name}</p>
            {order.phone && <p className="text-sm">{t('kitchen.phonePrefix')} {order.phone}</p>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              {isDelivery ? t('receipt.deliverTo') : t('home.pickup')}
            </p>
            {isDelivery ? (
              <p className="text-sm">{order.address || t('driverPage.noAddress')}</p>
            ) : (
              <p className="text-sm">{t('receipt.pickupNote')}</p>
            )}
          </div>
        </div>

        <SheetDivider />

        <div>
          <div className="flex justify-between gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            <span>{t('receipt.itemsHeading')}</span>
            <span>{t('checkout.subtotal')}</span>
          </div>
          <div className="mt-2 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {item.quantity}× {item.item_name}
                    {item.size_name ? ` (${item.size_name})` : ''}
                  </p>
                  {(item.crust_name || item.sauce_name) && (
                    <p className="text-sm text-neutral-500">
                      {[item.crust_name, item.sauce_name].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {item.order_item_toppings && item.order_item_toppings.length > 0 && (
                    <p className="text-sm text-neutral-500">
                      {t('ordersAdmin.toppingsPrefix')} {item.order_item_toppings.map((tp) => tp.topping_name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-semibold">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>

        {order.notes && (
          <>
            <SheetDivider />
            <p className="text-sm">
              <span className="font-bold">{t('ordersAdmin.notesLabel')}</span> {order.notes}
            </p>
          </>
        )}

        <SheetDivider />

        <div className="ml-auto max-w-xs space-y-1">
          <SheetRow label={t('checkout.subtotal')} value={formatCurrency(order.subtotal)} />
          {order.discount > 0 && <SheetRow label={t('checkout.discount')} value={`-${formatCurrency(order.discount)}`} />}
          {isDelivery && <SheetRow label={t('checkout.shipping')} value={formatCurrency(order.delivery_fee)} />}
          {order.tax > 0 && <SheetRow label={t('checkout.tax')} value={formatCurrency(order.tax)} />}
          <div className="my-1 border-t border-black" aria-hidden="true" />
          <SheetRow label={t('checkout.total').toUpperCase()} value={formatCurrency(order.total)} bold />
          {order.tip_amount > 0 && (
            <>
              <SheetRow label={t('checkout.tipLineLabel')} value={formatCurrency(order.tip_amount)} />
              <div className="my-1 border-t border-black" aria-hidden="true" />
              <SheetRow label={t('checkout.totalToPay').toUpperCase()} value={formatCurrency(order.total + order.tip_amount)} bold />
            </>
          )}
        </div>

        {(paymentMethodLabel || paymentStatusKey) && (
          <>
            <SheetDivider />
            <div className="flex justify-between gap-4 text-sm">
              {paymentMethodLabel && (
                <p>
                  <span className="font-bold">{t('receipt.paymentMethod')}:</span> {paymentMethodLabel}
                </p>
              )}
              {paymentStatusKey && (
                <p>
                  <span className="font-bold">{t('receipt.paymentStatus')}:</span> {t(paymentStatusKey)}
                </p>
              )}
            </div>
          </>
        )}

        <SheetDivider />

        <p className="text-center text-sm font-bold uppercase tracking-wide">{t('receipt.thanks')}</p>
      </div>
    )
  }

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
        <p className="text-[11px] font-bold uppercase">{orderStatusLabel}</p>
      </div>

      <Divider />

      <div className="space-y-0.5">
        <p>
          {t('receipt.customer')}: {order.customer_name}
        </p>
        {order.phone && (
          <p>
            {t('kitchen.phonePrefix')} {order.phone}
          </p>
        )}
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

      {order.tip_amount > 0 && (
        <>
          <Divider />
          <Row label={t('checkout.tipLineLabel')} value={formatCurrency(order.tip_amount)} />
          <Row label={t('checkout.totalToPay').toUpperCase()} value={formatCurrency(order.total + order.tip_amount)} bold />
        </>
      )}

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
    <div className={cn('flex justify-between gap-2', bold && 'font-bold')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-neutral-400" aria-hidden="true" />
}

function SheetRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4 text-sm', bold && 'text-base font-extrabold')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function SheetDivider() {
  return <div className="my-4 border-t border-neutral-300" aria-hidden="true" />
}
