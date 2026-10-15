/**
 * Partidas de Xplay: lo que se guarda de cada una, ya traducido a nuestro idioma.
 *
 * Xplay arma la partida (equipos, mapa, marcador, demo) y le pasa la demo a
 * SCOPE.GG, que la procesa: de ahí salen las cifras de cada jugador, las rondas
 * y cada kill. Los equipos se llaman 1 y 2, como en Xplay; el lado (CT/T)
 * cambia en cada mitad.
 */

export type EquipoXplay = 1 | 2
export type Lado = 'CT' | 'T'

/** Cómo terminó una ronda. */
export type MotivoRonda = 'bomba' | 'desactivada' | 'eliminacion' | 'tiempo' | 'otro'

/** Lo que compró un equipo al empezar la ronda. */
export type Compra = 'pistolas' | 'eco' | 'semi' | 'full'

/** Cifras de un jugador en la partida entera o en un lado. */
export type CifrasXplay = {
  rondas: number
  kills: number
  deaths: number
  assists: number
  damage: number
  adr: number
  /** Rating HLTV 2.1. */
  rating: number
  /** % de rondas con kill, asistencia, supervivencia o trade (0–100). */
  kast: number
  /** MVPs de ronda que da el juego. */
  mvps: number
  aperturas: number
  tradeKills: number
  clutches: number
  /** Puntería, en % (0–100); null si no hay datos. */
  precisionRifle: number | null
  primeraBala: number | null
  hsRifle: number | null
  hsPistola: number | null
  /** Segundos que tarda en matar con rifle (mediana). */
  tiempoKill: number | null
  flasheados: number
  segundosFlash: number
  asistFlash: number
  danioGranadas: number
  quemados: number
  smokes: number
  cuchillazos: number
  zeus: number
  gallinas: number
  segundosAislado: number
  inspecciones: number
}

export type StatsJugadorXplay = {
  general: CifrasXplay
  t: CifrasXplay | null
  ct: CifrasXplay | null
}

export type JugadorXplay = {
  /** Cuenta de Steam (SteamID3), la que une al jugador con el del sitio. */
  accountId: number
  nombre: string
  avatar: string | null
  equipo: EquipoXplay
  faceitElo: number | null
  faceitNivel: number | null
  /** null si SCOPE no procesó la demo. */
  stats: StatsJugadorXplay | null
  /** % de kills de cabeza (0–100), contado kill por kill. */
  hsPct: number | null
}

/** Quién se llevó cada premio del equipo (cuenta de Steam). */
export type PremiosEquipo = Partial<
  Record<'entry' | 'soporte' | 'clutcher' | 'wallbanger' | 'tradeado' | 'trader' | 'superviviente' | 'smokes' | 'desafortunado', number>
>

export type EquipoResumen = {
  equipo: EquipoXplay
  puntaje: number
  puntajeT: number
  puntajeCT: number
  premios: PremiosEquipo
}

export type EquipoEnRonda = {
  equipo: EquipoXplay
  lado: Lado
  /** Valor del equipo al terminar el freezetime. */
  valor: number
  gastado: number
  compra: Compra
}

export type RondaXplay = {
  /** Número de ronda, desde 1. */
  n: number
  ganador: EquipoXplay
  ladoGanador: Lado
  motivo: MotivoRonda
  /** Marcador al terminar la ronda: [equipo 1, equipo 2]. */
  marcador: [number, number]
  /** Segundos desde que termina el freezetime hasta el final. */
  duracion: number | null
  equipos: EquipoEnRonda[]
  /** Daño de cada jugador en la ronda (cuenta de Steam → daño). */
  danio: Record<string, number>
}

export type KillXplay = {
  ronda: number
  /** Orden dentro de la ronda, desde 0. */
  orden: number
  /** Segundos desde que termina el freezetime. */
  segundo: number | null
  /** null: murió solo (caída, bomba). */
  killer: number | null
  victima: number
  asistente: number | null
  /** Arma, con la numeración de SCOPE (ver lib/xplay/armas.ts). */
  arma: number
  headshot: boolean
  /** La primera kill de la ronda. */
  apertura: boolean
  /** Un compañero de la víctima vengó la kill en menos de 5 segundos. */
  tradeada: boolean
  fuegoAmigo: boolean
}

export type PartidaXplay = {
  hash: string
  xplayId: number | null
  scopeMatchId: string | null
  /** Nombre interno del mapa, ej. de_mirage. */
  mapaInterno: string
  /** Como lo nombra el sitio, ej. "Dust 2". */
  mapa: string
  /** Hora de inicio (ISO). */
  inicio: string | null
  /** Estado del procesamiento en Xplay/SCOPE: finished, failed, parsing… */
  estadoProceso: string | null
  /** SCOPE procesó la demo: hay cifras, rondas y kills. */
  procesada: boolean
  demoUrl: string | null
  marcador: [number, number]
  rondasEnMitad: number | null
  jugadores: JugadorXplay[]
  equipos: EquipoResumen[]
  rondas: RondaXplay[]
  kills: KillXplay[]
}
