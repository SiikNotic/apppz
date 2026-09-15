import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, MenuItem, ItemSize, Crust, Sauce, Topping, MenuItemVariant } from '../lib/types'

export interface MenuData {
  categories: Category[]
  itemsByCategory: Map<string, MenuItem[]>
  sizesByItem: Map<string, ItemSize[]>
  variantsByItem: Map<string, MenuItemVariant[]>
  crusts: Crust[]
  sauces: Sauce[]
  toppings: Topping[]
  loading: boolean
  error: string | null
}

export function useMenuData(): MenuData {
  const [state, setState] = useState<Omit<MenuData, 'loading' | 'error'>>({
    categories: [],
    itemsByCategory: new Map(),
    sizesByItem: new Map(),
    variantsByItem: new Map(),
    crusts: [],
    sauces: [],
    toppings: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const [categoriesRes, itemsRes, sizesRes, variantsRes, crustsRes, saucesRes, toppingsRes] =
        await Promise.all([
          supabase.from('categories').select('*').eq('active', true).order('sort_order'),
          supabase.from('menu_items').select('*').eq('active', true).order('name'),
          supabase.from('item_sizes').select('*').order('sort_order'),
          supabase.from('menu_item_variants').select('*').eq('active', true).order('sort_order'),
          supabase.from('crusts').select('*').eq('active', true).order('extra_price'),
          supabase.from('sauces').select('*').eq('active', true).order('name'),
          supabase.from('toppings').select('*').eq('active', true).order('name'),
        ])

      if (!active) return

      const firstError =
        categoriesRes.error ||
        itemsRes.error ||
        sizesRes.error ||
        variantsRes.error ||
        crustsRes.error ||
        saucesRes.error ||
        toppingsRes.error
      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      const itemsByCategory = new Map<string, MenuItem[]>()
      for (const item of itemsRes.data ?? []) {
        const key = item.category_id ?? 'sin-categoria'
        if (!itemsByCategory.has(key)) itemsByCategory.set(key, [])
        itemsByCategory.get(key)!.push(item)
      }

      const sizesByItem = new Map<string, ItemSize[]>()
      for (const size of sizesRes.data ?? []) {
        if (!sizesByItem.has(size.menu_item_id)) sizesByItem.set(size.menu_item_id, [])
        sizesByItem.get(size.menu_item_id)!.push(size)
      }

      const variantsByItem = new Map<string, MenuItemVariant[]>()
      for (const variant of variantsRes.data ?? []) {
        if (!variantsByItem.has(variant.menu_item_id)) variantsByItem.set(variant.menu_item_id, [])
        variantsByItem.get(variant.menu_item_id)!.push(variant)
      }

      setState({
        categories: categoriesRes.data ?? [],
        itemsByCategory,
        sizesByItem,
        variantsByItem,
        crusts: crustsRes.data ?? [],
        sauces: saucesRes.data ?? [],
        toppings: toppingsRes.data ?? [],
      })
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return { ...state, loading, error }
}
