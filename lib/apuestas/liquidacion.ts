import { otroLado, type Lado } from './cuotas'
import type { Apuesta, Evento, ResultadoPartida, ResultadoPosicion } from './tipos'

/**
 * Liquidación: con la partida real cargada, quién ganó cada apuesta y cuánto
 * cobra cada uno. Funciones puras (no tocan la base), fáciles de probar.
 *
 * Reglas:
 * - Empate, o alguno de los del duelo no jugó, o los equipos se rearmaron
 *   tanto que el pozo ya no tiene sentido: la apuesta es "nula" y a cada uno
 *   se le devuelve lo que puso.
 * - Duelo por equipo: gana el que está en el equipo que gana la partida.
 * - Duelo por rendimiento: gana el de mejor partida (mismo puntaje que el MVP:
 *   (kills + asistencias) / muertes + daño / 100). Mismo puntaje = nula.
 * - Pozo: los que le pegaron al equipo ganador se reparten todo, en
 *   proporción a lo que puso cada uno.
 */

export type ResultadoApuesta = { resultado: Lado | 'nula'; motivo?: string }

export type PosicionALiquidar = { id: string; lado: Lado; monto: number }

export type ItemLiquidacion = { id: string; resultado: ResultadoPosicion; premio: number }

/** En qué equipo de la partida real quedó la mayoría de un lado del evento. */
function equipoDeLado(ids: string[], partida: ResultadoPartida): string | null {
  const conteo = new Map<string, number>()
  for (const id of ids) {
    const jugador = partida.jugadores[id]
    if (jugador) conteo.set(jugador.equipo, (conteo.get(jugador.equipo) ?? 0) + 1)
  }
  for (const [equipo, cantidad] of conteo) {
    if (cantidad > ids.length / 2) return equipo
  }
  return null
}

/** Qué lado ganó la partida según el evento: el equipo donde quedó la mayoría de cada lado. */
export function ganadorDelEvento(evento: Pick<Evento, 'equipoA' | 'equipoB'>, partida: ResultadoPartida): ResultadoApuesta & { ganador: 'A' | 'B' | 'empate' | null } {
  const equipoA = equipoDeLado(evento.equipoA, partida)
  const equipoB = equipoDeLado(evento.equipoB, partida)
  if (!equipoA || !equipoB || equipoA === equipoB) {
    return { resultado: 'nula', motivo: 'Los equipos de la partida no coinciden con los del evento', ganador: null }
  }
  if (partida.empate) return { resultado: 'nula', motivo: 'Empate', ganador: 'empate' }

  const ganoA = Object.values(partida.jugadores).some((j) => j.equipo === equipoA && j.gano)
  return ganoA ? { resultado: 'A', ganador: 'A' } : { resultado: 'B', ganador: 'B' }
}

export function resultadoDeApuesta(
  apuesta: Pick<Apuesta, 'tipo' | 'mercado' | 'retadorId' | 'rivalId' | 'ladoRetador'>,
  evento: Pick<Evento, 'equipoA' | 'equipoB'>,
  partida: ResultadoPartida,
): ResultadoApuesta {
  if (apuesta.tipo === 'pozo') {
    const { resultado, motivo } = ganadorDelEvento(evento, partida)
    return { resultado, motivo }
  }

  const retador = apuesta.retadorId ? partida.jugadores[apuesta.retadorId] : undefined
  const rival = apuesta.rivalId ? partida.jugadores[apuesta.rivalId] : undefined
  const ladoRetador = apuesta.ladoRetador ?? 'A'
  if (!retador || !rival) return { resultado: 'nula', motivo: 'Alguno de los dos no jugó la partida' }

  if (apuesta.mercado === 'equipo') {
    if (retador.equipo === rival.equipo) return { resultado: 'nula', motivo: 'Terminaron en el mismo equipo' }
    if (partida.empate) return { resultado: 'nula', motivo: 'Empate' }
    return { resultado: retador.gano ? ladoRetador : otroLado(ladoRetador) }
  }

  if (Math.abs(retador.puntaje - rival.puntaje) < 1e-9) return { resultado: 'nula', motivo: 'Mismo puntaje' }
  return { resultado: retador.puntaje > rival.puntaje ? ladoRetador : otroLado(ladoRetador) }
}

/**
 * Cuánto cobra cada posición pagada. Los ganadores se reparten todo lo
 * apostado en proporción a lo que puso cada uno (en un duelo, el ganador se
 * lleva todo). Se redondea para abajo al centavo: la banca nunca paga de más.
 */
export function liquidarPosiciones(posiciones: PosicionALiquidar[], resultado: Lado | 'nula'): ItemLiquidacion[] {
  const total = posiciones.reduce((acc, p) => acc + p.monto, 0)
  const ganadoras = resultado === 'nula' ? [] : posiciones.filter((p) => p.lado === resultado)
  const totalGanador = ganadoras.reduce((acc, p) => acc + p.monto, 0)

  // Nula, o nadie del lado ganador, o nadie del lado perdedor: se devuelve todo.
  if (ganadoras.length === 0 || totalGanador === total) {
    return posiciones.map((p) => ({ id: p.id, resultado: 'devuelve', premio: p.monto }))
  }

  return posiciones.map((p) =>
    p.lado === resultado
      ? { id: p.id, resultado: 'gana', premio: Math.floor((p.monto * total * 100) / totalGanador) / 100 }
      : { id: p.id, resultado: 'pierde', premio: 0 },
  )
}
