import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'No se pudo inicializar el cliente de Supabase' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('matches')
      .select('id, map, played_at, score_ct, score_t, team_a_name, team_b_name')
      .order('played_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message || 'No se pudieron cargar las partidas' }, { status: 500 })
    }

    const matches = (data ?? []).map((match) => ({
      id: match.id,
      map: match.map ?? 'Sin mapa',
      played_at: match.played_at,
      score_ct: match.score_ct ?? 0,
      score_t: match.score_t ?? 0,
      team_a_name: match.team_a_name ?? 'Equipo A',
      team_b_name: match.team_b_name ?? 'Equipo B',
    }))

    return NextResponse.json(matches)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron cargar las partidas' },
      { status: 500 },
    )
  }
}

type MatchPlayerPayload = {
  player_id: string
  team: 'CT' | 'T'
  won: boolean
  kills: number
  deaths: number
  assists: number
  damage: number
  hs_pct: number
}

type MatchPayload = {
  map: string
  team_a_name?: string
  team_b_name?: string
  score_ct: number
  score_t: number
  winner_team?: 'CT' | 'T'
  played_at?: string
  date?: string
  playedAt?: string
  total_rounds?: number | null
  video_url?: string | null
  notes?: string | null
  players: MatchPlayerPayload[]
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MatchPayload

    if (!payload?.map?.trim()) {
      return NextResponse.json({ error: 'El mapa es obligatorio' }, { status: 400 })
    }
    if (payload.score_ct === undefined || payload.score_t === undefined) {
      return NextResponse.json({ error: 'Los scores son obligatorios' }, { status: 400 })
    }
    if (!payload.players || payload.players.length !== 10) {
      return NextResponse.json({ error: 'Debes asignar 10 jugadores' }, { status: 400 })
    }

    const playerIds = payload.players.map((player) => player.player_id)
    const hasMissingPlayer = playerIds.some((playerId) => !playerId)
    const hasDuplicates = new Set(playerIds).size !== playerIds.length

    if (hasMissingPlayer || hasDuplicates) {
      return NextResponse.json({ error: 'Todos los jugadores deben estar asignados y ser únicos' }, { status: 400 })
    }

    // Prefer admin client (service role key), fall back to regular client (anon key)
    const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'No se pudo inicializar el cliente de Supabase' }, { status: 500 })
    }

    const playedAt = (payload.played_at ?? payload.date ?? payload.playedAt ?? '').trim() || new Date().toISOString()
    const winnerTeamRaw = payload.winner_team ?? (payload.score_ct > payload.score_t ? 'CT' : 'T')
    const totalRounds = typeof payload.total_rounds === 'number' && Number.isFinite(payload.total_rounds) ? payload.total_rounds : null
    const videoUrl = typeof payload.video_url === 'string' ? payload.video_url.trim() || null : null
    const notes = typeof payload.notes === 'string' ? payload.notes.trim() || null : null
    const teamAName = typeof payload.team_a_name === 'string' && payload.team_a_name.trim() ? payload.team_a_name.trim() : 'Equipo A'
    const teamBName = typeof payload.team_b_name === 'string' && payload.team_b_name.trim() ? payload.team_b_name.trim() : 'Equipo B'
    const winnerTeam = winnerTeamRaw === 'CT' ? teamAName : teamBName

    // 1. Calcular MVP de la partida
    let mvpPlayerId = ''
    let maxScore = -1

    payload.players.forEach((p) => {
      const d = Math.max(1, p.deaths || 0)
      const score = (p.kills + p.assists) / d + (p.damage / 100)
      if (score > maxScore) {
        maxScore = score
        mvpPlayerId = p.player_id
      }
    })

    // 2. Insertar la partida (match)
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert({
        map: payload.map.trim(),
        team_a_name: teamAName,
        team_b_name: teamBName,
        score_ct: payload.score_ct,
        score_t: payload.score_t,
        winner_team: winnerTeam,
        played_at: playedAt,
        video_url: videoUrl,
        notes,
        mvp_id: mvpPlayerId || null, // Guardamos el MVP en la tabla matches
      })
      .select('id')
      .single()

    if (matchError || !matchData?.id) {
      return NextResponse.json({ error: matchError?.message || 'No se pudo crear la partida' }, { status: 500 })
    }

    // 3. Insertar a los jugadores en match_players
    const rows = payload.players.map((player) => ({
      match_id: matchData.id,
      player_id: player.player_id,
      team: player.team === 'CT' ? teamAName : teamBName,
      won: player.won,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      damage: player.damage,
      hs_pct: player.hs_pct,
    }))

    const { error: playersError } = await supabase.from('match_players').insert(rows)

    if (playersError) {
      return NextResponse.json({ error: playersError.message || 'No se pudieron guardar los jugadores' }, { status: 500 })
    }

    // 4. Intentar actualizar el total de MVPs en la tabla players
    if (mvpPlayerId) {
      const { data: playerData, error: fetchError } = await supabase
        .from('players')
        .select('mvps')
        .eq('id', mvpPlayerId)
        .single()
        
      if (fetchError) {
        console.error('Error fetching player mvps:', fetchError)
      }
        
      const currentMvps = playerData?.mvps || 0
      
      const { error: updateError, data: updateData } = await supabase
        .from('players')
        .update({ mvps: currentMvps + 1 })
        .eq('id', mvpPlayerId)
        .select()
        
      if (updateError) {
        console.error('Error updating player mvps:', updateError)
      } else if (!updateData || updateData.length === 0) {
        console.warn('Update silencioso fallido por RLS en la tabla players.')
      } else {
        console.log(`MVP updated successfully for player ${mvpPlayerId}. New total: ${currentMvps + 1}`)
      }
    }

    return NextResponse.json({ success: true, matchId: matchData.id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la partida' }, { status: 500 })
  }
}
