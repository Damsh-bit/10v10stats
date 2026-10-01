import { NextResponse } from 'next/server'
import { ApuestaError } from '@/lib/apuestas/db'
import { leerJson, requerirHabilitadas, requerirSesion, respuestaError } from '@/lib/apuestas/http'
import { avisarTransferencia, iniciarPago, verificarPago } from '@/lib/apuestas/servicio'

export const dynamic = 'force-dynamic'

/**
 * - `pagar`: devuelve el link del checkout de Mercado Pago (o el alias de la banca en modo manual).
 * - `verificar`: vuelve a consultar el pago en Mercado Pago (al volver del checkout).
 * - `transferi`: modo manual, avisa que ya transfirió.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requerirHabilitadas()
    const { id } = await params
    const sesion = await requerirSesion()
    const body = await leerJson(request)

    switch (body.accion) {
      case 'pagar':
        return NextResponse.json(await iniciarPago(id, sesion.playerId, request.url))
      case 'verificar':
        return NextResponse.json({ posicion: await verificarPago(id) })
      case 'transferi':
        await avisarTransferencia(id, sesion.playerId)
        return NextResponse.json({ ok: true })
      default:
        throw new ApuestaError('Acción inválida')
    }
  } catch (error) {
    return respuestaError(error)
  }
}
