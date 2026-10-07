import { NextResponse } from 'next/server'
import { idValido, reportarRecomendacion, respuestaErrorPerfil } from '@/lib/perfil/social'

export const dynamic = 'force-dynamic'

/** Reporta una recomendación (`{ device }`): con 3 reportes de navegadores distintos se oculta. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; recId: string }> }) {
  try {
    const recomendacionId = idValido((await params).recId, 'Recomendación inválida')
    const body = (await request.json().catch(() => null)) as { device?: unknown } | null
    return NextResponse.json(await reportarRecomendacion(recomendacionId, idValido(body?.device, 'Dispositivo inválido')))
  } catch (error) {
    return respuestaErrorPerfil(error)
  }
}
