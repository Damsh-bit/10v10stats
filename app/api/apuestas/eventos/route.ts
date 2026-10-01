import { NextResponse } from 'next/server'
import { leerJson, requerirHabilitadas, requerirSesion, respuestaError } from '@/lib/apuestas/http'
import { crearEvento } from '@/lib/apuestas/servicio'
import type { CuotasEvento } from '@/lib/apuestas/tipos'

export const dynamic = 'force-dynamic'

/** Abre las apuestas para los equipos que salieron en el generador. */
export async function POST(request: Request) {
  try {
    requerirHabilitadas()
    const sesion = await requerirSesion()
    const body = await leerJson(request)
    const id = await crearEvento(
      {
        equipoA: Array.isArray(body.equipoA) ? (body.equipoA as string[]) : [],
        equipoB: Array.isArray(body.equipoB) ? (body.equipoB as string[]) : [],
        probA: Number(body.probA),
        mapa: typeof body.mapa === 'string' ? body.mapa : null,
        equipoANombre: typeof body.equipoANombre === 'string' ? body.equipoANombre : undefined,
        equipoBNombre: typeof body.equipoBNombre === 'string' ? body.equipoBNombre : undefined,
        cuotas: body.cuotas && typeof body.cuotas === 'object' ? (body.cuotas as CuotasEvento) : undefined,
        horas: Number(body.horas),
      },
      sesion.playerId,
    )
    return NextResponse.json({ id })
  } catch (error) {
    return respuestaError(error)
  }
}
