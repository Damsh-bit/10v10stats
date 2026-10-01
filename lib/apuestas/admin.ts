import { ApuestaError, check, db, esUuid, registrar, toApuesta, toEvento } from './db'
import type { Evento, Mercado, TipoApuesta } from './tipos'

/**
 * Panel de la banca: lo que hay que pagar, lo que hay que confirmar y los
 * jugadores habilitados. Todo pasa por la clave APUESTAS_ADMIN_KEY.
 */

export type DeudaBanca = {
  posicionId: string
  playerId: string
  name: string
  aliasCobro: string | null
  /** gana: premio · devuelve: reintegro (empate, anulada o transferencia fuera de término). */
  motivo: 'gana' | 'devuelve'
  monto: number
  apuesta: { id: string; tipo: TipoApuesta; mercado: Mercado; eventoId: string }
  desde: string
}

export type TransferenciaPendiente = {
  posicionId: string
  playerId: string
  name: string
  monto: number
  eventoId: string
  apuestaTipo: TipoApuesta
  avisadaAt: string
}

export type JugadorAdmin = {
  id: string
  name: string
  tienePin: boolean
  habilitado: boolean
  aliasCobro: string | null
  bloqueado: boolean
}

export type PartidaReciente = { id: string; map: string; playedAt: string | null; equipos: string }

export type ResumenAdmin = {
  deudas: DeudaBanca[]
  transferencias: TransferenciaPendiente[]
  jugadores: JugadorAdmin[]
  eventosActivos: Evento[]
  partidas: PartidaReciente[]
  /** Plata adentro de la banca: pagado y todavía no liquidado ni devuelto. */
  enCustodia: number
}

export async function resumenAdmin(): Promise<ResumenAdmin> {
  const [deudasRows, transferenciasRows, cuentas, players, eventosRows, partidasRows, custodiaRows] = await Promise.all([
    db().from('apuestas_posiciones').select('id, player_id, premio, resultado, apuesta_id, updated_at').eq('premio_estado', 'pendiente').order('updated_at'),
    db().from('apuestas_posiciones').select('id, player_id, monto, apuesta_id, updated_at').eq('estado', 'en_proceso').order('updated_at'),
    db().from('apuestas_jugadores').select('player_id, habilitado, alias_cobro, bloqueado_hasta'),
    db().from('players').select('id, name').order('name'),
    db().from('apuestas_eventos').select('*').in('estado', ['abierto', 'en_juego']).order('created_at', { ascending: false }),
    db().from('matches').select('id, map, played_at, team_a_name, team_b_name').order('played_at', { ascending: false }).limit(10),
    db().from('apuestas_posiciones').select('monto').eq('estado', 'pagada').is('resultado', null),
  ])

  const deudas = check(deudasRows, 'Deudas') ?? []
  const transferencias = check(transferenciasRows, 'Transferencias') ?? []
  const apuestaIds = [...new Set([...deudas, ...transferencias].map((r) => r.apuesta_id))]
  const apuestas = apuestaIds.length
    ? (check(await db().from('apuestas').select('*').in('id', apuestaIds), 'Apuestas') ?? []).map(toApuesta)
    : []
  const apuestaPorId = new Map(apuestas.map((a) => [a.id, a]))

  const cuentasPorId = new Map((check(cuentas, 'Jugadores') ?? []).map((c) => [c.player_id, c]))
  const nombres = new Map((check(players, 'Jugadores') ?? []).map((p) => [p.id, p.name as string]))

  return {
    deudas: deudas.flatMap((r) => {
      const apuesta = apuestaPorId.get(r.apuesta_id)
      if (!apuesta) return []
      return [
        {
          posicionId: r.id,
          playerId: r.player_id,
          name: nombres.get(r.player_id) ?? 'Sin nombre',
          aliasCobro: cuentasPorId.get(r.player_id)?.alias_cobro ?? null,
          motivo: r.resultado === 'gana' ? 'gana' : 'devuelve',
          monto: Number(r.premio ?? 0),
          apuesta: { id: apuesta.id, tipo: apuesta.tipo, mercado: apuesta.mercado, eventoId: apuesta.eventoId },
          desde: r.updated_at,
        } satisfies DeudaBanca,
      ]
    }),
    transferencias: transferencias.map((r) => ({
      posicionId: r.id,
      playerId: r.player_id,
      name: nombres.get(r.player_id) ?? 'Sin nombre',
      monto: Number(r.monto),
      eventoId: apuestaPorId.get(r.apuesta_id)?.eventoId ?? '',
      apuestaTipo: apuestaPorId.get(r.apuesta_id)?.tipo ?? 'pozo',
      avisadaAt: r.updated_at,
    })),
    jugadores: [...nombres.entries()].map(([id, name]) => {
      const cuenta = cuentasPorId.get(id)
      return {
        id,
        name,
        tienePin: Boolean(cuenta),
        habilitado: Boolean(cuenta?.habilitado),
        aliasCobro: cuenta?.alias_cobro ?? null,
        bloqueado: Boolean(cuenta?.bloqueado_hasta && Date.parse(cuenta.bloqueado_hasta) > Date.now()),
      }
    }),
    eventosActivos: (check(eventosRows, 'Eventos') ?? []).map(toEvento),
    partidas: (check(partidasRows, 'Partidas') ?? []).map((m) => ({
      id: m.id,
      map: m.map ?? 'Sin mapa',
      playedAt: m.played_at ?? null,
      equipos: `${m.team_a_name ?? 'Equipo A'} vs ${m.team_b_name ?? 'Equipo B'}`,
    })),
    enCustodia: (check(custodiaRows, 'Custodia') ?? []).reduce((acc, r) => acc + Number(r.monto), 0),
  }
}

/** La banca ya transfirió el premio (o el reintegro): queda registrado con una referencia. */
export async function marcarPremioPagado(posicionId: unknown, referencia: unknown) {
  if (!esUuid(posicionId)) throw new ApuestaError('Posición inválida')
  const ref = typeof referencia === 'string' ? referencia.trim().slice(0, 120) : ''
  const actualizada = check(
    await db()
      .from('apuestas_posiciones')
      .update({ premio_estado: 'pagado', premio_ref: ref || null, premio_pagado_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', posicionId)
      .eq('premio_estado', 'pendiente')
      .select('id, player_id, premio'),
    'No se pudo marcar el pago',
  )
  if (!actualizada?.length) throw new ApuestaError('Ese premio ya estaba pagado')
  await registrar('premio_pagado', { posicionId, playerId: actualizada[0].player_id }, { premio: actualizada[0].premio, ref })
}

/**
 * Modo manual: el admin vio (o no) la transferencia. Si la aprueba, la
 * posición queda pagada y, si es un duelo con los dos pagos, se confirma.
 */
export async function confirmarTransferencia(posicionId: unknown, aprobar: boolean) {
  if (!esUuid(posicionId)) throw new ApuestaError('Posición inválida')
  const row = check(await db().from('apuestas_posiciones').select('*').eq('id', posicionId).maybeSingle(), 'No se pudo cargar la posición')
  if (!row || row.estado !== 'en_proceso') throw new ApuestaError('Esa transferencia ya no está pendiente')

  if (!aprobar) {
    check(await db().from('apuestas_posiciones').update({ estado: 'pendiente', updated_at: new Date().toISOString() }).eq('id', posicionId).eq('estado', 'en_proceso'), 'No se pudo rechazar')
    await registrar('transferencia_rechazada', { posicionId, playerId: row.player_id })
    return
  }

  const apuesta = toApuesta(check(await db().from('apuestas').select('*').eq('id', row.apuesta_id).single(), 'Apuesta'))
  check(
    await db()
      .from('apuestas_posiciones')
      .update({ estado: 'pagada', pagada_at: new Date().toISOString(), monto_neto: row.monto, updated_at: new Date().toISOString() })
      .eq('id', posicionId)
      .eq('estado', 'en_proceso'),
    'No se pudo confirmar',
  )
  await registrar('transferencia_confirmada', { apuestaId: apuesta.id, posicionId, playerId: row.player_id }, { monto: row.monto })

  if (apuesta.tipo === 'duelo') {
    const posiciones = check(await db().from('apuestas_posiciones').select('estado').eq('apuesta_id', apuesta.id), 'Posiciones') ?? []
    if (posiciones.length === 2 && posiciones.every((p) => p.estado === 'pagada')) {
      await db().from('apuestas').update({ estado: 'confirmada' }).eq('id', apuesta.id).eq('estado', 'abierta')
    }
  }
}
