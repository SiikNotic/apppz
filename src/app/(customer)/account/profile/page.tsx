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

export default function ProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
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
        <h1 className="text-2xl font-extrabold text-ink-900">Perfil</h1>
        <p className="text-sm text-ink-400">Actualiza tu información personal.</p>
      </div>

      <Card className="max-w-lg space-y-4 p-6">
        <div>
          <Label htmlFor="profile-email">Correo</Label>
          <Input id="profile-email" value={user?.email ?? ''} disabled />
        </div>
        <div>
          <Label htmlFor="profile-name">Nombre completo</Label>
          <Input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="profile-phone">Teléfono</Label>
          <Input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-xs font-semibold text-danger-500">{error}</p>}
        {saved && <p role="status" className="text-xs font-semibold text-success-500">Cambios guardados.</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut()
              router.push('/')
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </Card>

      <Card className="max-w-lg space-y-3 p-6">
        <h2 className="text-sm font-bold text-ink-900">Eliminar cuenta</h2>
        <p className="text-xs text-ink-400">
          Esto elimina tu perfil, direcciones y datos personales. Tus pedidos pasados se
          conservan de forma anónima para efectos de contabilidad. No podrás deshacer esta
          acción.
        </p>
        {deleteRequested ? (
          <p role="status" className="text-xs font-semibold text-success-500">
            Solicitud enviada. Nuestro equipo la procesará en los próximos días y te
            confirmaremos por correo.
          </p>
        ) : (
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Solicitar eliminación de cuenta
          </Button>
        )}
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-2 text-lg font-extrabold text-ink-900">
              ¿Eliminar tu cuenta?
            </DialogTitle>
            <p className="mb-4 text-sm text-ink-600">
              Cuéntanos por qué te vas (opcional) y confirma tu solicitud.
            </p>
            <Textarea
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Motivo (opcional)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleRequestDeletion}>
                Confirmar solicitud
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
