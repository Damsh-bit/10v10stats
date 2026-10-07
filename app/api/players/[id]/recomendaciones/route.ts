import { NextResponse } from 'next/server'
import { crearRecomendacion, hashIp, idValido, listarRecomendaciones, respuestaErrorPerfil } from '@/lib/perfil/social'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/** Recomendaciones anónimas visibles, la más nueva primero. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const playerId = idValido((await params).id, 'Jugador inválido')
    return NextResponse.json({ recomendaciones: await listarRecomendaciones(playerId) })
  } catch (error) {
    return respuestaErrorPerfil(error)
  }
}

/** Deja una recomendación anónima: `{ texto }`. */
export async function POST(request: Request, { params }: Params) {
  try {
    const playerId = idValido((await params).id, 'Jugador inválido')
    const body = (await request.json().catch(() => null)) as { texto?: unknown } | null
    return NextResponse.json({ recomendacion: await crearRecomendacion(playerId, body?.texto, hashIp(request)) }, { status: 201 })
  } catch (error) {
    return respuestaErrorPerfil(error)
  }
}
