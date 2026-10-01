import { getSupabaseAdminClient } from '@/lib/supabase'
import type { Apuesta, Evento, JugadorMini, Posicion } from './tipos'

/** Error con mensaje para mostrarle al jugador y status HTTP. */
export class ApuestaError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

/** Las tablas de apuestas sólo se tocan con la service role (RLS sin políticas). */
export function db() {
  const supabase = getSupabaseAdminClient()
  if (!supabase) throw new ApuestaError('Las apuestas necesitan SUPABASE_SERVICE_ROLE_KEY', 503)
  return supabase
}

/** Tira el error de Supabase con un mensaje entendible. */
export function check<T>(result: { data: T; error: { message: string; code?: string } | null }, contexto: string): T {
  if (result.error) {
    // 42P01: la tabla no existe → falta correr la migración.
    if (result.error.code === '42P01' || result.error.code === 'PGRST205') {
      throw new ApuestaError('Faltan las tablas de apuestas: corré la migración 20261001150000_apuestas.sql', 503)
    }
    throw new ApuestaError(`${contexto}: ${result.error.message}`, 500)
  }
  return result.data
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function esUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

const num = (value: unknown) => (value === null || value === undefined ? null : Number(value))

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toEvento(row: any): Evento {
  return {
    id: row.id,
    creadoPor: row.creado_por ?? null,
    mapa: row.mapa ?? null,
    equipoANombre: row.equipo_a_nombre,
    equipoBNombre: row.equipo_b_nombre,
    equipoA: row.equipo_a ?? [],
    equipoB: row.equipo_b ?? [],
    probA: Number(row.prob_a),
    cuotas: row.cuotas ?? {},
    estado: row.estado,
    cierraAt: row.cierra_at,
    matchId: row.match_id ?? null,
    ganador: row.ganador ?? null,
    createdAt: row.created_at,
    cerradoAt: row.cerrado_at ?? null,
    resueltoAt: row.resuelto_at ?? null,
  }
}

export function toApuesta(row: any): Apuesta {
  return {
    id: row.id,
    eventoId: row.evento_id,
    tipo: row.tipo,
    mercado: row.mercado,
    retadorId: row.retador_id ?? null,
    rivalId: row.rival_id ?? null,
    ladoRetador: row.lado_retador ?? null,
    montoRetador: num(row.monto_retador),
    montoRival: num(row.monto_rival),
    prob: num(row.prob),
    montoMinimo: num(row.monto_minimo),
    estado: row.estado,
    motivo: row.motivo ?? null,
    resultado: row.resultado ?? null,
    mensaje: row.mensaje ?? null,
    createdAt: row.created_at,
    liquidadaAt: row.liquidada_at ?? null,
  }
}

/** `viewerId`: sólo el dueño de la posición ve su link de pago. */
export function toPosicion(row: any, viewerId?: string | null): Posicion {
  return {
    id: row.id,
    apuestaId: row.apuesta_id,
    playerId: row.player_id,
    lado: row.lado,
    monto: Number(row.monto),
    recargo: Number(row.recargo ?? 0),
    estado: row.estado,
    proveedor: row.proveedor ?? null,
    checkoutUrl: viewerId && viewerId === row.player_id ? (row.checkout_url ?? null) : null,
    pagadaAt: row.pagada_at ?? null,
    resultado: row.resultado ?? null,
    premio: num(row.premio),
    premioEstado: row.premio_estado ?? null,
    createdAt: row.created_at,
  }
}

export function toJugadorMini(row: any): JugadorMini {
  return { id: row.id, name: row.name ?? 'Sin nombre', photoUrl: row.photo_url ?? null }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function jugadoresPorId(ids: string[]): Promise<Record<string, JugadorMini>> {
  const unicos = [...new Set(ids.filter(Boolean))]
  if (unicos.length === 0) return {}
  const rows = check(await db().from('players').select('id, name, photo_url').in('id', unicos), 'No se pudieron cargar los jugadores')
  return Object.fromEntries((rows ?? []).map((row) => [row.id, toJugadorMini(row)]))
}

/** Auditoría: nunca corta la operación si falla el log. */
export async function registrar(
  tipo: string,
  refs: { eventoId?: string | null; apuestaId?: string | null; posicionId?: string | null; playerId?: string | null },
  detalle: Record<string, unknown> = {},
) {
  try {
    await db()
      .from('apuestas_log')
      .insert({
        tipo,
        evento_id: refs.eventoId ?? null,
        apuesta_id: refs.apuestaId ?? null,
        posicion_id: refs.posicionId ?? null,
        player_id: refs.playerId ?? null,
        detalle,
      })
  } catch (error) {
    console.error('[apuestas] no se pudo registrar el log', tipo, error)
  }
}
