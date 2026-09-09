// Edge Function: import-product-image
//
// Descarga una imagen desde una URL externa (p. ej. la que devuelve una
// generación de IA) y la sube a Supabase Storage — todo del lado del
// servidor de Supabase, que sí tiene salida a internet general (a
// diferencia del entorno donde corre este agente). Se invoca una sola
// vez por imagen, manualmente, para poblar `menu_items.image_url`;
// no es parte de ningún flujo de usuario final y por eso exige el
// mismo secreto compartido que send-order-email en vez de JWT.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  const { data: expectedSecret } = await admin.rpc('get_decrypted_secret', {
    secret_name: 'order_email_webhook_secret',
  })
  const providedSecret = req.headers.get('x-webhook-secret')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ error: 'No autorizado.' }, 401)
  }

  let body: { source_url?: string; storage_path?: string; bucket?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo inválido.' }, 400)
  }
  const { source_url: sourceUrl, storage_path: storagePath, bucket = 'menu-images' } = body
  if (!sourceUrl || !storagePath) return json({ error: 'Falta source_url o storage_path.' }, 400)

  const imgRes = await fetch(sourceUrl)
  if (!imgRes.ok) return json({ error: `No se pudo descargar la imagen (${imgRes.status}).` }, 502)
  const contentType = imgRes.headers.get('content-type') ?? 'image/png'
  const bytes = new Uint8Array(await imgRes.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(storagePath, bytes, { contentType, upsert: true })
  if (uploadError) return json({ error: `Error al subir a Storage: ${uploadError.message}` }, 500)

  const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(storagePath)
  return json({ uploaded: true, url: publicUrlData.publicUrl })
})
