import { NextResponse } from 'next/server'
import { registrar } from '@/lib/apuestas/db'
import { firmaWebhookValida, MercadoPagoError } from '@/lib/apuestas/mercadopago'
import { procesarNotificacionPago } from '@/lib/apuestas/servicio'

export const dynamic = 'force-dynamic'

/**
 * Webhook de Mercado Pago. Llega como Webhook (`?data.id=…&type=payment`) o
 * como IPN (`?id=…&topic=payment`); los avisos de merchant_order se ignoran.
 *
 * El aviso sólo dice "mirá este pago": el estado real siempre se consulta a
 * la API con el token, así que un aviso falso no puede marcar nada como pagado.
 * Hay que contestar 200 rápido: si no, Mercado Pago reintenta.
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    // Los IPN pueden venir sin cuerpo.
  }

  const tipo = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? (body.type as string | undefined) ?? (body.topic as string | undefined)
  const data = body.data as { id?: string | number } | undefined
  const pagoId = url.searchParams.get('data.id') ?? (data?.id !== undefined ? String(data.id) : null) ?? url.searchParams.get('id')

  const firma = firmaWebhookValida({
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId: url.searchParams.get('data.id'),
  })
  if (firma === false) {
    await registrar('webhook_firma_invalida', {}, { tipo, pagoId })
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  if (tipo !== 'payment' || !pagoId || !/^\d+$/.test(pagoId)) {
    return NextResponse.json({ ok: true, ignorado: true })
  }

  try {
    await procesarNotificacionPago(pagoId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    // Un pago que no existe (p. ej. la notificación de prueba del panel) no se reintenta.
    if (error instanceof MercadoPagoError && error.status === 404) return NextResponse.json({ ok: true, ignorado: true })
    console.error('[apuestas] webhook', error)
    await registrar('webhook_error', {}, { pagoId, error: String(error) })
    // 500: Mercado Pago lo vuelve a mandar más tarde.
    return NextResponse.json({ error: 'No se pudo procesar' }, { status: 500 })
  }
}
