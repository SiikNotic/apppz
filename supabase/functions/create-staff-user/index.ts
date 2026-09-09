// Edge Function: create-staff-user
//
// Crea una cuenta de staff (cocinero, conductor, cajero, etc.) desde el
// dashboard de compañía. Esto NO puede hacerse desde el navegador con la
// anon key: crear un usuario de Auth y confirmarlo directamente requiere
// la service_role key, que nunca debe llegar al bundle del cliente. Esta
// función corre en el servidor de Supabase, valida el permiso del que
// llama (staff.manage) contra la base de datos, y solo entonces usa la
// service_role internamente.
//
// Desplegado con: supabase functions deploy create-staff-user
// (o vía el MCP de Supabase — así se desplegó la primera vez).
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ROLES = ['admin', 'manager', 'kitchen', 'cashier', 'driver', 'staff'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autenticado.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Cliente "como el que llama" (respeta RLS) — solo para verificar permiso.
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

  let body: {
    email?: string
    password?: string
    full_name?: string
    role?: string
    vehicle_type?: string
    license_plate?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo de la solicitud inválido.' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''
  const fullName = body.full_name?.trim()
  const role = body.role as AllowedRole

  if (!email || !email.includes('@')) return json({ error: 'Correo inválido.' }, 400)
  if (password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400)
  if (!fullName) return json({ error: 'El nombre es obligatorio.' }, 400)
  if (!ALLOWED_ROLES.includes(role)) return json({ error: 'Rol inválido.' }, 400)

  // Cliente con privilegios de administrador — nunca expuesto al navegador.
  const adminClient = createClient(supabaseUrl, serviceKey)

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError || !created.user) {
    const message = createError?.message?.includes('already been registered')
      ? 'Ese correo ya tiene una cuenta.'
      : 'No se pudo crear la cuenta. Intenta de nuevo.'
    return json({ error: message }, 400)
  }

  const newUserId = created.user.id

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ is_company_staff: true, company_role: role, full_name: fullName })
    .eq('id', newUserId)

  if (profileError) {
    // El usuario de Auth ya existe pero no quedó marcado como staff — lo
    // limpiamos para no dejar una cuenta a medias.
    await adminClient.auth.admin.deleteUser(newUserId)
    return json({ error: 'No se pudo configurar el rol del nuevo usuario.' }, 500)
  }

  if (role === 'driver') {
    await adminClient.from('drivers').upsert({
      user_id: newUserId,
      vehicle_type: body.vehicle_type ?? null,
      license_plate: body.license_plate ?? null,
      status: 'offline',
    })
  }

  await adminClient.from('audit_logs').insert({
    actor_id: caller.id,
    action: 'staff.create',
    entity_type: 'profile',
    entity_id: newUserId,
    after: { email, full_name: fullName, role },
  })

  return json({ id: newUserId, email, full_name: fullName, role })
})
