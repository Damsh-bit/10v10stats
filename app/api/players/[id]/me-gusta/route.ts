import { NextResponse } from 'next/server'
import { cambiarMeGusta, estadoMeGusta, hashIp, idValido, PerfilError, respuestaErrorPerfil } from '@/lib/perfil/social'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/** Cuántos me gusta tiene y si este navegador (`?device=`) ya le dio. */
export async function GET(request: Request, { params }: Params) {
  try {
    const playerId = idValido((await params).id, 'Jugador inválido')
    const device = new URL(request.url).searchParams.get('device')
    return NextResponse.json(await estadoMeGusta(playerId, device ? idValido(device, 'Dispositivo inválido') : null))
  } catch (error) {
    return respuestaErrorPerfil(error)
  }
}

/** Da o saca el me gusta: `{ device, quiero }`. */
export async function POST(request: Request, { params }: Params) {
  try {
    const playerId = idValido((await params).id, 'Jugador inválido')
    const body = (await request.json().catch(() => null)) as { device?: unknown; quiero?: unknown } | null
    if (!body || typeof body.quiero !== 'boolean') throw new PerfilError('Pedido inválido')
    return NextResponse.json(await cambiarMeGusta(playerId, idValido(body.device, 'Dispositivo inválido'), body.quiero, hashIp(request)))
  } catch (error) {
    return respuestaErrorPerfil(error)
  }
}
