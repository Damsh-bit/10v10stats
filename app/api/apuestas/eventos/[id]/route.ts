import { NextResponse } from 'next/server'
import { esAdmin, leerJson, requerirHabilitadas, requerirSesion, respuestaError, sesionActual } from '@/lib/apuestas/http'
import { cancelarEvento, cerrarEvento, desafiar, entrarAlPozo, obtenerEvento } from '@/lib/apuestas/servicio'
import { ApuestaError } from '@/lib/apuestas/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    requerirHabilitadas()
    const { id } = await params
    const sesion = await sesionActual()
    return NextResponse.json(await obtenerEvento(id, sesion?.playerId))
  } catch (error) {
    return respuestaError(error)
  }
}

/**
 * Acciones sobre el evento:
 * - `pozo`: { lado, monto } entrar al pozo por equipos.
 * - `desafiar`: { rivalId, mercado, montoRetador, montoRival, mensaje } duelo 1v1.
 * - `cerrar`: arrancó la partida, no entra nadie más (creador o admin).
 * - `cancelar`: se cae la partida y se devuelve todo (creador sin plata en juego, o admin).
 */
export async function POST(request: Request, { params }: Params) {
  try {
    requerirHabilitadas()
    const { id } = await params
    const body = await leerJson(request)
    const admin = esAdmin(request)

    switch (body.accion) {
      case 'pozo': {
        const sesion = await requerirSesion()
        const posicion = await entrarAlPozo(id, sesion.playerId, body.lado, body.monto)
        return NextResponse.json({ posicion })
      }
      case 'desafiar': {
        const sesion = await requerirSesion()
        const apuesta = await desafiar(id, sesion.playerId, {
          rivalId: body.rivalId,
          mercado: body.mercado,
          montoRetador: body.montoRetador,
          montoRival: body.montoRival,
          mensaje: body.mensaje,
        })
        return NextResponse.json({ apuesta })
      }
      case 'cerrar':
      case 'cancelar': {
        const sesion = admin ? null : await requerirSesion()
        const quien = { admin, playerId: sesion?.playerId }
        await (body.accion === 'cerrar' ? cerrarEvento(id, quien) : cancelarEvento(id, quien))
        return NextResponse.json({ ok: true })
      }
      default:
        throw new ApuestaError('Acción inválida')
    }
  } catch (error) {
    return respuestaError(error)
  }
}
