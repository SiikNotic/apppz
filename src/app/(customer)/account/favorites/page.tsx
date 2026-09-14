'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ItemThumb } from '@/components/ui/item-thumb'
import { formatCurrency } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Favorite, MenuItem } from '@/lib/types'

export default function FavoritesPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [products, setProducts] = useState<Record<string, MenuItem>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    async function load() {
      const { data: favs } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user!.id)
        .eq('target_type', 'product')
      if (!active) return
      const list = favs ?? []
      setFavorites(list)
      if (list.length > 0) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('*')
          .in('id', list.map((f) => f.target_id))
        const map: Record<string, MenuItem> = {}
        for (const item of items ?? []) map[item.id] = item
        setProducts(map)
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [user])

  async function removeFavorite(favoriteId: string) {
    await supabase.from('favorites').delete().eq('id', favoriteId)
    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{t('account.favoritesTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('account.favoritesSubtitle')}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : favorites.length === 0 ? (
        <EmptyState icon={<Heart size={28} aria-hidden="true" />} message={t('account.noFavorites')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {favorites.map((fav) => {
            const item = products[fav.target_id]
            if (!item) return null
            return (
              <Card key={fav.id} className="flex items-center gap-3 p-3.5">
                <ItemThumb name={item.name} imageUrl={item.image_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                  <p className="text-sm font-semibold text-brand-400">{formatCurrency(item.base_price)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeFavorite(fav.id)}>
                  {t('account.remove')}
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
