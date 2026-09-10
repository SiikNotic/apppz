import { supabase } from '@/lib/supabase'
import type { Address } from '@/lib/types'
import type { AddressInput } from '@/lib/validation/address.schema'

export async function fetchUserAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createAddress(userId: string, input: AddressInput): Promise<Address> {
  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: userId,
      label: input.label,
      street: input.street,
      apartment: input.apartment || null,
      city: input.city,
      state: input.state,
      zip: input.zip,
      instructions: input.instructions || null,
      access_code: input.accessCode || null,
      delivery_notes: input.deliveryNotes || null,
      dog_warning: input.dogWarning,
      contact_preference: input.contactPreference,
      is_default: input.isDefault,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  const { data, error } = await supabase
    .from('addresses')
    .update({
      label: input.label,
      street: input.street,
      apartment: input.apartment,
      city: input.city,
      state: input.state,
      zip: input.zip,
      instructions: input.instructions,
      access_code: input.accessCode,
      delivery_notes: input.deliveryNotes,
      dog_warning: input.dogWarning,
      contact_preference: input.contactPreference,
      is_default: input.isDefault,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', id)
  if (error) throw error
}
