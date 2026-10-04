import { NextResponse } from 'next/server'
import { esAdminCartel, respuestaErrorCartel } from '@/lib/cartel/http'
import { CartelError, moderarCartel } from '@/lib/cartel/servicio'

export const dynamic = 'force-dynamic'

/** Chequea la clave de moderación (header x-cartel-admin). */
export async function GET(request: Request) {
  if (!esAdminCartel(request)) return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
  return NextResponse.json({ ok: true })
}

/** `ocultar` / `mostrar` un cartel. */
export async function POST(request: Request) {
  try {
    if (!esAdminCartel(request)) throw new CartelError('Clave incorrecta', 401)
    const body = (await request.json().catch(() => ({}))) as { accion?: string; id?: string }
    if (body.accion !== 'ocultar' && body.accion !== 'mostrar') throw new CartelError('Acción inválida')
    await moderarCartel(String(body.id ?? ''), body.accion === 'ocultar')
    return NextResponse.json({ ok: true })
  } catch (error) {
    return respuestaErrorCartel(error)
  }
}
