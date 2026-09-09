// Edge Function: manage-staff-status
//
// Despide o reactiva una cuenta de staff. Espeja el patrón de
// create-staff-user: valida el permiso del que llama contra la base de
// datos (nunca confía en un rol que el cliente diga tener) y solo
// entonces usa la service_role para actuar.
//
// La revocación es real, no cosmética:
//   1. `auth.admin.updateUserById(id, { ban_duration })` — bloquea a nivel
//      de Supabase Auth: un token ya emitido puede seguir siendo válido
//      hasta que expire (normal, ~1h), pero no puede iniciar sesión de
//      nuevo ni refrescar el token.
//   2. `profiles.company_role = null` — has_permission() hace
//      `join role_permissions rp on rp.role = p.company_role`, así que con
//      company_role en null NINGÚN permiso hace match nunca más. Esto es
//      lo que de verdad bloquea cada RLS/RPC protegido, no el ban por sí
//      solo (que solo cubre login/refresh, no una sesión ya activa).
// El perfil NUNCA se borra — se conserva para historial/auditoría
// (pedidos, puntos, logs ya están vinculados a su id) y se marca con
// terminated_at/terminated_by en vez de desaparecer.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const ALLOWED_ROLES = ['admin', 'manager', 'kitchen', 'cashier', 'driver', 'staff'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

// Duración de ban "permanente" — GoTrue no tiene un valor literal "para
// siempre", así que se usa una duración muy larga (100 años); 'none'
// revierte el ban al reactivar.
const PERMANENT_BAN = '876000h'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autenticado.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user: caller },
    error: userError,
  } = await callerClient.auth.getUser()
  if (userError || !caller) return json({ error: 'No autenticado.' }, 401)

  const { data: allowed, error: permError } = await callerClient.rpc('has_permission', {
    perm: 'staff.manage',
  })
  if (permError || !allowed) {
    return json({ error: 'No tienes permiso para administrar personal.' }, 403)
  }

  let body: { user_id?: string; action?: 'terminate' | 'reactivate' | 'change_role'; role?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo de la solicitud inválido.' }, 400)
  }

  const targetId = body.user_id
  const action = body.action
  if (!targetId) return json({ error: 'Falta user_id.' }, 400)
  if (action !== 'terminate' && action !== 'reactivate' && action !== 'change_role') {
    return json({ error: 'Acción inválida.' }, 400)
  }
  if (targetId === caller.id) return json({ error: 'No puedes aplicarte esta acción a ti mismo.' }, 400)

  const adminClient = createClient(supabaseUrl, serviceKey)

  const { data: target, error: targetError } = await adminClient
    .from('profiles')
    .select('id, company_role, is_company_staff')
    .eq('id', targetId)
    .maybeSingle()
  if (targetError || !target) return json({ error: 'No se encontró esa cuenta.' }, 404)

  if (action === 'change_role') {
    // Cambia el rol de un empleado ACTIVO sin pasar por despedir+
    // reactivar (que además banea/desbanea la cuenta de Auth — un
    // efecto secundario que no tiene sentido para un simple ascenso o
    // reasignación). Mismas protecciones que reactivate: nunca a/desde
    // Owner por este camino, nunca sobre uno mismo (ya validado arriba).
    if (target.company_role === 'owner') {
      return json({ error: 'No se puede cambiar el rol de un Owner desde aquí.' }, 400)
    }
    if (!target.is_company_staff || target.company_role === null) {
      return json({ error: 'Esa cuenta no está activa. Reactívala primero.' }, 400)
    }
    const role = body.role as AllowedRole
    if (!ALLOWED_ROLES.includes(role)) return json({ error: 'Rol inválido.' }, 400)

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ company_role: role })
      .eq('id', targetId)
    if (profileError) return json({ error: 'No se pudo actualizar el rol.' }, 500)

    if (role === 'driver') {
      await adminClient.from('drivers').upsert({ user_id: targetId, status: 'offline' })
    }

    await adminClient.from('audit_logs').insert({
      actor_id: caller.id,
      action: 'staff.change_role',
      entity_type: 'profile',
      entity_id: targetId,
      before: { company_role: target.company_role },
      after: { company_role: role },
    })

    return json({ changed: true, role })
  }

  if (action === 'terminate') {
    if (target.company_role === 'owner') {
      return json({ error: 'No se puede despedir a un Owner desde aquí.' }, 400)
    }

    const { error: banError } = await adminClient.auth.admin.updateUserById(targetId, {
      ban_duration: PERMANENT_BAN,
    })
    if (banError) return json({ error: 'No se pudo revocar el acceso de la cuenta.' }, 500)

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ company_role: null, terminated_at: new Date().toISOString(), terminated_by: caller.id })
      .eq('id', targetId)
    if (profileError) return json({ error: 'No se pudo actualizar el perfil.' }, 500)

    // Si era conductor, que no quede "disponible" fantasma en el pool.
    await adminClient.from('drivers').update({ status: 'offline' }).eq('user_id', targetId)

    await adminClient.from('audit_logs').insert({
      actor_id: caller.id,
      action: 'staff.terminate',
      entity_type: 'profile',
      entity_id: targetId,
      before: { company_role: target.company_role },
    })

    return json({ terminated: true })
  }

  // action === 'reactivate'
  const role = body.role as AllowedRole
  if (!ALLOWED_ROLES.includes(role)) return json({ error: 'Rol inválido para reactivar.' }, 400)

  const { error: unbanError } = await adminClient.auth.admin.updateUserById(targetId, {
    ban_duration: 'none',
  })
  if (unbanError) return json({ error: 'No se pudo reactivar el acceso de la cuenta.' }, 500)

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ company_role: role, is_company_staff: true, terminated_at: null, terminated_by: null })
    .eq('id', targetId)
  if (profileError) return json({ error: 'No se pudo actualizar el perfil.' }, 500)

  if (role === 'driver') {
    await adminClient.from('drivers').upsert({ user_id: targetId, status: 'offline' })
  }

  await adminClient.from('audit_logs').insert({
    actor_id: caller.id,
    action: 'staff.reactivate',
    entity_type: 'profile',
    entity_id: targetId,
    after: { role },
  })

  return json({ reactivated: true, role })
})
