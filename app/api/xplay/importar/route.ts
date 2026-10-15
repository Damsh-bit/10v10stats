import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { esClaveAdmin } from '@/lib/clave-admin'
import { resolverConPartidaNueva } from '@/lib/apuestas/servicio'
import { traerPartidaXplay } from '@/lib/xplay/fuente'
import { ErrorXplay, guardarPartidaXplay, type AsignacionXplay } from '@/lib/xplay/guardar'

/**
 * Carga una partida desde su link de Xplay: trae todo (cifras, rondas, kills)
 * y crea la partida o completa una que ya estaba cargada (`matchId`).
 */

export const dynamic = 'force-dynamic'
// Traer las rondas de SCOPE puede tardar unos segundos.
export const maxDuration = 60

type Payload = {
  password?: string
  link?: string
  asignaciones?: AsignacionXplay[]
  matchId?: string | null
  nombres?: { 1: string; 2: string }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload
    if (!esClaveAdmin(body.password)) return NextResponse.json({ error: 'Clave de administrador incorrecta' }, { status: 401 })
    if (!body.link) return NextResponse.json({ error: 'Falta el link de Xplay' }, { status: 400 })

    const partida = await traerPartidaXplay(body.link)
    const asignaciones = (body.asignaciones ?? []).map((a) => ({
      accountId: Number(a.accountId),
      playerId: String(a.playerId ?? ''),
      invitado: a.invitado === true,
    }))
    const { matchId, creada } = await guardarPartidaXplay({
      partida,
      asignaciones,
      matchId: body.matchId || null,
      nombres: body.nombres,
    })

    // Si había apuestas abiertas con estos mismos 10, se liquidan solas (nunca hace fallar la carga).
    if (creada) await resolverConPartidaNueva(matchId)
    revalidatePath('/', 'layout')

    return NextResponse.json({ success: true, matchId, creada, procesada: partida.procesada })
  } catch (error) {
    if (error instanceof ErrorXplay) {
      return NextResponse.json({ error: error.message, matchId: error.matchId }, { status: error.status })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la partida' }, { status: 500 })
  }
}
