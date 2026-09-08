import { supabase } from '@/lib/supabase'
import type { Category, MenuItem, ItemSize, Crust, Sauce, Topping, ProductImage } from '@/lib/types'

/**
 * Capa de acceso a datos: solo lectura/escritura cruda contra Supabase.
 * Sin reglas de negocio aquí — eso vive en business-logic/ y api/.
 */

export async function fetchActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').eq('active', true).order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function fetchActiveMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase.from('menu_items').select('*').eq('active', true).order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchMenuItemById(id: string): Promise<MenuItem | null> {
  const { data, error } = await supabase.from('menu_items').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchItemSizes(menuItemId?: string): Promise<ItemSize[]> {
  const query = supabase.from('item_sizes').select('*').order('sort_order')
  const { data, error } = await (menuItemId ? query.eq('menu_item_id', menuItemId) : query)
  if (error) throw error
  return data ?? []
}

export async function fetchActiveCrusts(): Promise<Crust[]> {
  const { data, error } = await supabase.from('crusts').select('*').eq('active', true).order('extra_price')
  if (error) throw error
  return data ?? []
}

export async function fetchActiveSauces(): Promise<Sauce[]> {
  const { data, error } = await supabase.from('sauces').select('*').eq('active', true).order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchActiveToppings(): Promise<Topping[]> {
  const { data, error } = await supabase.from('toppings').select('*').eq('active', true).order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchProductImages(menuItemId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('menu_item_id', menuItemId)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}
