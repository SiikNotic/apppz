'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Home, Briefcase, MapPin, Dog } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserAddresses, createAddress, updateAddress, deleteAddress } from '@/lib/data-access/addresses'
import { addressSchema, firstFieldErrors, type AddressInput } from '@/lib/validation/address.schema'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Address } from '@/lib/types'

const EMPTY: AddressInput = {
  label: 'Home',
  street: '',
  apartment: '',
  city: '',
  state: '',
  zip: '',
  instructions: '',
  accessCode: '',
  deliveryNotes: '',
  dogWarning: false,
  contactPreference: 'call',
  isDefault: false,
}

const LABEL_ICON = { Home, Work: Briefcase, Other: MapPin }

export default function AddressesPage() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AddressInput>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddressInput, string>>>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!user) return
    setLoading(true)
    setAddresses(await fetchUserAddresses(user.id))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setFieldErrors({})
    setFormOpen(true)
  }

  function openEdit(address: Address) {
    setEditingId(address.id)
    setForm({
      label: address.label as AddressInput['label'],
      street: address.street,
      apartment: address.apartment ?? '',
      city: address.city,
      state: address.state,
      zip: address.zip,
      instructions: address.instructions ?? '',
      accessCode: address.access_code ?? '',
      deliveryNotes: address.delivery_notes ?? '',
      dogWarning: address.dog_warning,
      contactPreference: (address.contact_preference as AddressInput['contactPreference']) ?? 'call',
      isDefault: address.is_default,
    })
    setFieldErrors({})
    setFormOpen(true)
  }

  async function handleSave() {
    const result = addressSchema.safeParse(form)
    if (!result.success) {
      setFieldErrors(firstFieldErrors(result.error))
      return
    }
    if (!user) return
    setSaving(true)
    try {
      if (editingId) await updateAddress(editingId, result.data)
      else await createAddress(user.id, result.data)
      setFormOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(address: Address) {
    if (!confirm(`¿Eliminar la dirección "${address.label}"?`)) return
    await deleteAddress(address.id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Direcciones</h1>
          <p className="text-sm text-ink-400">Guarda tus lugares frecuentes para pedir más rápido.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} aria-hidden="true" /> Nueva dirección
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Cargando…</p>
      ) : addresses.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-400">Todavía no tienes direcciones guardadas.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => {
            const Icon = LABEL_ICON[address.label as keyof typeof LABEL_ICON] ?? MapPin
            return (
              <Card key={address.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-brand-500" aria-hidden="true" />
                    <span className="text-sm font-bold text-ink-900">{address.label}</span>
                    {address.is_default && <Badge variant="brand">Predeterminada</Badge>}
                    {address.dog_warning && <Dog size={14} className="text-warning-500" aria-label="Cuidado, perro" />}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(address)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                      aria-label={`Editar dirección ${address.label}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(address)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                      aria-label={`Eliminar dirección ${address.label}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-600">
                  {address.street}
                  {address.apartment ? `, ${address.apartment}` : ''}
                </p>
                <p className="text-sm text-ink-600">
                  {address.city}, {address.state} {address.zip}
                </p>
                {address.instructions && <p className="mt-1 text-xs text-ink-400">{address.instructions}</p>}
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {editingId ? 'Editar dirección' : 'Nueva dirección'}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label>Etiqueta</Label>
                <Select value={form.label} onValueChange={(v) => setForm({ ...form, label: v as AddressInput['label'] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Home">Casa</SelectItem>
                    <SelectItem value="Work">Trabajo</SelectItem>
                    <SelectItem value="Other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="addr-street">Calle y número</Label>
                <Input id="addr-street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                {fieldErrors.street && <p role="alert" className="mt-1 text-xs text-danger-500">{fieldErrors.street}</p>}
              </div>
              <div>
                <Label htmlFor="addr-apt">Apartamento / interior (opcional)</Label>
                <Input id="addr-apt" value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="addr-city">Ciudad</Label>
                  <Input id="addr-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="addr-state">Estado</Label>
                  <Input id="addr-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="addr-zip">Código postal</Label>
                <Input id="addr-zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                {fieldErrors.zip && <p role="alert" className="mt-1 text-xs text-danger-500">{fieldErrors.zip}</p>}
              </div>
              <div>
                <Label htmlFor="addr-instructions">Instrucciones de entrega</Label>
                <Textarea
                  id="addr-instructions"
                  rows={2}
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="addr-code">Código de acceso (opcional)</Label>
                <Input id="addr-code" value={form.accessCode} onChange={(e) => setForm({ ...form, accessCode: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">
                <Checkbox checked={form.dogWarning} onCheckedChange={(c) => setForm({ ...form, dogWarning: c === true })} />
                Hay un perro en esta dirección
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">
                <Checkbox checked={form.isDefault} onCheckedChange={(c) => setForm({ ...form, isDefault: c === true })} />
                Usar como dirección predeterminada
              </label>

              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar dirección'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
