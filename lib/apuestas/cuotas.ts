/**
 * Matemática de las apuestas. Funciones puras: las usan el servidor (para
 * validar y liquidar) y el navegador (para mostrar cuánto paga cada cosa).
 *
 * - Cuota justa: lo que debería pagar cada peso si la chance del modelo es
 *   correcta (1 / chance). Con 60% de chance, la cuota justa es ×1,67.
 * - Duelo 1v1: el ganador se lleva lo que pusieron los dos. Si ponen lo mismo
 *   paga ×2 para los dos (le conviene al favorito); en modo "justo" el
 *   favorito pone más, en proporción a su chance, y la apuesta queda pareja.
 * - Pozo por equipos (parimutuel): todo lo que se juega se reparte entre los
 *   que le pegaron, en proporción a lo que puso cada uno. La cuota del pozo
 *   depende de cuánta plata hay de cada lado, no del modelo.
 */

export type Lado = 'A' | 'B'

export type PozoTotales = { A: number; B: number }

/** Chance mínima y máxima que se usa para calcular cuotas (evita ×100 por un modelo extremo). */
const PROB_MIN = 0.03
const PROB_MAX = 0.97

export function clampProb(prob: number) {
  if (!Number.isFinite(prob)) return 0.5
  return Math.min(PROB_MAX, Math.max(PROB_MIN, prob))
}

export function otroLado(lado: Lado): Lado {
  return lado === 'A' ? 'B' : 'A'
}

/** 1 / chance. */
export function cuotaJusta(prob: number) {
  return 1 / clampProb(prob)
}

/** Cuánto debería poner el rival para que la apuesta sea pareja según el modelo. */
export function montoJustoRival(montoPropio: number, probPropia: number) {
  const p = clampProb(probPropia)
  return redondearPesos((montoPropio * (1 - p)) / p)
}

/** Ganancia esperada (positiva = conviene) de poner `monto` contra `montoRival` con `prob` de ganar. */
export function valorEsperado(monto: number, montoRival: number, prob: number) {
  return clampProb(prob) * (monto + montoRival) - monto
}

/** Cuánto paga cada lado del pozo hoy: total / lo puesto en ese lado. Null si nadie puso. */
export function cuotasPozo(totales: PozoTotales): Record<Lado, number | null> {
  const total = totales.A + totales.B
  return {
    A: totales.A > 0 ? total / totales.A : null,
    B: totales.B > 0 ? total / totales.B : null,
  }
}

/** Lo que cobraría `monto` en `lado` si el pozo cerrara así (contando la propia entrada). */
export function cobroEstimadoPozo(monto: number, lado: Lado, totales: PozoTotales) {
  if (monto <= 0) return 0
  const conmigo = { ...totales, [lado]: totales[lado] + monto }
  const total = conmigo.A + conmigo.B
  // Si del otro lado no hay nadie, por ahora sólo recupera lo suyo.
  return (monto * total) / conmigo[lado]
}

/**
 * Entrada justa para el pozo: si cada uno de un equipo pone `monto`, cuánto
 * debería poner cada uno del otro para que el pozo pague lo que dice el modelo.
 */
export function entradaJustaPozo(monto: number, probA: number) {
  const p = clampProb(probA)
  return { A: monto, B: redondearPesos((monto * (1 - p)) / p) }
}

/**
 * Comisión de Mercado Pago a cargo del apostador: se cobra `monto / (1 - pct)`
 * para que, después de la comisión, al pozo entre exactamente `monto`.
 */
export function calcularRecargo(monto: number, pct: number) {
  if (pct <= 0) return 0
  return redondearCentavos(monto / (1 - pct) - monto)
}

/** Redondea a múltiplos de 10 pesos (mínimo 10). */
export function redondearPesos(value: number) {
  return Math.max(10, Math.round(value / 10) * 10)
}

export function redondearCentavos(value: number) {
  return Math.round(value * 100) / 100
}

// ─── Duelos guardados en el evento ──────────────────────────────────────────

/** Misma clave que las duplas del generador: el id menor primero. */
export function claveDuelo(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Chance de que `a` tenga mejor partida que `b` según la foto del evento (0,5 si no está). */
export function probRendimiento(duelos: Record<string, number> | undefined, a: string, b: string) {
  const prob = duelos?.[claveDuelo(a, b)]
  if (typeof prob !== 'number') return 0.5
  return a < b ? prob : 1 - prob
}

// ─── Formato ────────────────────────────────────────────────────────────────

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const pesosConCentavos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPesos(value: number) {
  return Number.isInteger(redondearCentavos(value)) ? pesos.format(value) : pesosConCentavos.format(value)
}

/** 1.846 → "×1,85". */
export function formatCuota(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—'
  return `×${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatProb(prob: number) {
  return `${Math.round(prob * 100)}%`
}
