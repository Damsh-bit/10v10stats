import type { JugadorMini } from '@/lib/apuestas/tipos'

/**
 * El Cartel: tipos y reglas compartidas entre el servidor y el navegador.
 *
 * Cualquiera dona con Mercado Pago y su cartel queda arriba de todo en la
 * home hasta que otro ponga más plata. El precio para sacarlo es lo que puso
 * el que lo tiene + la suba mínima (y nunca menos que el precio inicial).
 */

export type { JugadorMini }

export const ESTILOS_CARTEL = ['fuego', 'neon', 'oro', 'toxico'] as const
export type EstiloCartel = (typeof ESTILOS_CARTEL)[number]

export const AUTOR_MAX = 24
export const MENSAJE_MAX = 160
/** A cuántos se le puede dedicar un mismo cartel (freno anti-abuso: alcanza para todos los jugadores). */
export const OBJETIVOS_MAX = 30
/** Las fotos se achican en el navegador antes de subir; los GIF van tal cual. */
export const IMAGEN_MAX_BYTES = 3 * 1024 * 1024
export const IMAGEN_TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
/** Cuánto vive el checkout: si alguien lo deja abierto, el precio pudo haber subido. */
export const MINUTOS_CHECKOUT = 30

/** A dónde vuelve el que pagó (la home o el historial). */
export const VOLVER_A = ['/', '/cartel'] as const
export type VolverA = (typeof VOLVER_A)[number]

export type Cartel = {
  id: string
  /** Cómo firma: el nombre de un jugador, uno libre o "Anónimo". */
  autor: string
  autorJugador: JugadorMini | null
  /** A quiénes va dirigido (puede no ir para nadie). */
  objetivos: JugadorMini[]
  mensaje: string
  imagenUrl: string | null
  estilo: EstiloCartel
  monto: number
  /** El cartel de ejemplo que puso la página. */
  esCasa: boolean
  /** Dado de baja por la moderación: no se muestra el mensaje ni la foto. */
  oculto: boolean
  pagadoAt: string
}

export type CartelConfig = {
  /** Se puede donar: hay Mercado Pago (o modo prueba en `next dev`). */
  habilitado: boolean
  /** `next dev` sin token: el pago se simula y nunca toca plata. */
  modoPrueba: boolean
  precioInicial: number
  subaMinima: number
  montoMax: number
}

export type CartelEstado = {
  /** El que se ve en la home (null si no hay ninguno visible). */
  actual: Cartel | null
  /** Lo mínimo para sacarlo. */
  precioMinimo: number
  config: CartelConfig
}

export type EntradaHistorial = Cartel & {
  /** Cuándo lo sacaron (null: sigue arriba). */
  hastaAt: string | null
  /** Quién lo sacó. */
  sacadoPor: string | null
}

export type RankingDonador = {
  autor: string
  jugador: JugadorMini | null
  total: number
  carteles: number
  /** Milisegundos con el cartel arriba (sumando todos los suyos). */
  tiempoMs: number
}

export type RankingObjetivo = { jugador: JugadorMini; carteles: number; plata: number }

export type CartelHistorial = {
  estado: CartelEstado
  /** Más nuevo primero. */
  entradas: EntradaHistorial[]
  donadores: RankingDonador[]
  objetivos: RankingObjetivo[]
  totalDonado: number
}

/** Cómo quedó una donación después de volver de Mercado Pago. */
export type VerificacionCartel = {
  estado: 'pendiente' | 'pagado' | 'a_devolver' | 'devuelto'
  /** superado: alguien pagó más mientras tanto · monto · revertido. */
  motivo: string | null
  actual: CartelEstado
}

export function precioMinimo(maxPagado: number, config: Pick<CartelConfig, 'precioInicial' | 'subaMinima'>) {
  return Math.max(config.precioInicial, Math.floor(maxPagado) + config.subaMinima)
}

export function esEstilo(value: unknown): value is EstiloCartel {
  return typeof value === 'string' && (ESTILOS_CARTEL as readonly string[]).includes(value)
}

/** "2 d 4 h", "3 h 10 min", "12 min", "un toque". */
export function formatDuracion(ms: number) {
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'un toque'
  const dias = Math.floor(min / 1440)
  const horas = Math.floor((min % 1440) / 60)
  const minutos = min % 60
  if (dias > 0) return horas > 0 ? `${dias} d ${horas} h` : `${dias} d`
  if (horas > 0) return minutos > 0 ? `${horas} h ${minutos} min` : `${horas} h`
  return `${minutos} min`
}

/** La novedad que explica el cartel (el "¿Cómo funciona?" abre ese pop-up). */
export const NOVEDAD_CARTEL_ID = '2026-10-03-el-cartel'
