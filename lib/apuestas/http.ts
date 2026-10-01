import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getApuestasConfig } from './config'
import { obtenerSesion } from './cuentas'
import { ApuestaError } from './db'
import { MercadoPagoError } from './mercadopago'
import { COOKIE_SESION, esClaveAdmin } from './sesion'
import type { SesionJugador } from './tipos'

/** Helpers de los route handlers de /api/apuestas. */

export const HEADER_ADMIN = 'x-apuestas-admin'

export function requerirHabilitadas() {
  if (!getApuestasConfig().habilitadas) throw new ApuestaError('Las apuestas todavía no están activas', 503)
}

export async function sesionActual(): Promise<SesionJugador | null> {
  const store = await cookies()
  return obtenerSesion(store.get(COOKIE_SESION)?.value)
}

export async function requerirSesion(): Promise<SesionJugador> {
  const sesion = await sesionActual()
  if (!sesion) throw new ApuestaError('Entrá con tu PIN para apostar', 401)
  return sesion
}

export function esAdmin(request: Request) {
  return esClaveAdmin(request.headers.get(HEADER_ADMIN))
}

export function requerirAdmin(request: Request) {
  if (!esAdmin(request)) throw new ApuestaError('Clave de admin incorrecta', 401)
}

export async function leerJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    throw new ApuestaError('Pedido inválido')
  }
}

export function respuestaError(error: unknown) {
  if (error instanceof ApuestaError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof MercadoPagoError) {
    console.error('[apuestas] Mercado Pago', error.status, error.body)
    return NextResponse.json({ error: `Mercado Pago: ${error.message}` }, { status: 502 })
  }
  console.error('[apuestas]', error)
  return NextResponse.json({ error: 'Algo salió mal con la apuesta' }, { status: 500 })
}
