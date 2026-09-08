import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { FieldLabel, Input } from '../../../components/ui/Input'
import type { Category } from '../../../lib/types'

const EMPTY = { name: '', sort_order: '0' }

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('categories').select('*').order('sort_order')
    if (!error) setCategories(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ name: '', sort_order: String(categories.length) })
    setError(null)
    setFormOpen(true)
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id)
    setForm({ name: cat.name, sort_order: String(cat.sort_order) })
    setError(null)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    const payload = { name: form.name.trim(), sort_order: Number(form.sort_order) || 0 }
    const { error } = editingId
      ? await supabase.from('categories').update(payload).eq('id', editingId)
      : await supabase.from('categories').insert(payload)
    setSaving(false)
    if (error) return setError(error.message)
    setFormOpen(false)
    load()
  }

  async function toggleActive(cat: Category) {
    await supabase.from('categories').update({ active: !cat.active }).eq('id', cat.id)
    load()
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"? Los productos quedarán sin categoría.`))
      return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (!error) load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-ink-900">Categorías</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Categoría
        </Button>
      </div>

      <Card className="divide-y divide-ink-100 p-0">
        {loading && <p className="p-5 text-sm text-ink-400">Cargando…</p>}
        {!loading && categories.length === 0 && (
          <p className="p-5 text-sm text-ink-400">Sin categorías todavía.</p>
        )}
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-ink-900">{cat.name}</span>
              <span className="text-xs text-ink-400">orden {cat.sort_order}</span>
              <button onClick={() => toggleActive(cat)}>
                <Badge tone={cat.active ? 'success' : 'neutral'}>
                  {cat.active ? 'Activa' : 'Inactiva'}
                </Badge>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openEdit(cat)}
                className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(cat)}
                className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} widthClass="max-w-sm">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-extrabold text-ink-900">
            {editingId ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <div className="space-y-3">
            <div>
              <FieldLabel>Nombre</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Orden</FieldLabel>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </div>
            {error && <p className="text-xs font-semibold text-danger-500">{error}</p>}
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
