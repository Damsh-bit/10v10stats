import { NextResponse } from 'next/server'
import { actualizarAliasCobro, iniciarSesion, jugadoresHabilitados } from '@/lib/apuestas/cuentas'
import { leerJson, requerirHabilitadas, requerirSesion, respuestaError, sesionActual } from '@/lib/apuestas/http'
import { COOKIE_SESION, DURACION_SESION_SEG, firmarSesion } from '@/lib/apuestas/sesion'

export const dynamic = 'force-dynamic'

/** Quién está logueado y quiénes pueden entrar. */
export async function GET() {
  try {
    requerirHabilitadas()
    const [sesion, jugadores] = await Promise.all([sesionActual(), jugadoresHabilitados()])
    return NextResponse.json({ sesion, jugadores })
  } catch (error) {
    return respuestaError(error)
  }
}

/** Entrar con el PIN: deja una cookie httpOnly firmada por 30 días. */
export async function POST(request: Request) {
  try {
    requerirHabilitadas()
    const body = await leerJson(request)
    const sesion = await iniciarSesion(body.playerId, body.pin)
    const response = NextResponse.json({ sesion })
    response.cookies.set(COOKIE_SESION, firmarSesion(sesion.playerId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: DURACION_SESION_SEG,
    })
    return response
  } catch (error) {
    return respuestaError(error)
  }
}

/** Cambiar el alias/CVU de cobro. */
export async function PATCH(request: Request) {
  try {
    requerirHabilitadas()
    const sesion = await requerirSesion()
    const body = await leerJson(request)
    await actualizarAliasCobro(sesion.playerId, body.aliasCobro)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return respuestaError(error)
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_SESION, '', { httpOnly: true, path: '/', maxAge: 0 })
  return response
}
