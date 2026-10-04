import { NextResponse } from 'next/server'
import { firmaWebhookValida, MercadoPagoError } from '@/lib/apuestas/mercadopago'
import { getCartelWebhookSecret } from '@/lib/cartel/config'
import { procesarNotificacionCartel } from '@/lib/cartel/servicio'

export const dynamic = 'force-dynamic'

/**
 * Avisos de Mercado Pago de las donaciones (la `notification_url` de cada
 * checkout). Igual que en las apuestas: el aviso sólo dice "mirá este pago" y
 * el estado real se consulta con el token, así que uno falso no hace nada.
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

  const firma = firmaWebhookValida(
    { xSignature: request.headers.get('x-signature'), xRequestId: request.headers.get('x-request-id'), dataId: url.searchParams.get('data.id') },
    getCartelWebhookSecret(),
  )
  if (firma === false) return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })

  if (tipo !== 'payment' || !pagoId || !/^\d+$/.test(pagoId)) return NextResponse.json({ ok: true, ignorado: true })

  try {
    await procesarNotificacionCartel(pagoId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof MercadoPagoError && error.status === 404) return NextResponse.json({ ok: true, ignorado: true })
    console.error('[cartel] webhook', error)
    // 500: Mercado Pago lo vuelve a mandar más tarde.
    return NextResponse.json({ error: 'No se pudo procesar' }, { status: 500 })
  }
}
