import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, MenuItem, ItemSize, Crust, Sauce, Topping } from '../lib/types'

export interface MenuData {
  categories: Category[]
  itemsByCategory: Map<string, MenuItem[]>
  sizesByItem: Map<string, ItemSize[]>
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
      const [categoriesRes, itemsRes, sizesRes, crustsRes, saucesRes, toppingsRes] =
        await Promise.all([
          supabase.from('categories').select('*').eq('active', true).order('sort_order'),
          supabase.from('menu_items').select('*').eq('active', true).order('name'),
          supabase.from('item_sizes').select('*').order('sort_order'),
          supabase.from('crusts').select('*').eq('active', true).order('extra_price'),
          supabase.from('sauces').select('*').eq('active', true).order('name'),
          supabase.from('toppings').select('*').eq('active', true).order('name'),
        ])

      if (!active) return

      const firstError =
        categoriesRes.error ||
        itemsRes.error ||
        sizesRes.error ||
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

      setState({
        categories: categoriesRes.data ?? [],
        itemsByCategory,
        sizesByItem,
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
