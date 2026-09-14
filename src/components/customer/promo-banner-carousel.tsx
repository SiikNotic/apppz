'use client'

// Rota entre los banners promocionales activos del Home. Con 1 solo banner
// activo se muestra tal cual (sin puntos ni carrusel); con 2+ se arma un
// carrusel horizontal — nunca varios banners grandes apilados uno debajo
// del otro.
//
// Se usa scroll nativo con scroll-snap (mismo patrón que ya usan las
// filas de "Categorías"/"Recomendados" de Home, no-scrollbar + overflow-x-
// auto) en vez de reimplementar el arrastre a mano con eventos de puntero:
// el swipe manual, el momentum y la accesibilidad de teclado/lector de
// pantalla vienen gratis del navegador, y el avance automático es
// simplemente el mismo scrollTo({behavior:'smooth'}) que ya dispararía un
// swipe real — así ambos caminos quedan visualmente idénticos ("transición
// suave" pedida) y nunca se pisan entre sí.
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { PromoBannerHero } from './promo-banner-hero'
import type { BannerWithPromotion } from '@/hooks/usePromoBanner'

// ~5-7s pedido; 6s es el punto medio y evita que se sienta apurado.
const AUTO_ADVANCE_MS = 6000
// Cuánto esperar sin interacción antes de retomar el avance automático —
// suficiente para que alguien mire un par de banners a mano sin que la
// rotación se lo arrebate a mitad de gesto.
const RESUME_DELAY_MS = 5000

export function PromoBannerCarousel({ banners }: { banners: BannerWithPromotion[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  // Ref (no state) para el pausado: lo lee el intervalo de auto-avance en
  // cada tick sin que cambiarlo dispare un re-render ni tenga que
  // recrearse el intervalo.
  const pausedRef = useRef(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bannerCount = banners.length
  const isCarousel = bannerCount > 1

  const pause = useCallback(() => {
    pausedRef.current = true
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }, [])

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false
    }, RESUME_DELAY_MS)
  }, [])

  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }, [])

  // Mantiene el punto activo sincronizado cuando el cambio de slide viene
  // de un swipe manual (el auto-avance ya actualiza el estado él mismo,
  // pero esto cubre ambos caminos con una sola fuente de verdad: la
  // posición real de scroll).
  useEffect(() => {
    const el = trackRef.current
    if (!el || !isCarousel) return
    function onScroll() {
      if (!el) return
      const i = Math.round(el.scrollLeft / el.clientWidth)
      setActiveIndex((prev) => (prev === i ? prev : i))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [isCarousel])

  // Avance automático — nunca corre con 1 solo banner, y respeta el pausado.
  useEffect(() => {
    if (!isCarousel) return
    const id = setInterval(() => {
      if (pausedRef.current) return
      const el = trackRef.current
      if (!el) return
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % bannerCount
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [isCarousel, bannerCount])

  function goTo(i: number) {
    pause()
    scheduleResume()
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  if (bannerCount === 0) return null
  if (!isCarousel) return <PromoBannerHero banner={banners[0]} />

  return (
    <div className="space-y-3">
      <div
        ref={trackRef}
        onPointerDown={pause}
        onPointerUp={scheduleResume}
        onPointerCancel={scheduleResume}
        onTouchStart={pause}
        onTouchEnd={scheduleResume}
        // scroll-snap-type + snap-center en cada slide: el navegador se
        // encarga de "no cambiar de golpe" (rapidly change) y de asentar
        // siempre en un banner completo, nunca a mitad de dos.
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {banners.map((banner) => (
          <div key={banner.id} className="w-full shrink-0 snap-center">
            <PromoBannerHero banner={banner} />
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Promociones" className="flex items-center justify-center gap-1.5">
        {banners.map((banner, i) => (
          <button
            key={banner.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`Promoción ${i + 1} de ${bannerCount}`}
            onClick={() => goTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === activeIndex ? 'w-5 bg-brand-500' : 'w-1.5 bg-border-strong hover:bg-muted-foreground/50'
            )}
          />
        ))}
      </div>
    </div>
  )
}
