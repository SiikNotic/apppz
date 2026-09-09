'use client'

// Alerta de "llegó un pedido nuevo" para pantallas administrativas
// (Cocina, Orders). No usa ningún archivo de audio externo — genera un
// beep corto con Web Audio API, así que no hay ningún asset nuevo que
// mantener ni descargar. Los navegadores bloquean audio antes de que la
// persona haya interactuado con la página al menos una vez; por eso
// expone `needsUnlock`/`unlock()` para pedir ese primer gesto con un
// botón visible, en vez de fallar en silencio.
import { useEffect, useRef, useState } from 'react'

function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.35)
    oscillator.onended = () => ctx.close()
    return true
  } catch {
    return false
  }
}

/**
 * @param ids Los ids que actualmente califican como "pedido nuevo que
 *   necesita atención" (p. ej. todos los que están en status='confirmed').
 */
export function useNewOrderAlert(ids: string[]) {
  const seenRef = useRef<Set<string> | null>(null)
  const [alertActive, setAlertActive] = useState(false)
  const [needsUnlock, setNeedsUnlock] = useState(false)

  useEffect(() => {
    if (seenRef.current === null) {
      // Primera carga: todo lo que ya está ahí es historial, no "nuevo".
      seenRef.current = new Set(ids)
      return
    }
    const seen = seenRef.current
    const freshIds = ids.filter((id) => !seen.has(id))
    ids.forEach((id) => seen.add(id))
    if (freshIds.length === 0) return

    setAlertActive(true)
    const played = playBeep()
    if (!played) setNeedsUnlock(true)
  }, [ids])

  function unlock() {
    const played = playBeep()
    if (played) setNeedsUnlock(false)
  }

  function dismiss() {
    setAlertActive(false)
  }

  return { alertActive, needsUnlock, unlock, dismiss }
}
