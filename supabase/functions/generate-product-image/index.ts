// Edge Function: generate-product-image
//
// Backend real para el botón "Generar imagen con IA" del dashboard
// (Problema 5). Valida el permiso del que llama contra la base de
// datos igual que manage-staff-status/create-staff-user — nunca
// confía en que el frontend haya ocultado el botón a un cliente.
//
// Proveedor: Google Gemini API, modelo gemini-2.5-flash-image ("nano
// banana") — elegido porque tiene un tier gratis generoso (~500
// imágenes/día en AI Studio, sin tarjeta de crédito) y una API REST
// simple de un solo request. La clave se guarda como secreto de Edge
// Functions (Project Settings → Edge Functions → Secrets, o
// `supabase secrets set`) con el nombre `image_generation_api_key` —
// se consigue gratis en https://aistudio.google.com/apikey. Va como
// secreto de función (Deno.env), no en el Vault de la base de datos,
// porque solo lo necesita esta función — nunca se lee desde SQL.
//
// Si el secreto no existe todavía, la función responde `configured:
// false` con un mensaje claro en vez de fabricar una respuesta falsa.
import { createClient } from 'npm:@supabase/supabase-js@2'

const GEMINI_MODEL = 'gemini-2.5-flash-image'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

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
  const apiKey = Deno.env.get('image_generation_api_key')

  if (!apiKey) {
    return json({
      configured: false,
      message:
        'La generación de imágenes con IA todavía no está configurada. Un administrador debe añadir una clave de API de un proveedor de generación de imágenes para activar esta función. Mientras tanto, puedes subir la foto manualmente.',
    })
  }

  // Pedimos explícitamente foto de producto tipo catálogo (fondo neutro,
  // buena iluminación) además de lo que haya escrito el usuario, para que
  // el resultado combine con el resto de las fotos del menú.
  const fullPrompt = `${prompt}. Fotografía de producto para el menú digital de una pizzería: fondo neutro y liso, buena iluminación de estudio, alta calidad, sin texto ni marcas de agua.`

  let geminiRes: Response
  try {
    geminiRes = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
    })
  } catch {
    return json({ configured: true, error: 'No se pudo contactar al proveedor de generación de imágenes.' }, 502)
  }

  if (!geminiRes.ok) {
    // No repetimos el body del proveedor tal cual (puede filtrar detalles
    // internos) — solo lo suficiente para diagnosticar en logs.
    console.error('generate-product-image: Gemini respondió', geminiRes.status, await geminiRes.text())
    return json(
      { configured: true, error: 'El proveedor de generación de imágenes no pudo procesar la solicitud.' },
      502
    )
  }

  const geminiBody = await geminiRes.json()
  const parts = geminiBody?.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: { inlineData?: { data?: string } }) => p?.inlineData?.data)

  if (!imagePart) {
    console.error('generate-product-image: respuesta de Gemini sin imagen', JSON.stringify(geminiBody))
    return json({ configured: true, error: 'El proveedor no devolvió ninguna imagen. Intenta con otra descripción.' }, 502)
  }

  const mimeType: string = imagePart.inlineData.mimeType ?? 'image/png'
  const ext = mimeType.split('/')[1]?.split('+')[0] || 'png'
  const base64 = imagePart.inlineData.data as string
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

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
