import { NextResponse } from 'next/server'
import { getLeagueData } from '@/lib/api'
import { FACEIT_REVALIDATE_SECONDS, getFaceitEntries, toLadderRows } from '@/lib/faceit'

/**
 * La ladder de FACEIT de la home. Va aparte de la página porque cambia todo el
 * tiempo (elo, "hace 5 min"): adentro de la home cacheada la reescribía entera
 * en cada regeneración. Acá la guarda el CDN de Vercel, que no cuenta como
 * escritura ISR.
 */
export const dynamic = 'force-dynamic'
// Margen para refrescar FACEIT (los pedidos van de a uno).
export const maxDuration = 60

export async function GET() {
  try {
    const league = await getLeagueData()
    const rows = toLadderRows(await getFaceitEntries(league.players))
    // Sin filas FACEIT no respondió: se reintenta enseguida en vez de guardar el vacío.
    const cdn = rows.length > 0 ? `s-maxage=${FACEIT_REVALIDATE_SECONDS}, stale-while-revalidate=${FACEIT_REVALIDATE_SECONDS * 6}` : 's-maxage=30'
    return NextResponse.json({ rows }, { headers: { 'Cache-Control': `public, max-age=0, ${cdn}` } })
  } catch (error) {
    console.error('[faceit] no se pudo armar la ladder', error)
    return NextResponse.json({ rows: [] }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
