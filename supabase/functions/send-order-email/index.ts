// Edge Function: send-order-email
//
// Envía los correos transaccionales reales de un pedido (confirmación al
// crearse, aviso al cambiar de estado) usando Resend. Se invoca desde un
// trigger de Postgres en la tabla `orders` (ver migración
// notify_order_email), nunca directo desde el navegador — así un pedido
// creado desde cualquier flujo (checkout del cliente, un ajuste manual de
// staff) siempre dispara el correo, sin depender de que el cliente que
// llamó recuerde hacerlo.
//
// La API key de Resend vive en Supabase Vault, nunca en el código ni en
// una variable de entorno del navegador. La llamada del trigger se
// autentica con un secreto compartido (`x-webhook-secret`), también en
// Vault — por eso esta función se despliega con verify_jwt:false (no la
// llama un usuario con sesión, la llama Postgres).
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  out_for_delivery: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  failed: 'No se pudo completar',
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  // Autenticación del webhook: solo el trigger de la base de datos (que
  // conoce este secreto vía Vault) puede disparar un envío. Vault no se
  // expone por PostgREST, así que se lee a través de una función RPC
  // (get_decrypted_secret) restringida a service_role.
  const { data: expectedSecret } = await admin.rpc('get_decrypted_secret', {
    secret_name: 'order_email_webhook_secret',
  })
  const providedSecret = req.headers.get('x-webhook-secret')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ error: 'No autorizado.' }, 401)
  }

  let body: { order_id?: string; event?: 'created' | 'status_changed' }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo inválido.' }, 400)
  }
  const orderId = body.order_id
  const event = body.event
  if (!orderId || !event) return json({ error: 'Falta order_id o event.' }, 400)

  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return json({ error: 'Pedido no encontrado.' }, 404)

  // Solo podemos avisar por correo a clientes con cuenta — un invitado no
  // deja correo en el checkout actual (solo nombre y teléfono). Es una
  // limitación conocida, no un error: simplemente no hay nada que enviar.
  if (!order.customer_id) {
    return json({ skipped: true, reason: 'Pedido de invitado, sin correo registrado.' })
  }

  const { data: userRes, error: userError } = await admin.auth.admin.getUserById(order.customer_id)
  const toEmail = userRes?.user?.email
  if (userError || !toEmail) {
    return json({ skipped: true, reason: 'No se encontró el correo del cliente.' })
  }

  const { data: items } = await admin.from('order_items').select('*').eq('order_id', orderId)

  const statusLabel = STATUS_LABELS[order.status] ?? order.status
  const subject =
    event === 'created'
      ? `Confirmamos tu pedido #${order.order_number}`
      : `Tu pedido #${order.order_number}: ${statusLabel}`

  const itemsHtml = (items ?? [])
    .map(
      (i: { quantity: number; item_name: string; size_name: string | null; subtotal: number }) =>
        `<tr><td style="padding:4px 0">${i.quantity}× ${i.item_name}${i.size_name ? ` (${i.size_name})` : ''}</td><td style="padding:4px 0;text-align:right">${formatMoney(i.subtotal)}</td></tr>`
    )
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#353532">
      <h1 style="color:#353532">${event === 'created' ? '¡Gracias por tu pedido!' : `Pedido #${order.order_number}: ${statusLabel}`}</h1>
      <p>Pedido <strong>#${order.order_number}</strong>${event === 'created' ? ' recibido correctamente.' : ''}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml}</table>
      <p style="font-weight:bold">Total: ${formatMoney(order.total)}</p>
      ${order.order_type === 'delivery' ? `<p>Entrega en: ${order.address ?? ''}</p>` : '<p>Para recoger en tienda.</p>'}
    </div>
  `
  const text = `Pedido #${order.order_number} — ${statusLabel}. Total: ${formatMoney(order.total)}.`

  const { data: resendKey } = await admin.rpc('get_decrypted_secret', { secret_name: 'resend_api_key' })
  if (!resendKey) return json({ error: 'Falta configurar la API key de Resend.' }, 500)

  // Sin dominio verificado en Resend todavía, solo se puede enviar desde
  // el remitente de pruebas — y ese remitente solo entrega a la cuenta
  // dueña de la API key. Ver nota para el usuario en el chat.
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Nero Pizza Co. <onboarding@resend.dev>',
      to: [toEmail],
      subject,
      html,
      text,
    }),
  })

  const notificationStatus = resendResponse.ok ? 'sent' : 'failed'
  await admin.from('notifications').insert({
    user_id: order.customer_id,
    order_id: order.id,
    channel: 'email',
    type: event,
    payload: { subject, to: toEmail },
    status: notificationStatus,
    sent_at: notificationStatus === 'sent' ? new Date().toISOString() : null,
  })

  if (!resendResponse.ok) {
    const errBody = await resendResponse.text()
    return json({ error: 'Resend rechazó el envío.', detail: errBody }, 502)
  }

  return json({ sent: true, to: toEmail })
})
