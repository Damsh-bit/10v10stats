import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { getSiteUrl } from '@/lib/apuestas/config'
import { esUuid } from '@/lib/apuestas/db'
import type { PagoMP } from '@/lib/apuestas/mercadopago'
import { getCartelConfig, getCartelProveedor } from './config'
import { buscarPagoCartel, crearPreferenciaCartel, obtenerPagoCartel, PREFIJO_REFERENCIA, reembolsarPagoCartel } from './mercadopago'
import {
  AUTOR_MAX,
  IMAGEN_MAX_BYTES,
  MENSAJE_MAX,
  MINUTOS_CHECKOUT,
  VOLVER_A,
  esEstilo,
  precioMinimo,
  type Cartel,
  type CartelEstado,
  type CartelHistorial,
  type EntradaHistorial,
  type JugadorMini,
  type RankingDonador,
  type RankingObjetivo,
  type VerificacionCartel,
  type VolverA,
} from './tipos'

/**
 * El Cartel, del lado del servidor: leer el cartel vigente y el historial,
 * abrir el checkout de una donación y aplicar los pagos que avisa Mercado Pago.
 *
 * Reglas de la plata (ver docs/cartel.md):
 * - El precio se chequea al abrir el checkout, pero lo que manda es el momento
 *   del pago: `cartel_aplicar_pago` (Postgres, de a uno) sólo le da el cartel
 *   al que supera al vigente. Si alguien le ganó de mano, se le devuelve.
 * - Un pago revertido (devolución o contracargo) baja ese cartel.
 */

export class CartelError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

const BUCKET = process.env.SUPABASE_TABULADOR_BUCKET ?? 'tabulador'
const COLUMNAS = 'id, autor, autor_player_id, objetivo_player_id, mensaje, imagen_url, estilo, monto, proveedor, estado, oculto, pagado_at'
/** El entorno local usa la misma base: los pagos simulados de `next dev` no salen en producción. */
const SIN_PRUEBAS = process.env.NODE_ENV === 'production'
/** Freno a los que abren checkouts (y suben fotos) sin pagar. */
const MAX_PENDIENTES_10_MIN = 20

type Fila = {
  id: string
  autor: string
  autor_player_id: string | null
  objetivo_player_id: string | null
  mensaje: string
  imagen_url: string | null
  estilo: string
  monto: number | string
  proveedor: string
  estado: string
  oculto: boolean
  pagado_at: string | null
}

function db() {
  const supabase = getSupabaseAdminClient()
  if (!supabase) throw new CartelError('El cartel necesita SUPABASE_SERVICE_ROLE_KEY', 503)
  return supabase
}

function check<T>(result: { data: T; error: { message: string; code?: string } | null }, contexto: string): T {
  if (result.error) {
    if (result.error.code === '42P01' || result.error.code === 'PGRST205') {
      throw new CartelError('Falta la tabla del cartel: corré la migración 20261003200000_cartel.sql', 503)
    }
    throw new CartelError(`${contexto}: ${result.error.message}`, 500)
  }
  return result.data
}

async function registrar(tipo: string, cartelId: string | null, detalle: Record<string, unknown> = {}) {
  try {
    const { error } = await db().from('carteles_log').insert({ tipo, cartel_id: cartelId, detalle })
    if (error) console.error('[cartel] no se pudo registrar el log', tipo, error.message)
  } catch (error) {
    console.error('[cartel] no se pudo registrar el log', tipo, error)
  }
}

function revalidar() {
  revalidatePath('/')
  revalidatePath('/cartel')
}

/** Pagados (los únicos que alguna vez estuvieron arriba). */
function pagados(columnas = COLUMNAS) {
  const query = db().from('carteles').select(columnas).eq('estado', 'pagado')
  return SIN_PRUEBAS ? query.neq('proveedor', 'prueba') : query
}

async function jugadoresPorId(ids: (string | null)[]): Promise<Record<string, JugadorMini>> {
  const unicos = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  if (unicos.length === 0) return {}
  const rows = check(await db().from('players').select('id, name, photo_url').in('id', unicos), 'No se pudieron cargar los jugadores')
  return Object.fromEntries(
    (rows ?? []).map((row: { id: string; name: string | null; photo_url: string | null }) => [
      row.id,
      { id: row.id, name: row.name ?? 'Sin nombre', photoUrl: row.photo_url ?? null },
    ]),
  )
}

function toCartel(row: Fila, jugadores: Record<string, JugadorMini>): Cartel {
  const oculto = Boolean(row.oculto)
  return {
    id: row.id,
    autor: row.autor,
    autorJugador: row.autor_player_id ? (jugadores[row.autor_player_id] ?? null) : null,
    objetivo: oculto || !row.objetivo_player_id ? null : (jugadores[row.objetivo_player_id] ?? null),
    // Un cartel bajado por la moderación no muestra nada de lo que decía.
    mensaje: oculto ? '' : row.mensaje,
    imagenUrl: oculto ? null : row.imagen_url,
    estilo: esEstilo(row.estilo) ? row.estilo : 'fuego',
    monto: Number(row.monto),
    esCasa: row.proveedor === 'casa',
    oculto,
    pagadoAt: row.pagado_at ?? new Date(0).toISOString(),
  }
}

async function maxPagado() {
  const rows = check(await pagados('monto').order('monto', { ascending: false }).limit(1), 'No se pudo leer el cartel')
  return Number((rows as { monto: number | string }[] | null)?.[0]?.monto ?? 0)
}

// ─── Lectura ────────────────────────────────────────────────────────────────

async function leerEstado(): Promise<CartelEstado> {
  const config = getCartelConfig()
  const rows = check(await pagados().order('monto', { ascending: false }).order('pagado_at', { ascending: true }).limit(15), 'No se pudo leer el cartel') as Fila[] | null
  const lista = rows ?? []
  const actualRow = lista.find((row) => !row.oculto) ?? null
  const jugadores = actualRow ? await jugadoresPorId([actualRow.autor_player_id, actualRow.objetivo_player_id]) : {}
  return {
    actual: actualRow ? toCartel(actualRow, jugadores) : null,
    precioMinimo: precioMinimo(Number(lista[0]?.monto ?? 0), config),
    config,
  }
}

/** Para la home: si algo falla (sin service role, sin migración) no rompe la página, sólo no hay cartel. */
export async function getCartelEstado(): Promise<CartelEstado | null> {
  if (!getSupabaseAdminClient()) return null
  try {
    return await leerEstado()
  } catch (error) {
    console.error('[cartel] no se pudo leer el cartel', error)
    return null
  }
}

export async function getCartelHistorial(): Promise<CartelHistorial | null> {
  if (!getSupabaseAdminClient()) return null
  try {
    const [estado, rows] = await Promise.all([
      leerEstado(),
      pagados().order('pagado_at', { ascending: true }).limit(500).then((r) => (check(r, 'No se pudo leer el historial') ?? []) as unknown as Fila[]),
    ])
    const jugadores = await jugadoresPorId(rows.flatMap((row) => [row.autor_player_id, row.objetivo_player_id]))
    const ahora = Date.now()

    // Cada uno estuvo arriba hasta que pagó el siguiente (los pagados suben siempre de precio).
    const cronologico: EntradaHistorial[] = rows.map((row, i) => ({
      ...toCartel(row, jugadores),
      hastaAt: rows[i + 1]?.pagado_at ?? null,
      sacadoPor: rows[i + 1]?.autor ?? null,
    }))

    const donadores = new Map<string, RankingDonador>()
    const objetivos = new Map<string, RankingObjetivo>()
    let totalDonado = 0
    rows.forEach((row, i) => {
      if (row.proveedor === 'casa') return
      const entrada = cronologico[i]
      const monto = Number(row.monto)
      totalDonado += monto

      const clave = row.autor_player_id ?? `nombre:${row.autor.trim().toLowerCase()}`
      const donador = donadores.get(clave) ?? { autor: row.autor, jugador: entrada.autorJugador, total: 0, carteles: 0, tiempoMs: 0 }
      donador.total += monto
      donador.carteles += 1
      donador.tiempoMs += (entrada.hastaAt ? Date.parse(entrada.hastaAt) : ahora) - Date.parse(entrada.pagadoAt)
      donadores.set(clave, donador)

      const objetivo = row.objetivo_player_id ? jugadores[row.objetivo_player_id] : null
      if (objetivo && !row.oculto) {
        const actual = objetivos.get(objetivo.id) ?? { jugador: objetivo, carteles: 0, plata: 0 }
        actual.carteles += 1
        actual.plata += monto
        objetivos.set(objetivo.id, actual)
      }
    })

    return {
      estado,
      entradas: cronologico.reverse(),
      donadores: [...donadores.values()].sort((a, b) => b.total - a.total || b.tiempoMs - a.tiempoMs),
      objetivos: [...objetivos.values()].sort((a, b) => b.carteles - a.carteles || b.plata - a.plata),
      totalDonado,
    }
  } catch (error) {
    console.error('[cartel] no se pudo leer el historial', error)
    return null
  }
}

/** Los jugadores para elegir quién firma y a quién va dirigido. */
export async function listarJugadores(): Promise<JugadorMini[]> {
  const supabase = getSupabaseAdminClient()
  if (!supabase) return []
  const { data } = await supabase.from('players').select('id, name, photo_url').order('name')
  return (data ?? []).map((row: { id: string; name: string | null; photo_url: string | null }) => ({
    id: row.id,
    name: row.name ?? 'Sin nombre',
    photoUrl: row.photo_url ?? null,
  }))
}

// ─── Donar ──────────────────────────────────────────────────────────────────

/** Tipo real del archivo por sus primeros bytes (no por lo que dice el navegador). */
function tipoDeImagen(bytes: Uint8Array): { mime: string; ext: string } | null {
  const empieza = (firma: number[], desde = 0) => firma.every((b, i) => bytes[desde + i] === b)
  if (empieza([0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' }
  if (empieza([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' }
  if (empieza([0x47, 0x49, 0x46, 0x38])) return { mime: 'image/gif', ext: 'gif' }
  if (empieza([0x52, 0x49, 0x46, 0x46]) && empieza([0x57, 0x45, 0x42, 0x50], 8)) return { mime: 'image/webp', ext: 'webp' }
  return null
}

const largo = (texto: string) => Array.from(texto).length

function campo(form: FormData, nombre: string) {
  const value = form.get(nombre)
  return typeof value === 'string' ? value : ''
}

/** Fotos de checkouts que nunca se pagaron: se borran a las 24 h. */
async function limpiarPendientesViejos() {
  try {
    const viejos = check(
      await db()
        .from('carteles')
        .select('id, imagen_path')
        .eq('estado', 'pendiente')
        .not('imagen_path', 'is', null)
        .lt('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
        .limit(20),
      'No se pudieron leer los pendientes',
    ) as { id: string; imagen_path: string }[] | null
    if (!viejos?.length) return
    await db().storage.from(BUCKET).remove(viejos.map((row) => row.imagen_path))
    await db()
      .from('carteles')
      .update({ imagen_path: null, imagen_url: null, updated_at: new Date().toISOString() })
      .in('id', viejos.map((row) => row.id))
  } catch (error) {
    console.error('[cartel] no se pudieron limpiar las fotos viejas', error)
  }
}

export async function crearCartel(form: FormData, requestUrl: string): Promise<{ id: string; url: string }> {
  const config = getCartelConfig()
  const proveedor = getCartelProveedor()
  if (!config.habilitado || !proveedor) throw new CartelError('El cartel todavía no está conectado a Mercado Pago', 503)

  const mensaje = campo(form, 'mensaje').replace(/\s+/g, ' ').trim()
  if (!mensaje) throw new CartelError('Escribí algo para el cartel')
  if (largo(mensaje) > MENSAJE_MAX) throw new CartelError(`El mensaje puede tener hasta ${MENSAJE_MAX} caracteres`)

  const autorPlayerId = esUuid(campo(form, 'autorPlayerId')) ? campo(form, 'autorPlayerId') : null
  const objetivoPlayerId = esUuid(campo(form, 'objetivoPlayerId')) ? campo(form, 'objetivoPlayerId') : null
  const jugadores = await jugadoresPorId([autorPlayerId, objetivoPlayerId])
  if (autorPlayerId && !jugadores[autorPlayerId]) throw new CartelError('No existe ese jugador')
  if (objetivoPlayerId && !jugadores[objetivoPlayerId]) throw new CartelError('No existe el jugador al que va dirigido')
  // Si firma un jugador, va su nombre tal cual está en la página.
  const autor = autorPlayerId ? jugadores[autorPlayerId].name : campo(form, 'autor').replace(/\s+/g, ' ').trim() || 'Anónimo'
  if (largo(autor) > AUTOR_MAX) throw new CartelError(`La firma puede tener hasta ${AUTOR_MAX} caracteres`)

  const estilo = esEstilo(campo(form, 'estilo')) ? campo(form, 'estilo') : 'fuego'
  const volverA: VolverA = (VOLVER_A as readonly string[]).includes(campo(form, 'volverA')) ? (campo(form, 'volverA') as VolverA) : '/'

  const monto = Number(campo(form, 'monto'))
  const precio = precioMinimo(await maxPagado(), config)
  if (!Number.isInteger(monto) || monto <= 0) throw new CartelError('El monto tiene que ser en pesos enteros')
  if (monto < precio) throw new CartelError(`Para sacar el cartel tenés que poner al menos $${precio.toLocaleString('es-AR')}`)
  if (monto > config.montoMax) throw new CartelError(`El máximo es $${config.montoMax.toLocaleString('es-AR')}`)

  const desde = new Date(Date.now() - 10 * 60_000).toISOString()
  const { count } = await db().from('carteles').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente').gte('created_at', desde)
  if ((count ?? 0) >= MAX_PENDIENTES_10_MIN) throw new CartelError('Hay muchos carteles esperando el pago. Probá en unos minutos.', 429)

  const id = randomUUID()
  let imagen: { url: string; path: string } | null = null
  const archivo = form.get('imagen')
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > IMAGEN_MAX_BYTES) throw new CartelError('La imagen no puede pasar los 3 MB')
    const bytes = new Uint8Array(await archivo.arrayBuffer())
    const tipo = tipoDeImagen(bytes)
    if (!tipo) throw new CartelError('La imagen tiene que ser JPG, PNG, WEBP o GIF')
    const path = `carteles/${id}.${tipo.ext}`
    const subida = await db().storage.from(BUCKET).upload(path, bytes, { contentType: tipo.mime, cacheControl: '31536000', upsert: false })
    if (subida.error) throw new CartelError(`No se pudo subir la imagen: ${subida.error.message}`, 500)
    imagen = { url: db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path }
  }

  const borrarImagen = async () => {
    if (imagen) await db().storage.from(BUCKET).remove([imagen.path])
  }

  const insert = await db()
    .from('carteles')
    .insert({
      id,
      autor,
      autor_player_id: autorPlayerId,
      objetivo_player_id: objetivoPlayerId,
      mensaje,
      imagen_url: imagen?.url ?? null,
      imagen_path: imagen?.path ?? null,
      estilo,
      monto,
      proveedor,
      estado: 'pendiente',
      precio_al_crear: precio,
      vence_at: new Date(Date.now() + MINUTOS_CHECKOUT * 60_000).toISOString(),
    })
  if (insert.error) {
    await borrarImagen()
    check(insert, 'No se pudo guardar el cartel')
  }

  await limpiarPendientesViejos()

  if (proveedor === 'prueba') {
    await registrar('checkout_prueba', id, { monto })
    return { id, url: `${volverA}?cartel=${id}&pago=ok` }
  }

  try {
    const preferencia = await crearPreferenciaCartel({
      cartelId: id,
      monto,
      descripcion: `Cartel de ${autor} · $${monto.toLocaleString('es-AR')}`,
      siteUrl: getSiteUrl(requestUrl),
      volverA,
    })
    await db().from('carteles').update({ checkout_id: preferencia.id, checkout_url: preferencia.init_point, updated_at: new Date().toISOString() }).eq('id', id)
    await registrar('checkout_creado', id, { preferencia: preferencia.id, monto })
    return { id, url: preferencia.init_point }
  } catch (error) {
    // Sin checkout no hay nada que pagar: no queda ni la fila ni la foto.
    await db().from('carteles').delete().eq('id', id).eq('estado', 'pendiente')
    await borrarImagen()
    throw error
  }
}

// ─── Pagos ──────────────────────────────────────────────────────────────────

/** Al volver del checkout: consulta Mercado Pago por si el aviso no llegó (o tardó). */
export async function verificarCartel(id: string): Promise<VerificacionCartel> {
  if (!esUuid(id)) throw new CartelError('Ese cartel no existe', 404)
  const leer = async () =>
    check(await db().from('carteles').select('id, estado, motivo, proveedor, monto').eq('id', id).maybeSingle(), 'No se pudo leer el cartel') as {
      estado: VerificacionCartel['estado']
      motivo: string | null
      proveedor: string
      monto: number | string
    } | null

  let row = await leer()
  if (!row) throw new CartelError('Ese cartel no existe', 404)

  if (row.estado === 'pendiente') {
    const proveedor = getCartelProveedor()
    if (row.proveedor === 'prueba' && proveedor === 'prueba') {
      // `next dev` sin Mercado Pago: el pago se da por hecho.
      await aplicar(id, `prueba-${id}`, Number(row.monto), Number(row.monto))
    } else if (row.proveedor === 'mercadopago' && proveedor === 'mercadopago') {
      const pago = await buscarPagoCartel(id)
      if (pago) await aplicarPagoCartel(pago)
    }
    row = (await leer()) ?? row
  }

  return { estado: row.estado, motivo: row.motivo, actual: await leerEstado() }
}

/** Lo llama el webhook con el id de pago que manda Mercado Pago. */
export async function procesarNotificacionCartel(pagoId: string) {
  await aplicarPagoCartel(await obtenerPagoCartel(pagoId))
}

async function aplicarPagoCartel(pago: PagoMP) {
  const referencia = pago.external_reference ?? ''
  if (!referencia.startsWith(PREFIJO_REFERENCIA)) return
  const id = referencia.slice(PREFIJO_REFERENCIA.length)
  if (!esUuid(id)) return
  const pagoId = String(pago.id)

  if (pago.status === 'refunded' || pago.status === 'charged_back') {
    const bajados = check(
      await db()
        .from('carteles')
        .update({ estado: 'devuelto', motivo: 'revertido', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('pago_id', pagoId)
        .eq('estado', 'pagado')
        .select('id'),
      'No se pudo bajar el cartel',
    )
    if (bajados?.length) {
      await registrar('pago_revertido', id, { pago: pagoId, status: pago.status })
      revalidar()
    }
    return
  }

  if (pago.status !== 'approved') {
    await registrar('pago_no_aprobado', id, { pago: pagoId, status: pago.status, detalle: pago.status_detail })
    return
  }

  // Otra moneda cuenta como monto distinto: se devuelve.
  const monto = pago.currency_id === 'ARS' ? pago.transaction_amount : -1
  await aplicar(id, pagoId, monto, pago.transaction_details?.net_received_amount ?? null)
}

async function aplicar(id: string, pagoId: string, monto: number, neto: number | null) {
  const resultado = check(
    await db().rpc('cartel_aplicar_pago', { p_cartel: id, p_pago_id: pagoId, p_monto: monto, p_neto: neto }),
    'No se pudo aplicar el pago',
  ) as string
  await registrar(`pago_${resultado}`, id, { pago: pagoId, monto })

  if (resultado === 'pagado') revalidar()
  // Alguien le ganó de mano, o Mercado Pago cobró otra cosa: se devuelve entero.
  if (resultado === 'superado' || resultado === 'monto_distinto') await devolver(id, pagoId)
  // Pagó dos veces el mismo cartel: el segundo pago se devuelve.
  if (resultado === 'otro_pago') await reembolsar(id, pagoId)
}

async function reembolsar(id: string, pagoId: string): Promise<string | null> {
  if (pagoId.startsWith('prueba-')) return pagoId
  try {
    const reembolso = await reembolsarPagoCartel(pagoId)
    await registrar('reembolso', id, { pago: pagoId, reembolso: reembolso.id })
    return String(reembolso.id)
  } catch (error) {
    // Queda `a_devolver`: hay que devolverlo a mano desde Mercado Pago.
    await registrar('reembolso_fallido', id, { pago: pagoId, error: String(error) })
    return null
  }
}

async function devolver(id: string, pagoId: string) {
  const reembolsoId = await reembolsar(id, pagoId)
  if (!reembolsoId) return
  await db()
    .from('carteles')
    .update({ estado: 'devuelto', reembolso_id: reembolsoId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('estado', 'a_devolver')
}

// ─── Moderación ─────────────────────────────────────────────────────────────

/** Bajar (o volver a mostrar) un cartel. El precio para sacarlo no cambia. */
export async function moderarCartel(id: string, oculto: boolean) {
  if (!esUuid(id)) throw new CartelError('Ese cartel no existe', 404)
  const rows = check(
    await db()
      .from('carteles')
      .update({ oculto, oculto_at: oculto ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('estado', 'pagado')
      .select('id'),
    'No se pudo moderar el cartel',
  )
  if (!rows?.length) throw new CartelError('Ese cartel no existe', 404)
  await registrar(oculto ? 'moderacion_ocultar' : 'moderacion_mostrar', id)
  revalidar()
}
