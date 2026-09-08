import { supabase } from './supabase'

/**
 * Descuenta del inventario los ingredientes usados por un pedido, según las
 * recetas configuradas en recipe_ingredients (masa/queso base por producto y
 * tamaño) y topping_ingredients (consumo por topping). Se debe llamar una
 * sola vez por pedido, típicamente al pasar de "pending" a "confirmed".
 */
export async function deductInventoryForOrder(orderId: string): Promise<{ error?: string }> {
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*, order_item_toppings(*)')
    .eq('order_id', orderId)

  if (itemsError) return { error: itemsError.message }
  if (!orderItems || orderItems.length === 0) return {}

  const usage = new Map<string, number>() // ingredient_id -> cantidad a descontar

  for (const item of orderItems) {
    if (!item.menu_item_id) continue

    let itemSizeId: string | null = null
    if (item.size_name) {
      const { data: sizeRow } = await supabase
        .from('item_sizes')
        .select('id')
        .eq('menu_item_id', item.menu_item_id)
        .eq('name', item.size_name)
        .maybeSingle()
      itemSizeId = sizeRow?.id ?? null
    }

    const recipeQuery = supabase
      .from('recipe_ingredients')
      .select('ingredient_id, quantity, item_size_id')
      .eq('menu_item_id', item.menu_item_id)

    const { data: recipeRows } = itemSizeId
      ? await recipeQuery.eq('item_size_id', itemSizeId)
      : await recipeQuery.is('item_size_id', null)

    for (const row of recipeRows ?? []) {
      const current = usage.get(row.ingredient_id) ?? 0
      usage.set(row.ingredient_id, current + row.quantity * item.quantity)
    }

    const toppingNames = (item.order_item_toppings ?? []).map((t) => t.topping_name)
    if (toppingNames.length > 0) {
      const { data: toppingRows } = await supabase
        .from('toppings')
        .select('id, name')
        .in('name', toppingNames)

      const toppingIds = (toppingRows ?? []).map((t) => t.id)
      if (toppingIds.length > 0) {
        const { data: toppingIngredientRows } = await supabase
          .from('topping_ingredients')
          .select('ingredient_id, quantity')
          .in('topping_id', toppingIds)

        for (const row of toppingIngredientRows ?? []) {
          const current = usage.get(row.ingredient_id) ?? 0
          usage.set(row.ingredient_id, current + row.quantity * item.quantity)
        }
      }
    }
  }

  if (usage.size === 0) return {}

  const ingredientIds = Array.from(usage.keys())
  const { data: ingredients, error: ingredientsError } = await supabase
    .from('ingredients')
    .select('id, stock_quantity')
    .in('id', ingredientIds)

  if (ingredientsError) return { error: ingredientsError.message }

  for (const ingredient of ingredients ?? []) {
    const used = usage.get(ingredient.id) ?? 0
    if (used <= 0) continue
    const newStock = Math.max(0, ingredient.stock_quantity - used)
    await supabase.from('ingredients').update({ stock_quantity: newStock }).eq('id', ingredient.id)
    await supabase.from('inventory_movements').insert({
      ingredient_id: ingredient.id,
      type: 'out',
      quantity: used,
      reason: 'Consumo por pedido',
      order_id: orderId,
    })
  }

  return {}
}
