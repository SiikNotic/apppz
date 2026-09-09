'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteRequested, setDeleteRequested] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setPhone(profile?.phone ?? '')
  }, [profile])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', user.id)
    setSaving(false)
    if (error) return setError(error.message)
    setSaved(true)
    await refreshProfile()
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{t('account.profileTitle')}</h1>
        <p className="text-sm text-ink-400">{t('account.profileSubtitle')}</p>
      </div>

      <Card className="max-w-lg space-y-4 p-6">
        <div>
          <Label htmlFor="profile-email">{t('auth.email')}</Label>
          <Input id="profile-email" value={user?.email ?? ''} disabled />
        </div>
        <div>
          <Label htmlFor="profile-name">{t('auth.fullName')}</Label>
          <Input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="profile-phone">{t('auth.phone')}</Label>
          <Input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-xs font-semibold text-danger-500">{error}</p>}
        {saved && <p role="status" className="text-xs font-semibold text-success-500">{t('account.savedChanges')}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('account.saving') : t('account.saveChanges')}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut()
              router.push('/')
            }}
          >
            {t('nav.signOut')}
          </Button>
        </div>
      </Card>

      <Card className="max-w-lg space-y-3 p-6">
        <h2 className="text-sm font-bold text-ink-900">{t('account.deleteAccountTitle')}</h2>
        <p className="text-xs text-ink-400">{t('account.deleteAccountDesc')}</p>
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
            <DialogTitle className="mb-2 text-lg font-extrabold text-ink-900">
              {t('account.deleteConfirmTitle')}
            </DialogTitle>
            <p className="mb-4 text-sm text-ink-600">{t('account.deleteConfirmDesc')}</p>
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
