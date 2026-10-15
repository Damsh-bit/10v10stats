import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'
import { diaDeSesion, extraerHashXplay, traerResumenXplay } from '@/lib/xplay/fuente'

/**
 * Vista previa de un link de Xplay para el formulario de carga: la partida,
 * quién es quién en el sitio (por la cuenta de Steam o, si es nueva, por el
 * nick) y qué partida ya cargada podría ser la misma.
 */

export const dynamic = 'force-dynamic'

const DIAS_DE_MARGEN = 2

type JugadorSitio = { id: string; name: string; photo_url: string | null; faceit_nickname: string | null; steam_account_id: number | null }

const normalizar = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

function parecido(nick: string, jugador: JugadorSitio) {
  const a = normalizar(nick)
  if (a.length < 3) return false
  return [jugador.name, jugador.faceit_nickname ?? ''].some((nombre) => {
    const b = normalizar(nombre)
    if (b.length < 3) return false
    return a === b || (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a)))
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { link?: string; matchId?: string | null }
    const hash = extraerHashXplay(body.link ?? '')
    if (!hash) return NextResponse.json({ error: 'Pegá el link de la partida de Xplay (xplay.gg/…/matches/history/…).' }, { status: 400 })

    const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
    if (!supabase) return NextResponse.json({ error: 'No se pudo conectar con la base' }, { status: 500 })

    const [resumen, jugadoresRes, previaRes] = await Promise.all([
      traerResumenXplay(hash),
      supabase.from('players').select('id, name, photo_url, faceit_nickname, steam_account_id').order('name'),
      supabase.from('xplay_matches').select('match_id').eq('hash', hash).maybeSingle(),
    ])
    const jugadores = (jugadoresRes.data ?? []) as JugadorSitio[]

    // Primero la cuenta de Steam; si no está, un nick parecido (sin repetir jugador).
    const usados = new Set<string>()
    const sugeridas: Record<string, { playerId: string | null; por: 'steam' | 'nombre' | null }> = {}
    for (const j of resumen.jugadores) {
      const porSteam = jugadores.find((p) => p.steam_account_id !== null && Number(p.steam_account_id) === j.accountId)
      if (porSteam) {
        usados.add(porSteam.id)
        sugeridas[j.accountId] = { playerId: porSteam.id, por: 'steam' }
      }
    }
    for (const j of resumen.jugadores) {
      if (sugeridas[j.accountId]) continue
      const porNombre = jugadores.find((p) => !usados.has(p.id) && p.steam_account_id === null && parecido(j.nombre, p))
      if (porNombre) usados.add(porNombre.id)
      sugeridas[j.accountId] = { playerId: porNombre?.id ?? null, por: porNombre ? 'nombre' : null }
    }

    // Partidas ya cargadas que pueden ser esta: mismo mapa y marcador, fecha cercana.
    const dia = diaDeSesion(resumen.inicio)
    const desde = new Date(new Date(dia).getTime() - DIAS_DE_MARGEN * 86400_000).toISOString()
    const hasta = new Date(new Date(dia).getTime() + DIAS_DE_MARGEN * 86400_000).toISOString()
    const { data: candidatas } = await supabase
      .from('matches')
      .select('id, played_at, map, score_ct, score_t, team_a_name, team_b_name, match_players(player_id)')
      .eq('map', resumen.mapa)
      .gte('played_at', desde)
      .lte('played_at', hasta)
    const ids = (candidatas ?? []).map((c) => c.id)
    const { data: conXplay } = ids.length
      ? await supabase.from('xplay_matches').select('match_id, hash').in('match_id', ids)
      : { data: [] as { match_id: string; hash: string }[] }
    const hashDe = new Map((conXplay ?? []).map((x) => [String(x.match_id), String(x.hash)]))
    const sugeridos = new Set(Object.values(sugeridas).map((s) => s.playerId).filter(Boolean))
    const [s1, s2] = resumen.marcador

    const coincidencias = (candidatas ?? [])
      .filter((c) => (c.score_ct === s1 && c.score_t === s2) || (c.score_ct === s2 && c.score_t === s1))
      .filter((c) => !hashDe.has(String(c.id)) || hashDe.get(String(c.id)) === hash)
      .map((c) => ({
        matchId: String(c.id),
        map: c.map,
        date: c.played_at,
        scoreA: c.score_ct,
        scoreB: c.score_t,
        teamAName: c.team_a_name ?? 'Equipo A',
        teamBName: c.team_b_name ?? 'Equipo B',
        enComun: ((c.match_players ?? []) as { player_id: string }[]).filter((p) => sugeridos.has(p.player_id)).length,
      }))
      .sort((a, b) => b.enComun - a.enComun || Math.abs(new Date(a.date).getTime() - new Date(dia).getTime()) - Math.abs(new Date(b.date).getTime() - new Date(dia).getTime()))

    let completar = null
    if (body.matchId) {
      const { data } = await supabase
        .from('matches')
        .select('id, played_at, map, score_ct, score_t, team_a_name, team_b_name')
        .eq('id', body.matchId)
        .maybeSingle()
      if (data) {
        completar = {
          matchId: String(data.id),
          map: data.map,
          date: data.played_at,
          scoreA: data.score_ct,
          scoreB: data.score_t,
          teamAName: data.team_a_name ?? 'Equipo A',
          teamBName: data.team_b_name ?? 'Equipo B',
        }
      }
    }

    return NextResponse.json({
      resumen,
      dia,
      jugadores: jugadores.map((p) => ({ id: p.id, name: p.name, photoUrl: p.photo_url })),
      sugeridas,
      yaCargada: previaRes.data ? { matchId: String(previaRes.data.match_id) } : null,
      coincidencias,
      completar,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo leer la partida' }, { status: 500 })
  }
}
