'use client'

// Configuración de cuenta — preferencias puras (idioma, compartir la
// app). Cerrar sesión y Eliminar cuenta se movieron a /account/profile
// (sección "Cuenta", cerca del final): pedir que alguien entre acá para
// encontrarlas las dejaba un paso más adentro de lo que deberían estar
// para dos acciones que se buscan bajo presión. Ninguna lógica nueva acá
// tampoco: esta pantalla nunca tuvo una fuente de verdad propia para eso,
// solo montaba los mismos botones/diálogo que ahora vive en Profile.
import { useState } from 'react'
import { Globe, Share2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/contexts/LanguageContext'
import { BASE_PATH } from '@/lib/base-path'
import { BRAND_NAME } from '@/lib/config'

export default function SettingsPage() {
  const { t } = useLanguage()

  const [shareNotice, setShareNotice] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}${BASE_PATH}/`
    const shareData = { title: BRAND_NAME, text: t('account.shareText'), url }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // El usuario canceló el share sheet — no es un error real.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareNotice(true)
      setTimeout(() => setShareNotice(false), 2500)
    } catch {
      // Clipboard no disponible — no hay más respaldo razonable.
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{t('account.settingsTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('account.settingsSubtitle')}</p>
      </div>

      <div>
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t('account.sectionPreferences')}
        </p>
        <Card className="divide-y divide-border overflow-hidden p-0">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-muted-foreground">
              <Globe size={18} aria-hidden="true" />
            </span>
            <span className="flex-1 text-sm font-bold text-foreground">{t('nav.language')}</span>
            <LanguageToggle />
          </div>
          <button type="button" onClick={handleShare} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-accent">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-muted-foreground">
              <Share2 size={18} aria-hidden="true" />
            </span>
            <span className="flex-1 text-sm font-bold text-foreground">{t('account.rowShare')}</span>
          </button>
        </Card>
        {shareNotice && <p className="mt-2 px-1 text-xs font-semibold text-success-500">{t('account.shareCopied')}</p>}
      </div>
    </div>
  )
}
