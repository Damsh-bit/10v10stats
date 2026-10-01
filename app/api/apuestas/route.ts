import { NextResponse } from 'next/server'
import { getApuestasConfig } from '@/lib/apuestas/config'
import { respuestaError, sesionActual } from '@/lib/apuestas/http'
import { listarEventos, ranking } from '@/lib/apuestas/servicio'

export const dynamic = 'force-dynamic'

/** Resumen público: configuración, quién está logueado, eventos recientes y ranking. */
export async function GET() {
  const config = getApuestasConfig()
  if (!config.habilitadas) return NextResponse.json({ config, sesion: null, eventos: [], ranking: [] })
  try {
    const [sesion, eventos, tabla] = await Promise.all([sesionActual(), listarEventos(), ranking()])
    return NextResponse.json({ config, sesion, eventos, ranking: tabla })
  } catch (error) {
    return respuestaError(error)
  }
}
