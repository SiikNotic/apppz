import { supabase } from '@/lib/supabase'
import { fetchOrderItems } from '@/lib/data-access/orders'
import type { CartLine } from '@/lib/types'

/**
 * Reconstruye un pedido pasado como líneas de carrito nuevas, verificando
 * disponibilidad y precio ACTUALES — nunca asumimos que un producto,
 * tamaño, masa, salsa o topping de hace tres meses siga existiendo o
 * cueste lo mismo. Lo que no se puede reconstruir se omite y se reporta
 * en `warnings` para que la UI se lo diga al usuario.
 */
export async function buildCartLinesFromOrder(
  orderId: string
): Promise<{ lines: Omit<CartLine, 'lineId'>[]; warnings: string[] }> {
  const orderItems = await fetchOrderItems(orderId)
  const lines: Omit<CartLine, 'lineId'>[] = []
  const warnings: string[] = []

  for (const oi of orderItems) {
    if (!oi.menu_item_id) {
      warnings.push(`"${oi.item_name}" ya no se puede reordenar.`)
      continue
    }

    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', oi.menu_item_id)
      .eq('active', true)
      .maybeSingle()

    if (!menuItem) {
      warnings.push(`"${oi.item_name}" ya no está disponible y se omitió.`)
      continue
    }

    if (!menuItem.is_customizable_pizza) {
      // Producto con variante (marca/sabor) — Sesión 22. Se re-resuelve
      // por nombre contra las variantes activas de HOY, igual criterio
      // que tamaño/masa/salsa/toppings de pizza más abajo: si la variante
      // ya no existe (renombrada o borrada), se omite la línea entera en
      // vez de adivinar un precio — el cliente puede agregarlo de nuevo
      // manualmente si el producto sigue disponible.
      if (menuItem.has_variants && oi.variant_name) {
        const { data: variants } = await supabase
          .from('menu_item_variants')
          .select('*')
          .eq('menu_item_id', menuItem.id)
          .eq('active', true)
        const variant = variants?.find((v) => v.name === oi.variant_name)
        if (!variant) {
          warnings.push(`La variante de "${oi.item_name}" ya no está disponible y se omitió.`)
          continue
        }
        lines.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          imageUrl: menuItem.image_url,
          quantity: oi.quantity,
          unitPrice: variant.price, // precio ACTUAL de la variante, no el guardado en el pedido viejo
          toppings: [],
          variant: { id: variant.id, name: variant.name, price: variant.price },
        })
        continue
      }

      lines.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        imageUrl: menuItem.image_url,
        quantity: oi.quantity,
        unitPrice: menuItem.base_price, // precio ACTUAL, no el guardado en el pedido viejo
        toppings: [],
      })
      continue
    }

    // Pizza personalizable: re-resolver tamaño/masa/salsa/toppings por
    // nombre contra las opciones activas de HOY.
    const [{ data: sizes }, { data: crusts }, { data: sauces }, { data: toppingRows }] = await Promise.all([
      supabase.from('item_sizes').select('*').eq('menu_item_id', menuItem.id),
      supabase.from('crusts').select('*').eq('active', true),
      supabase.from('sauces').select('*').eq('active', true),
      supabase.from('toppings').select('*').eq('active', true),
    ])

    const size = sizes?.find((s) => s.name === oi.size_name)
    const crust = crusts?.find((c) => c.name === oi.crust_name)
    const sauce = sauces?.find((s) => s.name === oi.sauce_name)

    if (!size) {
      warnings.push(`El tamaño de "${oi.item_name}" ya no está disponible; ajusta tu pizza manualmente.`)
      continue
    }

    const requestedToppingNames = oi.order_item_toppings.map((t) => t.topping_name)
    const resolvedToppings = requestedToppingNames
      .map((name) => toppingRows?.find((t) => t.name === name))
      .filter((t): t is NonNullable<typeof t> => !!t)

    if (resolvedToppings.length < requestedToppingNames.length) {
      warnings.push(`Algunos toppings de "${oi.item_name}" ya no están disponibles y se omitieron.`)
    }

    const unitPrice =
      size.price +
      (crust?.extra_price ?? 0) +
      (sauce?.extra_price ?? 0) +
      resolvedToppings.slice(4).reduce((sum, t) => sum + t.price, 0)

    // Reordenar siempre reconstruye en nivel 'normal' — el pedido viejo
    // pudo tener Poco/Extra en algún topping o en la salsa, pero
    // reordenar es "arma esto de nuevo desde cero", no "copia
    // exactamente los niveles de aquella vez"; el cliente puede volver a
    // subir a Extra manualmente si quiere, igual que con cualquier otro
    // ajuste (tamaño, masa) que tampoco se preserva letra por letra acá.
    lines.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      imageUrl: menuItem.image_url,
      quantity: oi.quantity,
      unitPrice,
      size: { id: size.id, name: size.name, price: size.price },
      crust: crust ? { id: crust.id, name: crust.name, extraPrice: crust.extra_price } : undefined,
      sauce: sauce
        ? { id: sauce.id, name: sauce.name, extraPrice: sauce.extra_price, quantityLevel: 'normal', price: sauce.extra_price }
        : undefined,
      toppings: resolvedToppings.map((t, i) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        free: i < 4,
        quantityLevel: 'normal',
      })),
    })
  }

  return { lines, warnings }
}
