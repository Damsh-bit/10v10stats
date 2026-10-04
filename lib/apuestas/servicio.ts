import { matchScore } from '@/lib/team-history'
import { getApuestasConfig, getSiteUrl, HORAS_CIERRE_OPCIONES } from './config'
import { calcularRecargo, claveDuelo, otroLado, probRendimiento, redondearCentavos, type Lado } from './cuotas'
import { ApuestaError, check, db, esUuid, jugadoresPorId, registrar, toApuesta, toEvento, toPosicion } from './db'
import { liquidarPosiciones, resultadoDeApuesta, ganadorDelEvento } from './liquidacion'
import { buscarPagoDePosicion, crearPreferencia, obtenerPago, reembolsarPago, type PagoMP } from './mercadopago'
import type {
  Apuesta,
  ApuestaConPosiciones,
  CuotasEvento,
  Evento,
  EventoDetalle,
  EventoResumen,
  Mercado,
  Posicion,
  RankingApostador,
  ResultadoPartida,
} from './tipos'

/**
 * Todo lo que mueve estado en las apuestas. Cada transición se hace con un
 * update condicionado al estado anterior (`.eq('estado', …)`): si dos pedidos
 * llegan juntos (doble click, webhook repetido) sólo uno pasa.
 *
 * Ciclo de un evento:
 *   abierto ──(cierre manual o vence el plazo)──▶ en_juego ──(se carga la partida)──▶ resuelto
 *      └────────────────(admin o creador sin plata en juego)──────────────▶ cancelado
 *
 * Ciclo de un duelo:  propuesta ─aceptar─▶ abierta ─pagan los dos─▶ confirmada ─partida─▶ liquidada
 * Ciclo del pozo:     abierta ─cierre con plata de los dos lados─▶ confirmada ─partida─▶ liquidada
 * Cualquiera puede terminar "anulada" (rechazo, vencimiento, cancelación): lo pagado se devuelve.
 */

const ESTADOS_ACTIVOS = ['propuesta', 'abierta', 'confirmada'] as const
/** Una partida cargada resuelve sola los eventos de las últimas horas con los mismos 10. */
const HORAS_AUTO_RESOLUCION = 24

// ─── Lecturas ───────────────────────────────────────────────────────────────

function abiertoParaApostar(evento: Evento) {
  return evento.estado === 'abierto' && Date.parse(evento.cierraAt) > Date.now()
}

async function cargarEvento(id: string): Promise<Evento> {
  if (!esUuid(id)) throw new ApuestaError('Evento inválido', 404)
  const row = check(await db().from('apuestas_eventos').select('*').eq('id', id).maybeSingle(), 'No se pudo cargar el evento')
  if (!row) throw new ApuestaError('No existe ese evento', 404)
  return toEvento(row)
}

async function cargarApuesta(id: string): Promise<Apuesta> {
  if (!esUuid(id)) throw new ApuestaError('Apuesta inválida', 404)
  const row = check(await db().from('apuestas').select('*').eq('id', id).maybeSingle(), 'No se pudo cargar la apuesta')
  if (!row) throw new ApuestaError('No existe esa apuesta', 404)
  return toApuesta(row)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function cargarPosicionRow(id: string): Promise<any> {
  if (!esUuid(id)) throw new ApuestaError('Posición inválida', 404)
  const row = check(await db().from('apuestas_posiciones').select('*').eq('id', id).maybeSingle(), 'No se pudo cargar la posición')
  if (!row) throw new ApuestaError('No existe esa posición', 404)
  return row
}

async function posicionesDe(apuestaIds: string[]): Promise<any[]> {
  if (apuestaIds.length === 0) return []
  return check(await db().from('apuestas_posiciones').select('*').in('apuesta_id', apuestaIds).order('created_at'), 'No se pudieron cargar las posiciones') ?? []
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function obtenerEvento(id: string, viewerId?: string | null): Promise<EventoDetalle> {
  await mantenimiento(id)
  const evento = await cargarEvento(id)
  const apuestas = (check(await db().from('apuestas').select('*').eq('evento_id', id).order('created_at'), 'No se pudieron cargar las apuestas') ?? []).map(toApuesta)
  const posiciones = await posicionesDe(apuestas.map((a) => a.id))

  const conPosiciones: ApuestaConPosiciones[] = apuestas.map((apuesta) => ({
    ...apuesta,
    posiciones: posiciones.filter((p) => p.apuesta_id === apuesta.id).map((p) => toPosicion(p, viewerId)),
  }))

  const ids = [
    ...evento.equipoA,
    ...evento.equipoB,
    ...posiciones.map((p) => p.player_id as string),
    ...apuestas.flatMap((a) => [a.retadorId ?? '', a.rivalId ?? '']),
  ]

  return {
    evento,
    jugadores: await jugadoresPorId(ids),
    pozo: conPosiciones.find((a) => a.tipo === 'pozo') ?? null,
    duelos: conPosiciones.filter((a) => a.tipo === 'duelo').reverse(),
  }
}

export async function listarEventos(limite = 20): Promise<EventoResumen[]> {
  await mantenimiento()
  const eventos = (check(await db().from('apuestas_eventos').select('*').order('created_at', { ascending: false }).limit(limite), 'No se pudieron cargar los eventos') ?? []).map(toEvento)
  if (eventos.length === 0) return []

  const apuestas = (check(await db().from('apuestas').select('*').in('evento_id', eventos.map((e) => e.id)), 'No se pudieron cargar las apuestas') ?? []).map(toApuesta)
  const posiciones = await posicionesDe(apuestas.map((a) => a.id))
  const apuestaPorId = new Map(apuestas.map((a) => [a.id, a]))

  return eventos.map((evento) => {
    const pozo = { A: 0, B: 0 }
    let enJuego = 0
    for (const p of posiciones) {
      const apuesta = apuestaPorId.get(p.apuesta_id)
      if (!apuesta || apuesta.eventoId !== evento.id || p.estado !== 'pagada') continue
      enJuego += Number(p.monto)
      if (apuesta.tipo === 'pozo') pozo[p.lado as Lado] += Number(p.monto)
    }
    const duelos = apuestas.filter((a) => a.eventoId === evento.id && a.tipo === 'duelo' && a.estado !== 'anulada').length
    return { evento, enJuego, pozo, duelos }
  })
}

/** Balance de cada apostador con las apuestas ya liquidadas (las devueltas no cuentan). */
export async function ranking(): Promise<RankingApostador[]> {
  const rows = check(
    await db().from('apuestas_posiciones').select('player_id, monto, premio, resultado').in('resultado', ['gana', 'pierde']),
    'No se pudo armar el ranking',
  ) ?? []
  const porJugador = new Map<string, { apostado: number; cobrado: number; ganadas: number; perdidas: number }>()
  for (const row of rows) {
    const acc = porJugador.get(row.player_id) ?? { apostado: 0, cobrado: 0, ganadas: 0, perdidas: 0 }
    acc.apostado += Number(row.monto)
    acc.cobrado += Number(row.premio ?? 0)
    if (row.resultado === 'gana') acc.ganadas++
    else acc.perdidas++
    porJugador.set(row.player_id, acc)
  }
  const jugadores = await jugadoresPorId([...porJugador.keys()])
  return [...porJugador.entries()]
    .map(([playerId, acc]) => ({
      playerId,
      name: jugadores[playerId]?.name ?? 'Sin nombre',
      photoUrl: jugadores[playerId]?.photoUrl ?? null,
      ...acc,
      neto: redondearCentavos(acc.cobrado - acc.apostado),
    }))
    .sort((a, b) => b.neto - a.neto)
}

// ─── Eventos ────────────────────────────────────────────────────────────────

export type CrearEventoInput = {
  equipoA: string[]
  equipoB: string[]
  probA: number
  mapa?: string | null
  equipoANombre?: string
  equipoBNombre?: string
  cuotas?: CuotasEvento
  horas?: number
}

/** Congela los equipos del generador y abre el pozo. Si ya hay uno abierto con los mismos equipos, devuelve ese. */
export async function crearEvento(input: CrearEventoInput, creadorId: string): Promise<string> {
  const config = getApuestasConfig()
  const equipoA = [...new Set(input.equipoA ?? [])]
  const equipoB = [...new Set(input.equipoB ?? [])]
  const todos = [...equipoA, ...equipoB]

  if (equipoA.length < 1 || equipoB.length < 1 || equipoA.length > 10 || equipoB.length > 10) throw new ApuestaError('Equipos inválidos')
  if (!todos.every(esUuid)) throw new ApuestaError('Jugadores inválidos')
  if (new Set(todos).size !== todos.length) throw new ApuestaError('Un jugador no puede estar en los dos equipos')
  if (!(input.probA > 0.02 && input.probA < 0.98)) throw new ApuestaError('Chance inválida')

  const existentes = await jugadoresPorId(todos)
  if (Object.keys(existentes).length !== todos.length) throw new ApuestaError('Hay jugadores que no existen')

  const horas = HORAS_CIERRE_OPCIONES.includes(input.horas as (typeof HORAS_CIERRE_OPCIONES)[number]) ? input.horas! : 3
  const duelos: Record<string, number> = {}
  for (const [clave, prob] of Object.entries(input.cuotas?.duelos ?? {})) {
    const [a, b] = clave.split('|')
    if (todos.includes(a) && todos.includes(b) && a !== b && typeof prob === 'number' && prob > 0 && prob < 1) {
      duelos[claveDuelo(a, b)] = a < b ? prob : 1 - prob
    }
  }

  // Mismo evento abierto (mismos equipos): no se duplica.
  const abiertos = (check(await db().from('apuestas_eventos').select('*').eq('estado', 'abierto'), 'No se pudieron cargar los eventos') ?? []).map(toEvento)
  const mismoSet = (x: string[], y: string[]) => x.length === y.length && x.every((id) => y.includes(id))
  const repetido = abiertos.find((e) => abiertoParaApostar(e) && mismoSet(e.equipoA, equipoA) && mismoSet(e.equipoB, equipoB))
  if (repetido) return repetido.id

  const evento = check(
    await db()
      .from('apuestas_eventos')
      .insert({
        creado_por: creadorId,
        mapa: input.mapa?.slice(0, 40) || null,
        equipo_a_nombre: input.equipoANombre?.slice(0, 40) || 'Equipo 1',
        equipo_b_nombre: input.equipoBNombre?.slice(0, 40) || 'Equipo 2',
        equipo_a: equipoA,
        equipo_b: equipoB,
        prob_a: Math.round(input.probA * 10000) / 10000,
        cuotas: {
          duelos,
          fuente: typeof input.cuotas?.fuente === 'string' ? input.cuotas.fuente.slice(0, 40) : undefined,
          pesoFaceit: typeof input.cuotas?.pesoFaceit === 'number' ? input.cuotas.pesoFaceit : undefined,
        },
        cierra_at: new Date(Date.now() + horas * 3600_000).toISOString(),
      })
      .select('id')
      .single(),
    'No se pudo crear el evento',
  )
  if (!evento) throw new ApuestaError('No se pudo crear el evento', 500)

  check(
    await db().from('apuestas').insert({
      evento_id: evento.id,
      tipo: 'pozo',
      mercado: 'equipo',
      prob: Math.round(input.probA * 10000) / 10000,
      monto_minimo: config.montoMin,
      estado: 'abierta',
    }),
    'No se pudo abrir el pozo',
  )

  await registrar('evento_creado', { eventoId: evento.id, playerId: creadorId }, { equipoA, equipoB, probA: input.probA, horas })
  return evento.id
}

function ladoDe(evento: Evento, playerId: string): Lado | null {
  if (evento.equipoA.includes(playerId)) return 'A'
  if (evento.equipoB.includes(playerId)) return 'B'
  return null
}

function validarMonto(monto: unknown, minimo?: number | null): number {
  const config = getApuestasConfig()
  const min = Math.max(config.montoMin, minimo ?? 0)
  if (typeof monto !== 'number' || !Number.isInteger(monto)) throw new ApuestaError('El monto tiene que ser en pesos enteros')
  if (monto < min) throw new ApuestaError(`El mínimo es $${min.toLocaleString('es-AR')}`)
  if (monto > config.montoMax) throw new ApuestaError(`El máximo es $${config.montoMax.toLocaleString('es-AR')}`)
  return monto
}

/** Cierra las apuestas (arrancó la partida). Lo puede hacer quien abrió el evento o el admin. */
export async function cerrarEvento(eventoId: string, quien: { playerId?: string; admin?: boolean }) {
  const evento = await cargarEvento(eventoId)
  if (!quien.admin && evento.creadoPor !== quien.playerId) throw new ApuestaError('Sólo quien abrió las apuestas o el admin pueden cerrarlas', 403)
  if (evento.estado !== 'abierto') throw new ApuestaError('Las apuestas de esta partida ya están cerradas')
  await cerrarApuestasDelEvento(evento, quien.admin ? 'admin' : (quien.playerId ?? null))
}

/** Pasa el evento a "en juego" y ordena lo que quedó a medio camino. Idempotente. */
async function cerrarApuestasDelEvento(evento: Evento, quien: string | null) {
  const cerrado = check(
    await db()
      .from('apuestas_eventos')
      .update({ estado: 'en_juego', cerrado_at: new Date().toISOString() })
      .eq('id', evento.id)
      .eq('estado', 'abierto')
      .select('id'),
    'No se pudo cerrar el evento',
  )
  if (!cerrado?.length) return

  const apuestas = (check(await db().from('apuestas').select('*').eq('evento_id', evento.id).in('estado', ['propuesta', 'abierta']), 'No se pudieron cargar las apuestas') ?? []).map(toApuesta)
  const posiciones = await posicionesDe(apuestas.map((a) => a.id))

  for (const apuesta of apuestas) {
    const propias = posiciones.filter((p) => p.apuesta_id === apuesta.id)
    const pagadas = propias.filter((p) => p.estado === 'pagada')
    const lados = new Set(pagadas.map((p) => p.lado))

    if (apuesta.tipo === 'pozo' && lados.size === 2) {
      // El pozo corre con lo pagado; lo que no se pagó a tiempo queda afuera.
      await anularSinPagar(propias)
      check(await db().from('apuestas').update({ estado: 'confirmada' }).eq('id', apuesta.id).eq('estado', 'abierta'), 'No se pudo confirmar el pozo')
      continue
    }

    const motivo =
      apuesta.estado === 'propuesta'
        ? 'Nadie aceptó el duelo antes del cierre'
        : apuesta.tipo === 'pozo'
          ? 'Faltó plata de uno de los dos lados'
          : 'No pagaron los dos antes del cierre'
    await anularApuesta(apuesta, propias, motivo)
  }

  await registrar('evento_cerrado', { eventoId: evento.id }, { quien })
}

/** Cancela todo el evento: anula cada apuesta y devuelve lo pagado. */
export async function cancelarEvento(eventoId: string, quien: { playerId?: string; admin?: boolean }) {
  const evento = await cargarEvento(eventoId)
  if (evento.estado === 'resuelto' || evento.estado === 'cancelado') throw new ApuestaError('Ese evento ya terminó')

  const apuestas = (check(await db().from('apuestas').select('*').eq('evento_id', eventoId).in('estado', [...ESTADOS_ACTIVOS]), 'No se pudieron cargar las apuestas') ?? []).map(toApuesta)
  const posiciones = await posicionesDe(apuestas.map((a) => a.id))

  if (!quien.admin) {
    if (evento.creadoPor !== quien.playerId) throw new ApuestaError('Sólo quien abrió las apuestas o el admin pueden cancelarlas', 403)
    if (posiciones.some((p) => p.estado === 'pagada' || p.estado === 'en_proceso')) {
      throw new ApuestaError('Ya hay plata puesta: sólo el admin puede cancelar este evento', 403)
    }
  }

  const cancelado = check(
    await db()
      .from('apuestas_eventos')
      .update({ estado: 'cancelado', cerrado_at: evento.cerradoAt ?? new Date().toISOString(), resuelto_at: new Date().toISOString() })
      .eq('id', eventoId)
      .in('estado', ['abierto', 'en_juego'])
      .select('id'),
    'No se pudo cancelar el evento',
  )
  if (!cancelado?.length) return

  for (const apuesta of apuestas) {
    await anularApuesta(apuesta, posiciones.filter((p) => p.apuesta_id === apuesta.id), 'Se canceló la partida')
  }
  await registrar('evento_cancelado', { eventoId }, { quien: quien.admin ? 'admin' : quien.playerId })
}

// ─── Pozo y duelos ──────────────────────────────────────────────────────────

/** Entrar al pozo por equipos. Los que juegan sólo pueden ir con su propio equipo. */
export async function entrarAlPozo(eventoId: string, playerId: string, lado: unknown, monto: unknown): Promise<Posicion> {
  const evento = await cargarEvento(eventoId)
  if (!abiertoParaApostar(evento)) throw new ApuestaError('Las apuestas de esta partida ya cerraron')
  if (lado !== 'A' && lado !== 'B') throw new ApuestaError('Elegí un equipo')

  const propio = ladoDe(evento, playerId)
  if (propio && propio !== lado) throw new ApuestaError('No podés apostar en contra de tu propio equipo')

  const pozoRow = check(await db().from('apuestas').select('*').eq('evento_id', eventoId).eq('tipo', 'pozo').maybeSingle(), 'No se pudo cargar el pozo')
  if (!pozoRow) throw new ApuestaError('Esta partida no tiene pozo', 404)
  const pozo = toApuesta(pozoRow)
  if (pozo.estado !== 'abierta') throw new ApuestaError('El pozo ya no acepta entradas')
  const montoValido = validarMonto(monto, pozo.montoMinimo)

  const pendientes = check(
    await db().from('apuestas_posiciones').select('id').eq('apuesta_id', pozo.id).eq('player_id', playerId).in('estado', ['pendiente', 'en_proceso']),
    'No se pudieron cargar tus entradas',
  )
  if (pendientes?.length) throw new ApuestaError('Ya tenés una entrada sin pagar en este pozo: pagala o esperá a que se confirme')

  const config = getApuestasConfig()
  const row = check(
    await db()
      .from('apuestas_posiciones')
      .insert({
        apuesta_id: pozo.id,
        player_id: playerId,
        lado,
        monto: montoValido,
        recargo: calcularRecargo(montoValido, config.recargoPct),
        proveedor: config.proveedor,
      })
      .select('*')
      .single(),
    'No se pudo guardar tu entrada',
  )
  await registrar('pozo_entrada', { eventoId, apuestaId: pozo.id, posicionId: row.id, playerId }, { lado, monto: montoValido })
  return toPosicion(row, playerId)
}

export type DesafioInput = {
  rivalId: unknown
  mercado: unknown
  montoRetador: unknown
  montoRival: unknown
  mensaje?: unknown
}

/** Duelo 1v1: el retador propone, el rival acepta o rechaza. */
export async function desafiar(eventoId: string, retadorId: string, input: DesafioInput): Promise<Apuesta> {
  const evento = await cargarEvento(eventoId)
  if (!abiertoParaApostar(evento)) throw new ApuestaError('Las apuestas de esta partida ya cerraron')
  if (!esUuid(input.rivalId)) throw new ApuestaError('Elegí a quién desafiar')
  const rivalId = input.rivalId
  const mercado: Mercado = input.mercado === 'rendimiento' ? 'rendimiento' : 'equipo'

  const ladoRetador = ladoDe(evento, retadorId)
  const ladoRival = ladoDe(evento, rivalId)
  if (!ladoRetador) throw new ApuestaError('Para desafiar a alguien tenés que jugar esta partida')
  if (!ladoRival) throw new ApuestaError('Tu rival no juega esta partida')
  if (rivalId === retadorId) throw new ApuestaError('No te podés desafiar a vos mismo')
  if (mercado === 'equipo' && ladoRetador === ladoRival) {
    throw new ApuestaError('Están en el mismo equipo: desafialo a ver quién tiene mejor partida')
  }

  const montoRetador = validarMonto(input.montoRetador)
  const montoRival = validarMonto(input.montoRival)
  const mensaje = typeof input.mensaje === 'string' ? input.mensaje.trim().slice(0, 140) || null : null

  const activos = check(
    await db()
      .from('apuestas')
      .select('id, retador_id, rival_id')
      .eq('evento_id', eventoId)
      .eq('tipo', 'duelo')
      .eq('mercado', mercado)
      .in('estado', [...ESTADOS_ACTIVOS]),
    'No se pudieron cargar los duelos',
  ) ?? []
  const yaHay = activos.some(
    (d) => (d.retador_id === retadorId && d.rival_id === rivalId) || (d.retador_id === rivalId && d.rival_id === retadorId),
  )
  if (yaHay) throw new ApuestaError('Ya hay un duelo así entre ustedes dos en esta partida')

  const prob =
    mercado === 'equipo'
      ? ladoRetador === 'A'
        ? evento.probA
        : 1 - evento.probA
      : probRendimiento(evento.cuotas.duelos, retadorId, rivalId)

  const row = check(
    await db()
      .from('apuestas')
      .insert({
        evento_id: eventoId,
        tipo: 'duelo',
        mercado,
        retador_id: retadorId,
        rival_id: rivalId,
        lado_retador: ladoRetador,
        monto_retador: montoRetador,
        monto_rival: montoRival,
        prob: Math.round(prob * 10000) / 10000,
        estado: 'propuesta',
        mensaje,
      })
      .select('*')
      .single(),
    'No se pudo crear el desafío',
  )
  await registrar('duelo_propuesto', { eventoId, apuestaId: row.id, playerId: retadorId }, { rivalId, mercado, montoRetador, montoRival })
  return toApuesta(row)
}

export async function responderDuelo(apuestaId: string, playerId: string, accion: unknown) {
  const apuesta = await cargarApuesta(apuestaId)
  if (apuesta.tipo !== 'duelo') throw new ApuestaError('Eso no es un duelo')
  const evento = await cargarEvento(apuesta.eventoId)

  if (accion === 'aceptar' || accion === 'rechazar') {
    if (apuesta.rivalId !== playerId) throw new ApuestaError('Este desafío no es para vos', 403)
    if (apuesta.estado !== 'propuesta') throw new ApuestaError('Este desafío ya no está esperando respuesta')

    if (accion === 'rechazar') {
      await anularApuesta(apuesta, [], 'El rival lo rechazó')
      return
    }

    if (!abiertoParaApostar(evento)) throw new ApuestaError('Las apuestas de esta partida ya cerraron')
    const aceptada = check(
      await db().from('apuestas').update({ estado: 'abierta' }).eq('id', apuestaId).eq('estado', 'propuesta').select('id'),
      'No se pudo aceptar el desafío',
    )
    if (!aceptada?.length) throw new ApuestaError('Este desafío ya no está esperando respuesta')

    const config = getApuestasConfig()
    const ladoRetador = apuesta.ladoRetador ?? 'A'
    const montoRetador = apuesta.montoRetador ?? 0
    const montoRival = apuesta.montoRival ?? 0
    check(
      await db()
        .from('apuestas_posiciones')
        .insert([
          {
            apuesta_id: apuestaId,
            player_id: apuesta.retadorId,
            lado: ladoRetador,
            monto: montoRetador,
            recargo: calcularRecargo(montoRetador, config.recargoPct),
            proveedor: config.proveedor,
          },
          {
            apuesta_id: apuestaId,
            player_id: apuesta.rivalId,
            lado: otroLado(ladoRetador),
            monto: montoRival,
            recargo: calcularRecargo(montoRival, config.recargoPct),
            proveedor: config.proveedor,
          },
        ]),
      'No se pudieron crear los pagos del duelo',
    )
    await registrar('duelo_aceptado', { eventoId: evento.id, apuestaId, playerId })
    return
  }

  if (accion === 'cancelar') {
    if (apuesta.retadorId !== playerId) throw new ApuestaError('Sólo el que desafió puede cancelarlo', 403)
    if (apuesta.estado !== 'propuesta' && apuesta.estado !== 'abierta') throw new ApuestaError('Este duelo ya no se puede cancelar')
    const posiciones = await posicionesDe([apuestaId])
    if (posiciones.some((p) => p.estado === 'pagada' || p.estado === 'en_proceso')) {
      throw new ApuestaError('Ya hay plata puesta: pedile al admin que lo anule')
    }
    await anularApuesta(apuesta, posiciones, 'El retador lo canceló')
    return
  }

  throw new ApuestaError('Acción inválida')
}

// ─── Pagos ──────────────────────────────────────────────────────────────────

export type InicioPago =
  | { tipo: 'checkout'; url: string }
  | { tipo: 'manual'; alias: string; total: number }

/** Arranca el pago de una posición propia: link de Mercado Pago o datos para transferir. */
export async function iniciarPago(posicionId: string, playerId: string, requestUrl: string): Promise<InicioPago> {
  const row = await cargarPosicionRow(posicionId)
  if (row.player_id !== playerId) throw new ApuestaError('Esa apuesta no es tuya', 403)
  if (row.estado !== 'pendiente') throw new ApuestaError(row.estado === 'en_proceso' ? 'Ya avisaste que transferiste: falta que el admin lo confirme' : 'Esta apuesta no tiene nada para pagar')

  const apuesta = await cargarApuesta(row.apuesta_id)
  const evento = await cargarEvento(apuesta.eventoId)
  if (apuesta.estado !== 'abierta' || !abiertoParaApostar(evento)) throw new ApuestaError('Esta apuesta ya no recibe pagos')

  const config = getApuestasConfig()
  const total = redondearCentavos(Number(row.monto) + Number(row.recargo ?? 0))

  if (config.proveedor === 'manual') {
    if (!config.bancaAlias) throw new ApuestaError('Falta configurar APUESTAS_BANCA_ALIAS', 503)
    if (row.proveedor !== 'manual') await db().from('apuestas_posiciones').update({ proveedor: 'manual' }).eq('id', posicionId)
    return { tipo: 'manual', alias: config.bancaAlias, total }
  }
  if (config.proveedor !== 'mercadopago') throw new ApuestaError('No hay medio de pago configurado', 503)

  if (row.checkout_url && row.proveedor === 'mercadopago') return { tipo: 'checkout', url: row.checkout_url }

  const jugadores = await jugadoresPorId([playerId, apuesta.retadorId ?? '', apuesta.rivalId ?? ''])
  const titulo =
    apuesta.tipo === 'pozo'
      ? `Pozo 10v10 · ${row.lado === 'A' ? evento.equipoANombre : evento.equipoBNombre}`
      : `Duelo 10v10 · ${jugadores[apuesta.retadorId ?? '']?.name ?? '?'} vs ${jugadores[apuesta.rivalId ?? '']?.name ?? '?'}`

  const preferencia = await crearPreferencia({
    posicionId,
    titulo,
    descripcion: `${jugadores[playerId]?.name ?? 'Apuesta'} · $${Number(row.monto).toLocaleString('es-AR')}${Number(row.recargo) > 0 ? ' + comisión MP' : ''}`,
    total,
    venceAt: evento.cierraAt,
    siteUrl: getSiteUrl(requestUrl),
    volverA: `/apuestas/${evento.id}`,
  })

  const url = process.env.MERCADOPAGO_USE_SANDBOX === 'true' && preferencia.sandbox_init_point ? preferencia.sandbox_init_point : preferencia.init_point
  check(
    await db().from('apuestas_posiciones').update({ proveedor: 'mercadopago', checkout_id: preferencia.id, checkout_url: url, updated_at: new Date().toISOString() }).eq('id', posicionId),
    'No se pudo guardar el link de pago',
  )
  await registrar('checkout_creado', { eventoId: evento.id, apuestaId: apuesta.id, posicionId, playerId }, { preferencia: preferencia.id, total })
  return { tipo: 'checkout', url }
}

/** Modo manual: el jugador avisa que transfirió; el admin lo confirma cuando ve la plata. */
export async function avisarTransferencia(posicionId: string, playerId: string) {
  const row = await cargarPosicionRow(posicionId)
  if (row.player_id !== playerId) throw new ApuestaError('Esa apuesta no es tuya', 403)
  if (getApuestasConfig().proveedor !== 'manual') throw new ApuestaError('Los pagos se hacen por Mercado Pago')
  const actualizada = check(
    await db().from('apuestas_posiciones').update({ estado: 'en_proceso', proveedor: 'manual', updated_at: new Date().toISOString() }).eq('id', posicionId).eq('estado', 'pendiente').select('id'),
    'No se pudo guardar el aviso',
  )
  if (!actualizada?.length) throw new ApuestaError('Esta apuesta no tiene nada para pagar')
  await registrar('transferencia_avisada', { posicionId, playerId })
}

/** Vuelve a consultar Mercado Pago (por si el webhook no llegó o tardó). */
export async function verificarPago(posicionId: string) {
  const row = await cargarPosicionRow(posicionId)
  if (row.proveedor !== 'mercadopago' || row.estado !== 'pendiente') return toPosicion(row)
  const pago = await buscarPagoDePosicion(posicionId)
  if (pago) await aplicarPago(pago)
  return toPosicion(await cargarPosicionRow(posicionId))
}

/** Lo llama el webhook con el id de pago que manda Mercado Pago. */
export async function procesarNotificacionPago(pagoId: string) {
  const pago = await obtenerPago(pagoId)
  await aplicarPago(pago)
}

async function aplicarPago(pago: PagoMP) {
  const posicionId = pago.external_reference
  // Donaciones del cartel (si comparte la cuenta de la banca): las procesa /api/cartel/webhook.
  if (posicionId?.startsWith('cartel:')) return
  if (!esUuid(posicionId)) {
    await registrar('pago_desconocido', {}, { pago: pago.id, status: pago.status, external_reference: posicionId })
    return
  }
  const row = await cargarPosicionRow(posicionId).catch(() => null)
  if (!row) {
    await registrar('pago_sin_posicion', {}, { pago: pago.id, posicionId })
    return
  }
  const pagoId = String(pago.id)
  const refs = { apuestaId: row.apuesta_id, posicionId, playerId: row.player_id }

  if (pago.status === 'refunded' || pago.status === 'charged_back') {
    if (row.pago_id === pagoId && row.estado === 'pagada') {
      await db().from('apuestas_posiciones').update({ estado: 'reembolsada', reembolsada_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', posicionId)
      await registrar('pago_revertido', refs, { pago: pagoId, status: pago.status })
    }
    return
  }
  if (pago.status !== 'approved') {
    await registrar('pago_no_aprobado', refs, { pago: pagoId, status: pago.status, detalle: pago.status_detail })
    return
  }
  // Mismo pago ya aplicado (webhook repetido).
  if (row.pago_id === pagoId) return

  const esperado = redondearCentavos(Number(row.monto) + Number(row.recargo ?? 0))
  const montoOk = pago.currency_id === 'ARS' && Math.abs(pago.transaction_amount - esperado) <= 0.01
  const apuesta = await cargarApuesta(row.apuesta_id)
  const evento = await cargarEvento(apuesta.eventoId)
  const aTiempo = (row.estado === 'pendiente' || row.estado === 'en_proceso') && apuesta.estado === 'abierta' && evento.estado === 'abierto' && !row.pago_id

  if (!montoOk || !aTiempo) {
    // Llegó tarde, por otro monto o la posición ya tenía un pago: se devuelve entero.
    let reembolsoId: string | null = null
    try {
      reembolsoId = String((await reembolsarPago(pagoId)).id)
    } catch (error) {
      await registrar('reembolso_fallido', refs, { pago: pagoId, error: String(error) })
    }
    await registrar('pago_devuelto', refs, { pago: pagoId, montoOk, aTiempo, reembolsoId, esperado, recibido: pago.transaction_amount })
    if (!row.pago_id) {
      await db()
        .from('apuestas_posiciones')
        .update({
          pago_id: pagoId,
          estado: reembolsoId ? 'reembolsada' : row.estado === 'pendiente' ? 'anulada' : row.estado,
          reembolso_id: reembolsoId,
          reembolsada_at: reembolsoId ? new Date().toISOString() : null,
          // Si Mercado Pago no lo pudo devolver, le queda al admin como deuda.
          ...(reembolsoId ? {} : { resultado: 'devuelve', premio: pago.transaction_amount, premio_estado: 'pendiente' }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', posicionId)
    }
    return
  }

  const aplicada = check(
    await db()
      .from('apuestas_posiciones')
      .update({
        estado: 'pagada',
        pago_id: pagoId,
        monto_neto: pago.transaction_details?.net_received_amount ?? null,
        pagada_at: pago.date_approved ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', posicionId)
      .in('estado', ['pendiente', 'en_proceso'])
      .select('id'),
    'No se pudo marcar el pago',
  )
  if (!aplicada?.length) return
  await registrar('pago_aprobado', refs, { pago: pagoId, monto: pago.transaction_amount, neto: pago.transaction_details?.net_received_amount })
  await confirmarSiEstaCompleta(apuesta)
}

/** Duelo con los dos pagos adentro: queda confirmado. */
async function confirmarSiEstaCompleta(apuesta: Apuesta) {
  if (apuesta.tipo !== 'duelo') return
  const posiciones = await posicionesDe([apuesta.id])
  if (posiciones.length === 2 && posiciones.every((p) => p.estado === 'pagada')) {
    await db().from('apuestas').update({ estado: 'confirmada' }).eq('id', apuesta.id).eq('estado', 'abierta')
    await registrar('duelo_confirmado', { eventoId: apuesta.eventoId, apuestaId: apuesta.id })
  }
}

// ─── Anulaciones y devoluciones ─────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
async function anularSinPagar(posiciones: any[]) {
  for (const p of posiciones) {
    if (p.estado === 'pendiente') {
      await db().from('apuestas_posiciones').update({ estado: 'anulada', updated_at: new Date().toISOString() }).eq('id', p.id).eq('estado', 'pendiente')
    } else if (p.estado === 'en_proceso') {
      // Avisó que transfirió pero el admin no lo confirmó a tiempo: si la plata llegó, hay que devolvérsela.
      await db()
        .from('apuestas_posiciones')
        .update({ estado: 'anulada', resultado: 'devuelve', premio: Number(p.monto), premio_estado: 'pendiente', updated_at: new Date().toISOString() })
        .eq('id', p.id)
        .eq('estado', 'en_proceso')
    }
  }
}

/**
 * Devuelve una posición pagada: con Mercado Pago se reembolsa sola por la API;
 * si es manual (o la API falla) queda como "a devolver" en el panel del admin.
 */
async function devolver(p: any) {
  if (p.estado !== 'pagada') return
  if (p.proveedor === 'mercadopago' && p.pago_id) {
    try {
      const reembolso = await reembolsarPago(p.pago_id)
      await db()
        .from('apuestas_posiciones')
        .update({ estado: 'reembolsada', resultado: 'devuelve', premio: Number(p.monto), premio_estado: null, reembolso_id: String(reembolso.id), reembolsada_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', p.id)
      await registrar('reembolso', { apuestaId: p.apuesta_id, posicionId: p.id, playerId: p.player_id }, { pago: p.pago_id, reembolso: reembolso.id })
      return
    } catch (error) {
      await registrar('reembolso_fallido', { apuestaId: p.apuesta_id, posicionId: p.id, playerId: p.player_id }, { pago: p.pago_id, error: String(error) })
    }
  }
  await db()
    .from('apuestas_posiciones')
    .update({ resultado: 'devuelve', premio: Number(p.monto), premio_estado: 'pendiente', updated_at: new Date().toISOString() })
    .eq('id', p.id)
}

async function anularApuesta(apuesta: Apuesta, posiciones: any[], motivo: string) {
  const anulada = check(
    await db().from('apuestas').update({ estado: 'anulada', motivo, resultado: 'nula' }).eq('id', apuesta.id).in('estado', [...ESTADOS_ACTIVOS]).select('id'),
    'No se pudo anular la apuesta',
  )
  if (!anulada?.length) return
  await anularSinPagar(posiciones)
  for (const p of posiciones) await devolver(p)
  await registrar('apuesta_anulada', { eventoId: apuesta.eventoId, apuestaId: apuesta.id }, { motivo })
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** El admin anula una apuesta puntual (p. ej. se pelearon y no se juega). */
export async function anularApuestaAdmin(apuestaId: string, motivo?: string) {
  const apuesta = await cargarApuesta(apuestaId)
  if (apuesta.estado === 'liquidada' || apuesta.estado === 'anulada') throw new ApuestaError('Esa apuesta ya terminó')
  await anularApuesta(apuesta, await posicionesDe([apuestaId]), motivo?.slice(0, 120) || 'La anuló el admin')
}

// ─── Resolución ─────────────────────────────────────────────────────────────

async function cargarResultadoPartida(matchId: string): Promise<ResultadoPartida> {
  if (!esUuid(matchId)) throw new ApuestaError('Partida inválida', 404)
  const match = check(
    await db().from('matches').select('id, winner_team, score_ct, score_t, match_players(player_id, team, won, kills, deaths, assists, damage, is_guest)').eq('id', matchId).maybeSingle(),
    'No se pudo cargar la partida',
  )
  if (!match) throw new ApuestaError('No existe esa partida', 404)

  const jugadores: ResultadoPartida['jugadores'] = {}
  for (const entry of match.match_players ?? []) {
    if (entry.is_guest) continue
    jugadores[entry.player_id] = {
      equipo: entry.team,
      gano: Boolean(entry.won),
      puntaje: matchScore({ kills: entry.kills ?? 0, deaths: entry.deaths ?? 0, assists: entry.assists ?? 0, damage: entry.damage ?? 0 }),
    }
  }
  const empate = match.winner_team === 'EMPATE' || match.score_ct === match.score_t
  return { matchId, empate, jugadores }
}

/** Liquida todo el evento con la partida real. Lo usan el admin y la carga automática. */
export async function resolverEvento(eventoId: string, matchId: string, quien: string) {
  let evento = await cargarEvento(eventoId)
  if (evento.estado === 'resuelto' || evento.estado === 'cancelado') throw new ApuestaError('Ese evento ya terminó')
  if (evento.estado === 'abierto') {
    await cerrarApuestasDelEvento(evento, quien)
    evento = await cargarEvento(eventoId)
  }

  const partida = await cargarResultadoPartida(matchId)
  const { ganador } = ganadorDelEvento(evento, partida)

  const apuestas = (check(await db().from('apuestas').select('*').eq('evento_id', eventoId).eq('estado', 'confirmada'), 'No se pudieron cargar las apuestas') ?? []).map(toApuesta)
  const posiciones = await posicionesDe(apuestas.map((a) => a.id))

  for (const apuesta of apuestas) {
    const pagadas = posiciones.filter((p) => p.apuesta_id === apuesta.id && p.estado === 'pagada' && !p.resultado)
    const { resultado, motivo } = resultadoDeApuesta(apuesta, evento, partida)
    const items = liquidarPosiciones(pagadas.map((p) => ({ id: p.id, lado: p.lado, monto: Number(p.monto) })), resultado)
    const final = items.every((i) => i.resultado === 'devuelve') ? 'nula' : resultado

    const { data: liquidada, error } = await db().rpc('apuestas_liquidar', { p_apuesta: apuesta.id, p_resultado: final, p_items: items })
    if (error) throw new ApuestaError(`No se pudo liquidar: ${error.message}`, 500)
    if (!liquidada) continue
    if (motivo) await db().from('apuestas').update({ motivo }).eq('id', apuesta.id)
    await registrar('apuesta_liquidada', { eventoId, apuestaId: apuesta.id }, { resultado: final, motivo, items })

    // Las devoluciones por Mercado Pago salen solas; los premios los transfiere el admin.
    for (const item of items) {
      if (item.resultado !== 'devuelve') continue
      const p = pagadas.find((x) => x.id === item.id)
      if (p?.proveedor === 'mercadopago') await devolver({ ...p, resultado: null })
    }
  }

  check(
    await db()
      .from('apuestas_eventos')
      .update({ estado: 'resuelto', match_id: matchId, ganador, resuelto_at: new Date().toISOString() })
      .eq('id', eventoId)
      .eq('estado', 'en_juego'),
    'No se pudo cerrar el evento',
  )
  await registrar('evento_resuelto', { eventoId }, { matchId, ganador, quien })
}

/**
 * Se llama al cargar una partida: si hay un evento reciente con exactamente
 * los mismos jugadores, se liquida solo. Nunca hace fallar la carga.
 */
export async function resolverConPartidaNueva(matchId: string) {
  try {
    if (!getApuestasConfig().habilitadas) return
    const desde = new Date(Date.now() - HORAS_AUTO_RESOLUCION * 3600_000).toISOString()
    const eventos = (check(
      await db().from('apuestas_eventos').select('*').in('estado', ['abierto', 'en_juego']).gte('created_at', desde),
      'No se pudieron cargar los eventos',
    ) ?? []).map(toEvento)
    if (eventos.length === 0) return

    const partida = await cargarResultadoPartida(matchId)
    const jugaron = new Set(Object.keys(partida.jugadores))
    for (const evento of eventos) {
      const todos = [...evento.equipoA, ...evento.equipoB]
      if (todos.length === jugaron.size && todos.every((id) => jugaron.has(id))) {
        await resolverEvento(evento.id, matchId, 'auto')
      }
    }
  } catch (error) {
    console.error('[apuestas] no se pudo resolver con la partida nueva', error)
  }
}

/** Cierra los eventos que pasaron su hora de cierre. Se corre al leer (no hace falta cron). */
async function mantenimiento(eventoId?: string) {
  let query = db().from('apuestas_eventos').select('*').eq('estado', 'abierto').lt('cierra_at', new Date().toISOString())
  if (eventoId) query = query.eq('id', eventoId)
  const vencidos = (check(await query, 'No se pudieron cargar los eventos') ?? []).map(toEvento)
  for (const evento of vencidos) await cerrarApuestasDelEvento(evento, 'vencimiento')
}
