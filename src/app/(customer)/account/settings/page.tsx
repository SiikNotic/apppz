'use client'

// Configuración de cuenta — antes estas piezas (idioma, compartir,
// eliminar cuenta, cerrar sesión) vivían apretadas al fondo de /profile;
// ahora tienen su propia pantalla, dejando /profile como identidad +
// navegación pura. Ninguna lógica nueva: mismas queries/RPCs que ya
// existían (account_deletion_requests, signOut de AuthContext).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Share2, LogOut, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/contexts/LanguageContext'
import { BASE_PATH } from '@/lib/base-path'
import { BRAND_NAME } from '@/lib/config'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  const [shareNotice, setShareNotice] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteRequested, setDeleteRequested] = useState(false)

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

  async function handleRequestDeletion() {
    if (!user) return
    await supabase.from('account_deletion_requests').insert({
      user_id: user.id,
      reason: deleteReason.trim() || null,
    })
    setDeleteOpen(false)
    setDeleteRequested(true)
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

      <button
        type="button"
        onClick={async () => {
          await signOut()
          router.push('/')
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-danger-500/10 px-4 py-3.5 text-sm font-bold text-danger-500 hover:bg-danger-500/15"
      >
        <LogOut size={16} aria-hidden="true" /> {t('nav.signOut')}
      </button>

      <Card className="space-y-3 p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Trash2 size={14} className="text-danger-500" aria-hidden="true" /> {t('account.deleteAccountTitle')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('account.deleteAccountDesc')}</p>
        {deleteRequested ? (
          <p role="status" className="text-xs font-semibold text-success-500">
            {t('account.deleteRequested')}
          </p>
        ) : (
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t('account.requestDeletion')}
          </Button>
        )}
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-2 text-lg font-extrabold text-foreground">{t('account.deleteConfirmTitle')}</DialogTitle>
            <p className="mb-4 text-sm text-muted-foreground">{t('account.deleteConfirmDesc')}</p>
            <Textarea
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder={t('account.deleteReasonPlaceholder')}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleRequestDeletion}>
                {t('account.confirmRequest')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
