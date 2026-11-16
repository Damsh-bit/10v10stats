import { NextResponse } from 'next/server'
import { getDiasWow } from '@/lib/wow'

export const dynamic = 'force-dynamic'

/** Los últimos 120 días de Tiempo de Juego, para que /wow se refresque solo (datos en vivo). */
export async function GET() {
  const filas = await getDiasWow()
  return NextResponse.json(filas, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } })
}
