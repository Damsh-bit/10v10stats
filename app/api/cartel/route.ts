import { NextResponse } from 'next/server'
import { respuestaErrorCartel } from '@/lib/cartel/http'
import { CartelError, crearCartel, getCartelEstado } from '@/lib/cartel/servicio'

export const dynamic = 'force-dynamic'

/** El cartel vigente y cuánto sale sacarlo. */
export async function GET() {
  const estado = await getCartelEstado()
  if (!estado) return NextResponse.json({ error: 'El cartel no está disponible' }, { status: 503 })
  return NextResponse.json(estado)
}

/**
 * Abre el checkout de una donación (multipart: mensaje, autor, autorPlayerId,
 * objetivoPlayerId, estilo, monto, volverA, imagen). Devuelve a dónde ir a pagar.
 */
export async function POST(request: Request) {
  try {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      throw new CartelError('Pedido inválido')
    }
    return NextResponse.json(await crearCartel(form, request.url))
  } catch (error) {
    return respuestaErrorCartel(error)
  }
}
