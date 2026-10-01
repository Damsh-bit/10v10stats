import { NextResponse } from 'next/server'
import { leerJson, requerirHabilitadas, requerirSesion, respuestaError } from '@/lib/apuestas/http'
import { responderDuelo } from '@/lib/apuestas/servicio'

export const dynamic = 'force-dynamic'

/** { accion: 'aceptar' | 'rechazar' } (el desafiado) o 'cancelar' (el retador, sin plata adentro). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requerirHabilitadas()
    const { id } = await params
    const sesion = await requerirSesion()
    const body = await leerJson(request)
    await responderDuelo(id, sesion.playerId, body.accion)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return respuestaError(error)
  }
}
