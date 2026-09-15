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
  fetchActiveVariants,
} from '@/lib/data-access/menu'
import { usePizzaBuilder } from '@/components/customer/use-pizza-builder'
import { SizePicker, CrustPicker, SaucePicker, ToppingPicker } from '@/components/customer/pizza-option-pickers'
import { VariantOptionList } from '@/components/customer/variant-option-list'
import { ItemThumb } from '@/components/ui/item-thumb'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MenuItem, ItemSize, Crust, Sauce, Topping, MenuItemVariant } from '@/lib/types'

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
  const [variants, setVariants] = useState<MenuItemVariant[]>([])
  const [variantId, setVariantId] = useState<string | null>(null)
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
      } else if (menuItem?.has_variants) {
        const v = await fetchActiveVariants(menuItem.id)
        if (!active) return
        setVariants(v)
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

  // Con variantes activas cargadas, el cliente DEBE elegir una antes de
  // poder agregar al carrito (mismo criterio que un tamaño de pizza); sin
  // ninguna todavía, el producto se vende normal — igual regla que ya
  // aplica en el servidor (calculate_cart_price) y en ProductCard.
  const hasVariantChoice = Boolean(item?.has_variants) && variants.length > 0
  const selectedVariant = variants.find((v) => v.id === variantId) ?? null

  function handleAddSimple() {
    if (!item) return
    // Resguardo adicional — el botón de abajo ya queda deshabilitado
    // mientras falte elegir, esto no es la única barrera.
    if (hasVariantChoice && !selectedVariant) return
    addLine({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      quantity,
      unitPrice: selectedVariant ? selectedVariant.price : item.base_price,
      toppings: [],
      variant: selectedVariant ? { id: selectedVariant.id, name: selectedVariant.name, price: selectedVariant.price } : undefined,
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

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">{t('product.loadingProduct')}</p>

  if (!item) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm font-semibold text-muted-foreground">{t('product.notFound')}</p>
        <Button onClick={() => router.push('/menu')}>{t('checkout.seeMenu')}</Button>
      </div>
    )
  }

  const displayPrice = item.is_customizable_pizza
    ? builder.total
    : hasVariantChoice
      ? (selectedVariant?.price ?? variants[0].price)
      : item.base_price

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-muted">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="h-56 w-full object-cover sm:h-72" />
        ) : (
          <div className="grid h-56 w-full place-items-center sm:h-72">
            <ItemThumb name={item.name} size="lg" className="h-24 w-24" />
          </div>
        )}
        <button
          onClick={toggleFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? t('product.removeFavorite') : t('product.addFavorite')}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-card text-muted-foreground shadow-card hover:text-brand-400"
        >
          <Heart size={18} className={isFavorite ? 'fill-brand-500 text-brand-500' : ''} aria-hidden="true" />
        </button>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-foreground">{item.name}</h1>
        {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
        <p className="mt-2 text-lg font-extrabold text-brand-400">
          {item.is_customizable_pizza || (hasVariantChoice && !selectedVariant) ? t('product.from') : ''}
          {formatCurrency(displayPrice)}
        </p>
        {/* Variante elegida, bien visible junto al precio — igual que
            pide la tarea ("Soda en lata / Coca-Cola / $1.75"), no solo
            marcada dentro de la lista de abajo. */}
        {selectedVariant && <p className="mt-0.5 text-sm font-semibold text-foreground">{selectedVariant.name}</p>}
      </div>

      {item.is_customizable_pizza ? (
        <div className="space-y-6">
          <SizePicker sizes={sizes} value={builder.sizeId} onChange={builder.setSizeId} />
          <CrustPicker crusts={crusts} value={builder.crustId} onChange={builder.setCrustId} />
          <SaucePicker
            sauces={sauces}
            value={builder.sauceId}
            quantityLevel={builder.sauceQuantityLevel}
            onChange={builder.setSauceId}
            onQuantityChange={builder.setSauceQuantityLevel}
          />
          <ToppingPicker
            toppings={toppings}
            selectedIds={builder.toppingIds}
            levels={builder.toppingLevels}
            freeRemaining={builder.freeRemaining}
            onToggle={builder.toggleTopping}
            onLevelChange={builder.setToppingLevel}
          />
        </div>
      ) : hasVariantChoice ? (
        <section>
          <h3 className="mb-2.5 text-sm font-bold text-foreground">{t('product.chooseFlavor')}</h3>
          <VariantOptionList variants={variants} value={variantId} onChange={setVariantId} ariaLabel={t('product.chooseFlavor')} />
        </section>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-card p-3">
          <PizzaIcon size={18} className="text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">{t('product.quantityLabel')}</span>
        </div>
      )}

      {/* bottom-20 (no bottom-4): deja libre el alto del tab bar fijo del
          layout de cliente — si no, esta barra queda tapada detrás de él. */}
      <div className="sticky bottom-20 z-10 mt-6 rounded-full bg-ink-900 p-2 shadow-pop">
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
            disabled={hasVariantChoice && !selectedVariant}
          >
            {added
              ? t('product.added')
              : hasVariantChoice && !selectedVariant
                ? t('product.chooseFlavorPrompt')
                : `${t('product.addButton')} · ${formatCurrency(displayPrice * quantity)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
