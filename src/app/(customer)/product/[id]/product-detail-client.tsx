'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Minus, Plus, Pizza as PizzaIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/lib/supabase'
import {
  fetchMenuItemById,
  fetchItemSizes,
  fetchActiveCrusts,
  fetchActiveSauces,
  fetchActiveToppings,
} from '@/lib/data-access/menu'
import { usePizzaBuilder } from '@/components/customer/use-pizza-builder'
import { SizePicker, CrustPicker, SaucePicker, ToppingPicker } from '@/components/customer/pizza-option-pickers'
import { ItemThumb } from '@/components/ui/item-thumb'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MenuItem, ItemSize, Crust, Sauce, Topping } from '@/lib/types'

export function ProductDetailClient({ menuItemId }: { menuItemId: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const { addLine } = useCart()
  const { t } = useLanguage()

  const [item, setItem] = useState<MenuItem | null>(null)
  const [sizes, setSizes] = useState<ItemSize[]>([])
  const [crusts, setCrusts] = useState<Crust[]>([])
  const [sauces, setSauces] = useState<Sauce[]>([])
  const [toppings, setToppings] = useState<Topping[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  const builder = usePizzaBuilder(sizes, crusts, sauces, toppings, item?.free_toppings_limit ?? 0)

  useEffect(() => {
    let active = true
    async function load() {
      const menuItem = await fetchMenuItemById(menuItemId)
      if (!active) return
      setItem(menuItem)
      if (menuItem?.is_customizable_pizza) {
        const [s, c, sa, t] = await Promise.all([
          fetchItemSizes(menuItem.id),
          fetchActiveCrusts(),
          fetchActiveSauces(),
          fetchActiveToppings(),
        ])
        if (!active) return
        setSizes(s)
        setCrusts(c)
        setSauces(sa)
        setToppings(t)
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [menuItemId])

  useEffect(() => {
    if (!user) return
    let active = true
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', 'product')
      .eq('target_id', menuItemId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setIsFavorite(!!data)
        setFavoriteId(data?.id ?? null)
      })
    return () => {
      active = false
    }
  }, [user, menuItemId])

  async function toggleFavorite() {
    if (!user) {
      router.push(`/login?redirect=/product/${menuItemId}`)
      return
    }
    if (isFavorite && favoriteId) {
      await supabase.from('favorites').delete().eq('id', favoriteId)
      setIsFavorite(false)
      setFavoriteId(null)
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, target_type: 'product', target_id: menuItemId })
        .select('id')
        .single()
      setIsFavorite(true)
      setFavoriteId(data?.id ?? null)
    }
  }

  function handleAddSimple() {
    if (!item) return
    addLine({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      quantity,
      unitPrice: item.base_price,
      toppings: [],
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function handleAddPizza() {
    if (!item) return
    const line = builder.buildCartLine(item)
    if (!line) return
    addLine({ ...line, quantity })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) return <p className="py-16 text-center text-sm text-ink-400">{t('product.loadingProduct')}</p>

  if (!item) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm font-semibold text-ink-600">{t('product.notFound')}</p>
        <Button onClick={() => router.push('/menu')}>{t('checkout.seeMenu')}</Button>
      </div>
    )
  }

  const displayPrice = item.is_customizable_pizza ? builder.total : item.base_price

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-start gap-4">
        <ItemThumb name={item.name} imageUrl={item.image_url} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-extrabold text-ink-900">{item.name}</h1>
            <button
              onClick={toggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? t('product.removeFavorite') : t('product.addFavorite')}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white shadow-card text-ink-600 hover:text-brand-900"
            >
              <Heart size={18} className={isFavorite ? 'fill-brand-900 text-brand-900' : ''} aria-hidden="true" />
            </button>
          </div>
          {item.description && <p className="mt-1 text-sm text-ink-600">{item.description}</p>}
          <p className="mt-2 text-lg font-extrabold text-brand-900">
            {item.is_customizable_pizza ? t('product.from') : ''}
            {formatCurrency(displayPrice)}
          </p>
        </div>
      </div>

      {item.is_customizable_pizza ? (
        <div className="space-y-6">
          <SizePicker sizes={sizes} value={builder.sizeId} onChange={builder.setSizeId} />
          <CrustPicker crusts={crusts} value={builder.crustId} onChange={builder.setCrustId} />
          <SaucePicker sauces={sauces} value={builder.sauceId} onChange={builder.setSauceId} />
          <ToppingPicker
            toppings={toppings}
            selectedIds={builder.toppingIds}
            freeRemaining={builder.freeRemaining}
            onToggle={builder.toggleTopping}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-white p-3">
          <PizzaIcon size={18} className="text-ink-300" aria-hidden="true" />
          <span className="text-sm text-ink-600">{t('product.quantityLabel')}</span>
        </div>
      )}

      <div className="sticky bottom-4 z-10 mt-6 rounded-full bg-ink-900 p-2 shadow-pop">
        <div className="flex items-center gap-3 px-2">
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label={t('product.decreaseQuantity')}
              className="grid h-8 w-8 place-items-center rounded-full text-white hover:bg-white/10"
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <span className="w-6 text-center text-sm font-bold text-white">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              aria-label={t('product.increaseQuantity')}
              className="grid h-8 w-8 place-items-center rounded-full text-white hover:bg-white/10"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          <Button
            fullWidth
            variant="dark"
            className="bg-transparent hover:bg-white/10"
            onClick={item.is_customizable_pizza ? handleAddPizza : handleAddSimple}
          >
            {added ? t('product.added') : `${t('product.addButton')} · ${formatCurrency(displayPrice * quantity)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
