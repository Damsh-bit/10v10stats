import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { esUuid } from '@/lib/apuestas/db'

/**
 * Lo social del perfil, del lado del servidor: los "me gusta" (uno por
 * navegador) y las recomendaciones anónimas (se ocultan solas con 3 reportes).
 * Las tablas sólo se tocan con el service role (ver la migración
 * 20261007120000_perfil_jugador.sql).
 */

export const RECOMENDACION_MIN = 3
export const RECOMENDACION_MAX = 280

const RECOMENDACIONES_POR_IP_10_MIN = 4
const ME_GUSTA_POR_IP_10_MIN = 40
const LISTA_MAX = 100

export type Recomendacion = { id: string; texto: string; creadaAt: string }
export type EstadoMeGusta = { total: number; mio: boolean }

export class PerfilError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

function db() {
  const supabase = getSupabaseAdminClient()
  if (!supabase) throw new PerfilError('El perfil social necesita SUPABASE_SERVICE_ROLE_KEY', 503)
  return supabase
}

function check<T>(result: { data: T; error: { message: string; code?: string } | null }, contexto: string): T {
  if (result.error) {
    if (result.error.code === '42P01' || result.error.code === 'PGRST205' || result.error.code === 'PGRST202') {
      throw new PerfilError('Faltan las tablas del perfil: corré la migración 20261007120000_perfil_jugador.sql', 503)
    }
    if (result.error.code === '23503') throw new PerfilError('Ese jugador no existe', 404)
    throw new PerfilError(`${contexto}: ${result.error.message}`, 500)
  }
  return result.data
}

/** IP del pedido, hasheada con una sal del servidor: alcanza para frenar el spam sin guardarla. */
export function hashIp(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'local'
  const sal = process.env.PERFIL_SAL ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createHash('sha256').update(`perfil:${sal}:${ip}`).digest('hex').slice(0, 40)
}

/** El id tiene que ser un uuid; si no, 400 con `mensaje`. */
export function idValido(value: unknown, mensaje: string): string {
  if (!esUuid(value)) throw new PerfilError(mensaje)
  return value
}

function haceDiezMinutos() {
  return new Date(Date.now() - 10 * 60 * 1000).toISOString()
}

// ─── Me gusta ─────────────────────────────────────────────────────────────────

export async function estadoMeGusta(playerId: string, deviceId: string | null): Promise<EstadoMeGusta> {
  const { count, error } = await db().from('player_likes').select('player_id', { count: 'exact', head: true }).eq('player_id', playerId)
  check({ data: null, error }, 'No se pudieron contar los me gusta')

  let mio = false
  if (deviceId) {
    const rows = check(
      await db().from('player_likes').select('player_id').eq('player_id', playerId).eq('device_id', deviceId).limit(1),
      'No se pudo leer tu me gusta',
    )
    mio = (rows?.length ?? 0) > 0
  }
  return { total: count ?? 0, mio }
}

export async function cambiarMeGusta(playerId: string, deviceId: string, quiero: boolean, ipHash: string): Promise<EstadoMeGusta> {
  if (quiero) {
    const { count, error } = await db()
      .from('player_likes')
      .select('player_id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', haceDiezMinutos())
    check({ data: null, error }, 'No se pudo revisar el límite')
    if ((count ?? 0) >= ME_GUSTA_POR_IP_10_MIN) throw new PerfilError('Demasiados me gusta seguidos. Probá en unos minutos.', 429)

    check(
      await db()
        .from('player_likes')
        .upsert({ player_id: playerId, device_id: deviceId, ip_hash: ipHash }, { onConflict: 'player_id,device_id', ignoreDuplicates: true }),
      'No se pudo guardar el me gusta',
    )
  } else {
    check(await db().from('player_likes').delete().eq('player_id', playerId).eq('device_id', deviceId), 'No se pudo sacar el me gusta')
  }
  return estadoMeGusta(playerId, deviceId)
}

/** Total de me gusta para el render del servidor: si la base falla, el botón lo trae solo después. */
export async function contarMeGusta(playerId: string): Promise<number | null> {
  try {
    return (await estadoMeGusta(playerId, null)).total
  } catch {
    return null
  }
}

// ─── Recomendaciones anónimas ────────────────────────────────────────────────

type FilaRecomendacion = { id: string; content: string; created_at: string }

const toRecomendacion = (row: FilaRecomendacion): Recomendacion => ({ id: row.id, texto: row.content, creadaAt: row.created_at })

export async function listarRecomendaciones(playerId: string): Promise<Recomendacion[]> {
  const rows = check(
    await db()
      .from('player_recommendations')
      .select('id, content, created_at')
      .eq('player_id', playerId)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(LISTA_MAX),
    'No se pudieron cargar las recomendaciones',
  )
  return ((rows ?? []) as FilaRecomendacion[]).map(toRecomendacion)
}

/** Sin espacios de más ni renglones vacíos en cadena. */
export function limpiarTexto(texto: unknown) {
  if (typeof texto !== 'string') return ''
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function crearRecomendacion(playerId: string, texto: unknown, ipHash: string): Promise<Recomendacion> {
  const contenido = limpiarTexto(texto)
  if (contenido.length < RECOMENDACION_MIN) throw new PerfilError(`Escribí al menos ${RECOMENDACION_MIN} letras`)
  if (contenido.length > RECOMENDACION_MAX) throw new PerfilError(`Máximo ${RECOMENDACION_MAX} caracteres`)

  const { count, error } = await db()
    .from('player_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', haceDiezMinutos())
  check({ data: null, error }, 'No se pudo revisar el límite')
  if ((count ?? 0) >= RECOMENDACIONES_POR_IP_10_MIN) {
    throw new PerfilError('Ya dejaste varias recomendaciones. Esperá unos minutos para la próxima.', 429)
  }

  const repetida = check(
    await db().from('player_recommendations').select('id').eq('player_id', playerId).eq('content', contenido).limit(1),
    'No se pudo revisar si estaba repetida',
  )
  if ((repetida?.length ?? 0) > 0) throw new PerfilError('Esa recomendación ya está', 409)

  const fila = check(
    await db()
      .from('player_recommendations')
      .insert({ player_id: playerId, content: contenido, ip_hash: ipHash })
      .select('id, content, created_at')
      .single(),
    'No se pudo guardar la recomendación',
  )
  return toRecomendacion(fila as FilaRecomendacion)
}

export async function reportarRecomendacion(recomendacionId: string, deviceId: string): Promise<{ oculta: boolean }> {
  const oculta = check(
    await db().rpc('player_recommendation_report', { p_recommendation: recomendacionId, p_device: deviceId }),
    'No se pudo reportar',
  )
  return { oculta: Boolean(oculta) }
}

export function respuestaErrorPerfil(error: unknown) {
  if (error instanceof PerfilError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('[perfil]', error)
  return NextResponse.json({ error: 'Algo salió mal' }, { status: 500 })
}
