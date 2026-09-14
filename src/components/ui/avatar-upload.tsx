'use client'

// Avatar con edición propia — tocar la foto abre una hoja con
// Subir/Cambiar/Quitar; elegir un archivo pasa a un diálogo de recorte
// (arrastrar para reencuadrar dentro de un círculo) antes de subir. Un
// solo componente reusado en el perfil del cliente y en el sidebar de
// cocina/gerencia/conductor (company/(protected)/layout.tsx) — mismo
// flujo para los tres tipos de usuario, ver profiles.avatar_url (columna
// compartida por clientes y staff).
//
// Sube a Supabase Storage (bucket "avatars", RLS: cada usuario solo puede
// escribir dentro de `avatars/<su propio auth.uid()>/...", ver migración
// create_avatars_storage_bucket) en vez de guardar el binario en la base
// — el recorte siempre se recomprime a JPEG en <canvas> antes de subir,
// así que la ruta es siempre `<userId>/avatar.jpg`: "cambiar foto" pisa
// el archivo anterior (upsert) en vez de acumular uno nuevo por cada
// cambio, y esa misma recompresión resuelve de paso el límite de tamaño
// (una foto de 20MB queda igual de liviana que una de 200KB) sin
// necesidad de rechazar imágenes grandes de entrada, solo archivos
// absurdos (ver MAX_AVATAR_FILE_BYTES en lib/avatar.ts).
import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { Camera, Loader2, Trash2, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  ACCEPTED_AVATAR_TYPES,
  AVATAR_OUTPUT_SIZE,
  avatarStoragePath,
  clampPercent,
  computeCoverCropRect,
  validateAvatarFile,
} from '@/lib/avatar'

// Lado del marco cuadrado de la vista previa en pantalla — el recorte
// exportado sale en AVATAR_OUTPUT_SIZE sin importar este valor (ver nota
// en cropToJpegBlob: la ventana relativa de recorte no depende del
// tamaño del marco, solo del %X/%Y elegido).
const CROP_FRAME_SIZE = 260

interface AvatarUploadProps {
  userId: string
  url: string | null
  name?: string | null
  email?: string | null
  /** Diámetro del círculo visible, en px — el diálogo de recorte es
   *  siempre del mismo tamaño; esto solo cambia el disparador. */
  size?: number
  onUpdated: (url: string | null) => void
}

function initialsFor(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email || ''
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

type CropStep = 'idle' | 'crop' | 'uploading'

export function AvatarUpload({ userId, url, name, email, size = 80, onUpdated }: AvatarUploadProps) {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [step, setStep] = useState<CropStep>('idle')
  const [error, setError] = useState<string | null>(null)

  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [dragging, setDragging] = useState(false)
  const dragOrigin = useRef<{ x: number; y: number; pos: { x: number; y: number } } | null>(null)

  const showBadge = size >= 56

  function resetCropState() {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setObjectUrl(null)
    setNaturalSize(null)
    setPosition({ x: 50, y: 50 })
  }

  // Limpia el object URL si el componente se desmonta con un recorte
  // a medio hacer (navegar fuera de la página sin cancelar).
  useEffect(() => () => resetCropState(), []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite elegir el mismo archivo dos veces seguidas
    if (!file) return
    const problem = validateAvatarFile(file)
    if (problem) {
      toast({ title: t(problem === 'invalid-type' ? 'avatarUpload.invalidType' : 'avatarUpload.tooLarge'), variant: 'error' })
      return
    }
    resetCropState()
    setError(null)
    setObjectUrl(URL.createObjectURL(file))
    setStep('crop')
  }

  function handleImageLoad(e: SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
  }

  function beginDrag(clientX: number, clientY: number) {
    dragOrigin.current = { x: clientX, y: clientY, pos: position }
    setDragging(true)
  }

  function applyDrag(clientX: number, clientY: number) {
    if (!dragOrigin.current || !naturalSize) return
    const scale = Math.max(CROP_FRAME_SIZE / naturalSize.w, CROP_FRAME_SIZE / naturalSize.h)
    const rangeX = naturalSize.w * scale - CROP_FRAME_SIZE
    const rangeY = naturalSize.h * scale - CROP_FRAME_SIZE
    const dx = clientX - dragOrigin.current.x
    const dy = clientY - dragOrigin.current.y
    setPosition({
      x: rangeX > 0 ? clampPercent(dragOrigin.current.pos.x - (dx / rangeX) * 100) : 50,
      y: rangeY > 0 ? clampPercent(dragOrigin.current.pos.y - (dy / rangeY) * 100) : 50,
    })
  }

  // Listeners en window mientras se arrastra con mouse — sin esto, soltar
  // el botón fuera del marco circular (algo muy fácil de hacer arrastrando
  // rápido) dejaba el drag "pegado" porque mouseup nunca llegaba a un
  // elemento que ya no tiene el puntero encima. El touch no necesita esto:
  // los eventos táctiles siguen llegando al mismo elemento hasta soltar.
  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      applyDrag(e.clientX, e.clientY)
    }
    function onUp() {
      setDragging(false)
      dragOrigin.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  async function handleConfirmCrop() {
    if (!objectUrl || !naturalSize) return
    setStep('uploading')
    setError(null)
    try {
      const blob = await cropToJpegBlob(objectUrl, position)
      const path = avatarStoragePath(userId)
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // La ruta es siempre la misma (mismo nombre de archivo) — sin
      // cache-bust, el navegador (y cualquier <img> ya montado en otra
      // pantalla) seguiría mostrando la versión vieja desde caché después
      // de "cambiar foto" aunque el archivo en Storage ya haya cambiado.
      const bustedUrl = `${data.publicUrl}?v=${Date.now()}`
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: bustedUrl }).eq('id', userId)
      if (dbErr) throw dbErr

      onUpdated(bustedUrl)
      resetCropState()
      setStep('idle')
    } catch {
      setError(t('avatarUpload.uploadError'))
      setStep('crop')
    }
  }

  function handleCancelCrop() {
    resetCropState()
    setStep('idle')
    setError(null)
  }

  async function handleRemove() {
    setMenuOpen(false)
    setRemoving(true)
    try {
      // Best-effort: si el archivo ya no está (o nunca existió), el borrado
      // en Storage puede fallar sin que eso deba impedir limpiar la
      // referencia en profiles, que es la fuente de verdad de "¿hay foto?".
      await supabase.storage.from('avatars').remove([avatarStoragePath(userId)])
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
      if (dbErr) throw dbErr
      onUpdated(null)
    } catch {
      toast({ title: t('avatarUpload.removeError'), variant: 'error' })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        disabled={removing}
        className="group relative shrink-0 rounded-full transition disabled:opacity-70"
        style={{ width: size, height: size }}
        aria-label={t('avatarUpload.editAria')}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full rounded-full object-cover ring-2 ring-border" />
        ) : (
          <span
            className="grid h-full w-full place-items-center rounded-full bg-brand-500 font-extrabold text-white"
            style={{ fontSize: Math.round(size * 0.32) }}
          >
            {initialsFor(name, email)}
          </span>
        )}
        {removing ? (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
            <Loader2 size={Math.round(size * 0.3)} className="animate-spin text-white" aria-hidden="true" />
          </span>
        ) : (
          showBadge && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-card text-foreground shadow-card transition group-hover:bg-accent">
              <Camera size={12} aria-hidden="true" />
            </span>
          )
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AVATAR_TYPES.join(',')}
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Paso 1: Subir/Cambiar/Quitar — hoja inferior, mismo patrón nativo
          de mobile que ya usa el menú de Conductor. */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <SheetTitle className="mb-4 text-center text-sm font-extrabold text-foreground">
            {t('avatarUpload.sheetTitle')}
          </SheetTitle>
          <div className="space-y-2">
            <Button
              fullWidth
              variant="secondary"
              onClick={() => {
                setMenuOpen(false)
                fileInputRef.current?.click()
              }}
            >
              <Upload size={16} aria-hidden="true" /> {url ? t('avatarUpload.changePhoto') : t('avatarUpload.uploadPhoto')}
            </Button>
            {url && (
              <Button
                fullWidth
                variant="secondary"
                className="text-danger-500 hover:text-danger-500"
                onClick={() => {
                  if (confirm(t('avatarUpload.confirmRemove'))) handleRemove()
                  else setMenuOpen(false)
                }}
              >
                <Trash2 size={16} aria-hidden="true" /> {t('avatarUpload.removePhoto')}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Paso 2: reencuadrar (arrastrar dentro del círculo) + confirmar. */}
      <Dialog open={step !== 'idle'} onOpenChange={(open) => !open && step !== 'uploading' && handleCancelCrop()}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-1 text-lg font-extrabold text-foreground">{t('avatarUpload.adjustTitle')}</DialogTitle>
            <p className="mb-4 text-xs text-muted-foreground">{t('avatarUpload.dragToReposition')}</p>

            {objectUrl && (
              <div
                className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-muted"
                style={{ width: CROP_FRAME_SIZE, height: CROP_FRAME_SIZE, cursor: dragging ? 'grabbing' : 'grab' }}
                onMouseDown={(e) => step === 'crop' && beginDrag(e.clientX, e.clientY)}
                onTouchStart={(e) => step === 'crop' && beginDrag(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => step === 'crop' && applyDrag(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={() => (dragOrigin.current = null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={objectUrl}
                  alt=""
                  draggable={false}
                  onLoad={handleImageLoad}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: `${position.x}% ${position.y}%` }}
                />
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 text-center text-xs font-semibold text-danger-500">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <Button fullWidth variant="secondary" onClick={handleCancelCrop} disabled={step === 'uploading'}>
                {t('common.cancel')}
              </Button>
              <Button fullWidth onClick={handleConfirmCrop} disabled={step === 'uploading' || !naturalSize}>
                {step === 'uploading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t('avatarUpload.uploading')}
                  </>
                ) : (
                  t('avatarUpload.savePhoto')
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Recompone la imagen elegida en un JPEG cuadrado de AVATAR_OUTPUT_SIZE,
 *  recortado exactamente donde lo muestra la vista previa (mismo %X/%Y). */
async function cropToJpegBlob(objectUrl: string, position: { x: number; y: number }): Promise<Blob> {
  const img = new Image()
  img.src = objectUrl
  if (!img.complete) {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image load failed'))
    })
  }
  const { sx, sy, sWidth, sHeight } = computeCoverCropRect(
    img.naturalWidth,
    img.naturalHeight,
    AVATAR_OUTPUT_SIZE,
    position.x,
    position.y
  )
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_OUTPUT_SIZE
  canvas.height = AVATAR_OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas not supported')
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9)
  })
}
