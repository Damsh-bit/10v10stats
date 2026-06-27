import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

type EditMatchPlayerPayload = {
  player_id: string
  team: string
  kills: number
  deaths: number
  assists: number
  damage: number
  hs_pct: number
}

type EditMatchPayload = {
  password?: string
  score_ct: number
  score_t: number
  players: EditMatchPlayerPayload[]
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const payload = (await request.json()) as EditMatchPayload

    if (payload.password !== 'alzhannah2026') {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    if (payload.score_ct === undefined || payload.score_t === undefined) {
      return NextResponse.json({ error: 'Los scores son obligatorios' }, { status: 400 })
    }
    
    if (!payload.players || payload.players.length !== 10) {
      return NextResponse.json({ error: 'Debes enviar la data de los 10 jugadores' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      return NextResponse.json({ error: 'No se pudo inicializar el cliente de Supabase' }, { status: 500 })
    }

    // 1. Obtener la partida actual para conocer los nombres de los equipos y ganador
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id, team_a_name, team_b_name, mvp_id')
      .eq('id', matchId)
      .single()

    if (matchError || !matchData) {
      return NextResponse.json({ error: 'No se encontró la partida' }, { status: 404 })
    }

    const teamAName = matchData.team_a_name || 'Equipo A'
    const teamBName = matchData.team_b_name || 'Equipo B'
    
    // Determinar nuevo equipo ganador
    const winnerTeam = payload.score_ct > payload.score_t ? teamAName : teamBName

    // 2. Calcular MVP de la partida
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

    // 3. Actualizar la partida
    const { error: updateMatchError } = await supabase
      .from('matches')
      .update({
        score_ct: payload.score_ct,
        score_t: payload.score_t,
        winner_team: winnerTeam,
        mvp_id: mvpPlayerId || matchData.mvp_id,
      })
      .eq('id', matchId)

    if (updateMatchError) {
      return NextResponse.json({ error: updateMatchError.message || 'No se pudo actualizar la partida' }, { status: 500 })
    }

    // 4. Actualizar a los jugadores en match_players
    for (const player of payload.players) {
      // player.team vendrá como el nombre original ("Team A" o "CT", o el nombre de label si no tiene team_a_name)
      // Mantenemos el team que nos pasa el frontend porque allí armaremos bien el label
      const teamLabel = player.team === teamAName || player.team === 'CT' ? teamAName : teamBName
      const won = teamLabel === winnerTeam

      const { error: playerUpdateError } = await supabase
        .from('match_players')
        .update({
          team: teamLabel,
          won: won,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          damage: player.damage,
          hs_pct: player.hs_pct,
        })
        .eq('match_id', matchId)
        .eq('player_id', player.player_id)

      if (playerUpdateError) {
        console.error('Error actualizando jugador:', playerUpdateError)
      }
    }

    // 5. Opcional: Actualizar MVP totals en tabla players (restando al viejo, sumando al nuevo)
    if (mvpPlayerId && matchData.mvp_id !== mvpPlayerId) {
      // Restar al viejo
      if (matchData.mvp_id) {
        const { data: oldMvpData } = await supabase.from('players').select('mvps').eq('id', matchData.mvp_id).single()
        if (oldMvpData) {
          await supabase.from('players').update({ mvps: Math.max(0, (oldMvpData.mvps || 0) - 1) }).eq('id', matchData.mvp_id)
        }
      }
      // Sumar al nuevo
      const { data: newMvpData } = await supabase.from('players').select('mvps').eq('id', mvpPlayerId).single()
      if (newMvpData) {
        await supabase.from('players').update({ mvps: (newMvpData.mvps || 0) + 1 }).eq('id', mvpPlayerId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error inesperado' }, { status: 500 })
  }
}
