// Edge Function: generate-product-image
//
// Backend real para el botón "Generar imagen con IA" del dashboard
// (Problema 5). Valida el permiso del que llama contra la base de
// datos igual que manage-staff-status/create-staff-user — nunca
// confía en que el frontend haya ocultado el botón a un cliente.
//
// Estado actual: en este proyecto NO hay ninguna clave de API de un
// proveedor de generación de imágenes configurada en Vault (solo existen
// `resend_api_key` y `order_email_webhook_secret`). Las herramientas de
// IA con las que se construyó esta app (usadas por el agente durante el
// desarrollo) no están disponibles para la app en producción — un
// proveedor real de generación de imágenes debe integrarse aquí una vez
// que el negocio provea una clave de API propia.
//
// Por eso esta función, hoy, SIEMPRE responde `configured: false` con un
// mensaje claro en vez de simular una generación falsa. La interfaz del
// dashboard (products-tab.tsx) ya maneja el contrato completo
// (prompt → generando → preview → aceptar/regenerar), así que activar
// esta función en el futuro es solo: guardar la clave del proveedor en
// Vault, y reemplazar el bloque marcado abajo con la llamada real al
// proveedor + subida del resultado a Storage (mismo bucket `menu-images`,
// carpeta `products/`, mismo patrón que import-product-image).
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autenticado.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user: caller },
    error: userError,
  } = await callerClient.auth.getUser()
  if (userError || !caller) return json({ error: 'No autenticado.' }, 401)

  // Mismo permiso que ya protege la escritura del bucket menu-images
  // (storage.objects: "staff manage menu-images"). Un cliente nunca
  // llega a este punto aunque intente invocar la función directamente.
  const { data: allowed, error: permError } = await callerClient.rpc('has_permission', {
    perm: 'media.manage',
  })
  if (permError || !allowed) {
    return json({ error: 'No tienes permiso para generar imágenes.' }, 403)
  }

  let body: { prompt?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo de la solicitud inválido.' }, 400)
  }
  const prompt = body.prompt?.trim()
  if (!prompt) return json({ error: 'Falta el prompt.' }, 400)

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, serviceKey)

  // Existencia (no el valor) de una clave de proveedor de imágenes.
  // Mientras no exista, esta función es honesta sobre no estar
  // configurada en lugar de fabricar una respuesta.
  const { data: apiKey } = await adminClient.rpc('get_decrypted_secret', {
    secret_name: 'image_generation_api_key',
  })

  if (!apiKey) {
    return json({
      configured: false,
      message:
        'La generación de imágenes con IA todavía no está configurada. Un administrador debe añadir una clave de API de un proveedor de generación de imágenes para activar esta función. Mientras tanto, puedes subir la foto manualmente.',
    })
  }

  // --- A partir de aquí iría la integración real con el proveedor una
  // vez exista una clave: llamar a su API con `prompt`, subir la imagen
  // resultante a `menu-images/products/` (mismo bucket que ya usa la
  // subida manual) y devolver su URL pública. No se implementa la
  // llamada en sí porque no hay proveedor/clave real contra el cual
  // verificarla — hacerlo ahora sería fabricar una integración sin
  // poder probarla.
  return json({
    configured: false,
    message: 'Proveedor de generación de imágenes no implementado todavía.',
  })
})
