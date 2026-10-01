import type { Lado } from './cuotas'

export type { Lado }

/** abierto: se puede entrar y pagar · en_juego: cerraron las apuestas · resuelto / cancelado. */
export type EstadoEvento = 'abierto' | 'en_juego' | 'resuelto' | 'cancelado'

/**
 * propuesta: el rival todavía no aceptó el duelo · abierta: se está juntando la plata
 * confirmada: hay plata de los dos lados, falta el resultado · liquidada · anulada (se devuelve).
 */
export type EstadoApuesta = 'propuesta' | 'abierta' | 'confirmada' | 'liquidada' | 'anulada'

export type EstadoPosicion = 'pendiente' | 'en_proceso' | 'pagada' | 'anulada' | 'reembolsada'

/** equipo: gana el que gana la partida · rendimiento: gana el que tiene mejor partida (KDA + daño). */
export type Mercado = 'equipo' | 'rendimiento'

export type TipoApuesta = 'pozo' | 'duelo'

export type ResultadoPosicion = 'gana' | 'pierde' | 'devuelve'

export type ProveedorPago = 'mercadopago' | 'manual'

export type CuotasEvento = {
  /** "<id menor>|<id mayor>" → chance de que el id menor tenga mejor partida. */
  duelos?: Record<string, number>
  /** De qué estadísticas salieron las chances ("Carrera", "Season 2"…). */
  fuente?: string
  pesoFaceit?: number
}

export type Evento = {
  id: string
  creadoPor: string | null
  mapa: string | null
  equipoANombre: string
  equipoBNombre: string
  equipoA: string[]
  equipoB: string[]
  probA: number
  cuotas: CuotasEvento
  estado: EstadoEvento
  cierraAt: string
  matchId: string | null
  ganador: 'A' | 'B' | 'empate' | null
  createdAt: string
  cerradoAt: string | null
  resueltoAt: string | null
}

export type Apuesta = {
  id: string
  eventoId: string
  tipo: TipoApuesta
  mercado: Mercado
  retadorId: string | null
  rivalId: string | null
  ladoRetador: Lado | null
  montoRetador: number | null
  montoRival: number | null
  prob: number | null
  montoMinimo: number | null
  estado: EstadoApuesta
  motivo: string | null
  resultado: Lado | 'nula' | null
  mensaje: string | null
  createdAt: string
  liquidadaAt: string | null
}

/** Lo que se muestra de cada posición. El link de pago sólo le llega a su dueño. */
export type Posicion = {
  id: string
  apuestaId: string
  playerId: string
  lado: Lado
  monto: number
  recargo: number
  estado: EstadoPosicion
  proveedor: ProveedorPago | null
  checkoutUrl: string | null
  pagadaAt: string | null
  resultado: ResultadoPosicion | null
  premio: number | null
  premioEstado: 'pendiente' | 'pagado' | null
  createdAt: string
}

export type ApuestaConPosiciones = Apuesta & { posiciones: Posicion[] }

export type JugadorMini = {
  id: string
  name: string
  photoUrl: string | null
}

export type EventoDetalle = {
  evento: Evento
  jugadores: Record<string, JugadorMini>
  pozo: ApuestaConPosiciones | null
  duelos: ApuestaConPosiciones[]
}

export type EventoResumen = {
  evento: Evento
  /** Plata pagada en el evento (pozo + duelos). */
  enJuego: number
  pozo: { A: number; B: number }
  duelos: number
}

export type RankingApostador = {
  playerId: string
  name: string
  photoUrl: string | null
  apostado: number
  cobrado: number
  /** cobrado − apostado en apuestas ya liquidadas. */
  neto: number
  ganadas: number
  perdidas: number
}

export type SesionJugador = {
  playerId: string
  name: string
  aliasCobro: string | null
}

/** Resultado real de una partida cargada, para liquidar. */
export type ResultadoPartida = {
  matchId: string
  empate: boolean
  /** player_id → equipo (nombre) y si ganó. Sin invitados. */
  jugadores: Record<string, { equipo: string; gano: boolean; puntaje: number }>
}
