// Edge Function: generate-product-image
//
// Backend real para el botón "Generar imagen con IA" del dashboard
// (Problema 5). Valida el permiso del que llama contra la base de
// datos igual que manage-staff-status/create-staff-user — nunca
// confía en que el frontend haya ocultado el botón a un cliente.
//
// Proveedor: Pollinations.ai — se eligió porque es gratis de verdad
// (sin cuenta, sin API key, sin tarjeta) y expone la generación como
// un simple GET. Se cambió desde Gemini (gemini-2.5-flash-image /
// "nano banana") porque Google puso en 0 la cuota gratuita de
// generación de imágenes para ese modelo (confirmado en los logs de
// esta función: RESOURCE_EXHAUSTED con limit:0) — hoy Gemini para
// imágenes requiere facturación activada.
//
// Contrapartida de Pollinations: es un servicio comunitario sin SLA
// (puede estar más lento o caerse) y limita a ~1 solicitud cada 15s en
// el tier anónimo — de sobra para que un empleado genere una foto a la
// vez, pero si el negocio crece y esto se vuelve un cuello de botella,
// conviene reconsiderar un proveedor de pago.
import { createClient } from 'npm:@supabase/supabase-js@2'

const POLLINATIONS_ENDPOINT = 'https://image.pollinations.ai/prompt'

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

  // Pedimos explícitamente foto de producto tipo catálogo (fondo neutro,
  // buena iluminación) además de lo que haya escrito el usuario, para que
  // el resultado combine con el resto de las fotos del menú.
  const fullPrompt = `${prompt}. Fotografía de producto para el menú digital de una pizzería: fondo neutro y liso, buena iluminación de estudio, alta calidad, sin texto ni marcas de agua.`

  const imageUrl =
    `${POLLINATIONS_ENDPOINT}/${encodeURIComponent(fullPrompt)}` +
    `?width=1024&height=1024&nologo=true&model=flux&referrer=nero-pizza-co-dashboard`

  let imgRes: Response
  try {
    imgRes = await fetch(imageUrl)
  } catch {
    return json({ configured: true, error: 'No se pudo contactar al proveedor de generación de imágenes.' }, 502)
  }

  if (!imgRes.ok) {
    const detail = await imgRes.text().catch(() => '')
    console.error('generate-product-image: Pollinations respondió', imgRes.status, detail)
    // El tier anónimo limita a ~1 solicitud cada 15s — un 429 casi
    // siempre significa "espera un momento", no una falla real.
    const message =
      imgRes.status === 429
        ? 'Hay demasiadas solicitudes de generación en este momento. Espera unos segundos e intenta de nuevo.'
        : 'El proveedor de generación de imágenes no pudo procesar la solicitud.'
    return json({ configured: true, error: message }, 502)
  }

  const mimeType = imgRes.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg'
  const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg'
  const bytes = new Uint8Array(await imgRes.arrayBuffer())

  const path = `products/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await adminClient.storage
    .from('menu-images')
    .upload(path, bytes, { contentType: mimeType, upsert: false })

  if (uploadError) {
    console.error('generate-product-image: fallo al subir a Storage', uploadError)
    return json({ configured: true, error: 'La imagen se generó pero no se pudo guardar. Intenta de nuevo.' }, 500)
  }

  const { data: publicUrlData } = adminClient.storage.from('menu-images').getPublicUrl(path)
  return json({ configured: true, url: publicUrlData.publicUrl })
})
