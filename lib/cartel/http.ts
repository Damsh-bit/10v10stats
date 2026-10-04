import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { MercadoPagoError } from '@/lib/apuestas/mercadopago'
import { getCartelAdminKey } from './config'
import { CartelError } from './servicio'

export const HEADER_ADMIN_CARTEL = 'x-cartel-admin'

export function esAdminCartel(request: Request) {
  const esperada = getCartelAdminKey()
  const enviada = request.headers.get(HEADER_ADMIN_CARTEL)
  if (!esperada || !enviada) return false
  const a = createHash('sha256').update(enviada).digest()
  const b = createHash('sha256').update(esperada).digest()
  return timingSafeEqual(a, b)
}

export function respuestaErrorCartel(error: unknown) {
  if (error instanceof CartelError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof MercadoPagoError) {
    console.error('[cartel] Mercado Pago', error.status, error.body)
    return NextResponse.json({ error: `Mercado Pago: ${error.message}` }, { status: 502 })
  }
  console.error('[cartel]', error)
  return NextResponse.json({ error: 'Algo salió mal con el cartel' }, { status: 500 })
}
