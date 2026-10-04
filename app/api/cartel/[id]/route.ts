import { NextResponse } from 'next/server'
import { respuestaErrorCartel } from '@/lib/cartel/http'
import { verificarCartel } from '@/lib/cartel/servicio'

export const dynamic = 'force-dynamic'

/** Al volver del checkout: cómo quedó la donación (consulta Mercado Pago si hace falta). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    return NextResponse.json(await verificarCartel(id))
  } catch (error) {
    return respuestaErrorCartel(error)
  }
}
