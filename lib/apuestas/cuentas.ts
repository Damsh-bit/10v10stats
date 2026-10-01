import { ApuestaError, check, db, esUuid, jugadoresPorId, registrar } from './db'
import { BLOQUEO_PIN_MIN, MAX_INTENTOS_PIN, hashPin, leerSesion, pinValido, verificarPin } from './sesion'
import type { JugadorMini, SesionJugador } from './tipos'

/** Jugadores con PIN para apostar (para el selector de "¿quién sos?"). */
export async function jugadoresHabilitados(): Promise<JugadorMini[]> {
  const rows = check(await db().from('apuestas_jugadores').select('player_id').eq('habilitado', true), 'No se pudieron cargar los jugadores') ?? []
  const jugadores = await jugadoresPorId(rows.map((r) => r.player_id))
  return Object.values(jugadores).sort((a, b) => a.name.localeCompare(b.name))
}

export async function iniciarSesion(playerId: unknown, pin: unknown): Promise<SesionJugador> {
  if (!esUuid(playerId)) throw new ApuestaError('Elegí quién sos')
  if (!pinValido(pin)) throw new ApuestaError('El PIN son de 4 a 8 números')

  const row = check(await db().from('apuestas_jugadores').select('*').eq('player_id', playerId).maybeSingle(), 'No se pudo validar el PIN')
  if (!row || !row.habilitado) throw new ApuestaError('Ese jugador no tiene PIN para apostar: pedíselo al admin', 401)
  if (row.bloqueado_hasta && Date.parse(row.bloqueado_hasta) > Date.now()) {
    throw new ApuestaError(`Demasiados intentos. Probá de nuevo en ${BLOQUEO_PIN_MIN} minutos`, 429)
  }

  if (!(await verificarPin(pin, row.pin_hash))) {
    const intentos = (row.intentos_fallidos ?? 0) + 1
    const bloquear = intentos >= MAX_INTENTOS_PIN
    await db()
      .from('apuestas_jugadores')
      .update({
        intentos_fallidos: bloquear ? 0 : intentos,
        bloqueado_hasta: bloquear ? new Date(Date.now() + BLOQUEO_PIN_MIN * 60_000).toISOString() : null,
      })
      .eq('player_id', playerId)
    if (bloquear) await registrar('pin_bloqueado', { playerId })
    throw new ApuestaError('PIN incorrecto', 401)
  }

  if (row.intentos_fallidos) await db().from('apuestas_jugadores').update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq('player_id', playerId)
  const jugadores = await jugadoresPorId([playerId])
  return { playerId, name: jugadores[playerId]?.name ?? 'Sin nombre', aliasCobro: row.alias_cobro ?? null }
}

/** Jugador de la cookie, si sigue habilitado. Nunca tira: sin sesión válida devuelve null. */
export async function obtenerSesion(cookie: string | undefined | null): Promise<SesionJugador | null> {
  const playerId = leerSesion(cookie)
  if (!playerId) return null
  try {
    const row = check(await db().from('apuestas_jugadores').select('alias_cobro, habilitado').eq('player_id', playerId).maybeSingle(), 'Sesión')
    if (!row?.habilitado) return null
    const jugadores = await jugadoresPorId([playerId])
    return { playerId, name: jugadores[playerId]?.name ?? 'Sin nombre', aliasCobro: row.alias_cobro ?? null }
  } catch {
    return null
  }
}

/** Alias o CVU donde cobra los premios. */
export async function actualizarAliasCobro(playerId: string, alias: unknown) {
  const limpio = typeof alias === 'string' ? alias.trim() : ''
  // Alias de MP: 6 a 20 caracteres (letras, números, puntos y guiones). CVU/CBU: 22 dígitos.
  if (limpio && !/^[a-zA-Z0-9.-]{6,20}$/.test(limpio) && !/^\d{22}$/.test(limpio)) {
    throw new ApuestaError('Poné un alias (6 a 20 caracteres) o un CVU de 22 números')
  }
  check(
    await db().from('apuestas_jugadores').update({ alias_cobro: limpio || null, updated_at: new Date().toISOString() }).eq('player_id', playerId),
    'No se pudo guardar el alias',
  )
  await registrar('alias_actualizado', { playerId })
}

/** Admin: crea o cambia el PIN de un jugador (y lo habilita o no). */
export async function guardarPin(playerId: unknown, pin: unknown, habilitado = true) {
  if (!esUuid(playerId)) throw new ApuestaError('Jugador inválido')
  const jugadores = await jugadoresPorId([playerId])
  if (!jugadores[playerId]) throw new ApuestaError('No existe ese jugador', 404)

  const existente = check(await db().from('apuestas_jugadores').select('player_id').eq('player_id', playerId).maybeSingle(), 'No se pudo cargar el jugador')
  if (pin === undefined || pin === null || pin === '') {
    if (!existente) throw new ApuestaError('Para habilitarlo por primera vez hace falta un PIN')
    check(await db().from('apuestas_jugadores').update({ habilitado, updated_at: new Date().toISOString() }).eq('player_id', playerId), 'No se pudo actualizar')
  } else {
    if (!pinValido(pin)) throw new ApuestaError('El PIN son de 4 a 8 números')
    check(
      await db()
        .from('apuestas_jugadores')
        .upsert({ player_id: playerId, pin_hash: await hashPin(pin), habilitado, intentos_fallidos: 0, bloqueado_hasta: null, updated_at: new Date().toISOString() }),
      'No se pudo guardar el PIN',
    )
  }
  await registrar('pin_actualizado', { playerId }, { habilitado, conPin: Boolean(pin) })
}
