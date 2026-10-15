import type { EquipoXplay, RondaXplay } from './tipos'

/**
 * Probabilidad de ganar la partida antes de cada ronda, y la ronda bisagra:
 * la que dio vuelta quién era favorito, para siempre.
 *
 * Antes de cada ronda se mira el marcador y lo que compró cada equipo:
 * - La ronda que se juega: la gana más seguido el que tiene más equipo (y un
 *   poco el que es CT). Calibrado con las 189 rondas de las primeras 9
 *   partidas de Xplay: un full contra un eco se ganó 28 de 31.
 * - Las que siguen: 50 y 50, contando lo que le falta a cada uno para llegar
 *   (13 en tiempo normal, alargues de 6 rondas con 12-12, 15-15…).
 */

/** Cuánto pesa cada $1000 de diferencia de equipo (en logits). */
const PESO_EQUIPO = 0.075
/** Ventaja de ser CT (en logits). */
const PESO_CT = 0.15
/** Rondas por mitad de los alargues (MR3). */
const RONDAS_MITAD_ALARGUE = 3

export type PuntoProbabilidad = {
  /** Antes de la ronda n; para el último punto, n = rondas + 1 (partida terminada). */
  n: number
  /** Probabilidad de que gane el equipo 1 de Xplay (0–1). */
  p1: number
}

export type Bisagra = {
  /** La ronda que dio vuelta la partida. */
  ronda: number
  /** Quién pasó a ser favorito (y terminó ganando). */
  equipo: EquipoXplay
  /** Chances de ese equipo antes y después de la ronda (0–1). */
  antes: number
  despues: number
}

export type ProbabilidadPartida = {
  puntos: PuntoProbabilidad[]
  /** Rondas después de las cuales cambió el favorito. */
  vueltas: number[]
  /** La última vuelta, la que dejó de favorito al que ganó; null si siempre fue favorito. */
  bisagra: Bisagra | null
  ganador: EquipoXplay | null
}

const sigmoide = (z: number) => 1 / (1 + Math.exp(-z))

/** Probabilidad de que el equipo 1 gane desde un marcador, con rondas 50 y 50. */
function crearDesdeMarcador(rondasEnMitad: number) {
  const memo = new Map<string, number>()
  /** Rondas que hay que ganar: 13 en tiempo normal; en el alargue, 4 más que el empate con el que arrancó. */
  const meta = (a: number, b: number) => {
    if (a + b < rondasEnMitad * 2) return rondasEnMitad + 1
    const base = rondasEnMitad + RONDAS_MITAD_ALARGUE * Math.floor((Math.min(a, b) - rondasEnMitad) / RONDAS_MITAD_ALARGUE)
    return base + RONDAS_MITAD_ALARGUE + 1
  }
  const valor = (a: number, b: number): number => {
    // Empatados al arrancar un alargue (12-12, 15-15…): de ahí en más es parejo.
    if (a === b && a >= rondasEnMitad && (a - rondasEnMitad) % RONDAS_MITAD_ALARGUE === 0) return 0.5
    const m = meta(a, b)
    if (a >= m) return 1
    if (b >= m) return 0
    const clave = `${a}-${b}`
    const guardado = memo.get(clave)
    if (guardado !== undefined) return guardado
    const v = 0.5 * valor(a + 1, b) + 0.5 * valor(a, b + 1)
    memo.set(clave, v)
    return v
  }
  return valor
}

/** Chances de que el equipo 1 gane la ronda, por lo que compró cada uno y el lado. */
export function chanceRonda(ronda: RondaXplay) {
  const e1 = ronda.equipos.find((e) => e.equipo === 1)
  const e2 = ronda.equipos.find((e) => e.equipo === 2)
  if (!e1 || !e2) return 0.5
  const lado = e1.lado === 'CT' ? 1 : -1
  return sigmoide((PESO_EQUIPO * (e1.valor - e2.valor)) / 1000 + PESO_CT * lado)
}

export function calcularProbabilidad(rondas: RondaXplay[], rondasEnMitad: number | null): ProbabilidadPartida {
  const desdeMarcador = crearDesdeMarcador(rondasEnMitad ?? 12)
  const puntos: PuntoProbabilidad[] = []
  let a = 0
  let b = 0
  for (const ronda of rondas) {
    const p = chanceRonda(ronda)
    puntos.push({ n: ronda.n, p1: p * desdeMarcador(a + 1, b) + (1 - p) * desdeMarcador(a, b + 1) })
    ;[a, b] = ronda.marcador
  }
  const ganador: EquipoXplay | null = a === b ? null : a > b ? 1 : 2
  if (rondas.length > 0) puntos.push({ n: rondas.length + 1, p1: ganador === 1 ? 1 : ganador === 2 ? 0 : 0.5 })

  // Favorito en cada punto (los 50 y 50 no cuentan) y dónde cambió. El último
  // punto es la partida terminada, así que la última vuelta siempre es hacia el
  // que ganó: esa es la bisagra.
  const vueltas: number[] = []
  let favorito: EquipoXplay | null = null
  let bisagra: Bisagra | null = null
  for (let i = 0; i < puntos.length; i++) {
    const p1 = puntos[i].p1
    const actual: EquipoXplay | null = p1 > 0.5 ? 1 : p1 < 0.5 ? 2 : null
    if (actual === null) continue
    if (favorito !== null && actual !== favorito) {
      const ronda = puntos[i - 1].n
      vueltas.push(ronda)
      const chance = (p: number) => (actual === 1 ? p : 1 - p)
      bisagra = actual === ganador ? { ronda, equipo: actual, antes: chance(puntos[i - 1].p1), despues: chance(p1) } : null
    }
    favorito = actual
  }

  return { puntos, vueltas, bisagra, ganador }
}
