import type {
  CifrasXplay,
  Compra,
  EquipoEnRonda,
  EquipoResumen,
  EquipoXplay,
  JugadorXplay,
  KillXplay,
  Lado,
  MotivoRonda,
  PartidaXplay,
  PremiosEquipo,
  RondaXplay,
  StatsJugadorXplay,
} from './tipos'

/**
 * Trae una partida de Xplay con todo lo que procesó SCOPE.GG.
 *
 * Ninguna de las dos tiene una API pública documentada: se usan las mismas
 * direcciones que usan sus páginas, que responden sin login. Por eso todo lo que
 * se trae se guarda en la base y la página nunca depende de que contesten.
 *
 * - Xplay (`/match/{hash}/info`): equipos, mapa, marcador, demo y el id de SCOPE.
 * - SCOPE, tabla de la partida (embed del scoreboard): las cifras de cada jugador.
 * - SCOPE, cada ronda (`getRoundData`): ganador, economía, daño y cada kill.
 */

const XPLAY_INFO = 'https://app.xplay.gg/api/coordinator/matches/v1/match'
const SCOPE_SCOREBOARD = 'https://app.scope.gg/es/embed/scoreboard'
const SCOPE_RONDA = 'https://app.scope.gg/api/matches/getRoundData'
const USER_AGENT = 'Mozilla/5.0 (compatible; 10v10stats/2.0; +https://alzstats.pro)'
const TIMEOUT_MS = 30000
const RONDAS_EN_PARALELO = 6
/** Un compañero que mata al asesino dentro de este margen "tradea" la kill. */
const SEGUNDOS_TRADE = 5

/** Saca el hash de 64 caracteres de un link de Xplay (o lo devuelve si ya es el hash). */
export function extraerHashXplay(texto: string): string | null {
  const match = texto.trim().match(/\b([0-9a-f]{64})\b/i)
  return match ? match[1].toLowerCase() : null
}

export function linkXplay(hash: string) {
  return `https://xplay.gg/es/matches/history/${hash}`
}

const MAPAS: Record<string, string> = {
  de_dust2: 'Dust 2',
  de_mirage: 'Mirage',
  de_inferno: 'Inferno',
  de_ancient: 'Ancient',
  de_anubis: 'Anubis',
  de_nuke: 'Nuke',
  de_overpass: 'Overpass',
  de_vertigo: 'Vertigo',
  de_train: 'Train',
  de_cache: 'Cache',
  cs_office: 'Office',
  cs_italy: 'Italy',
}

export function nombreMapa(interno: string) {
  if (MAPAS[interno]) return MAPAS[interno]
  const limpio = interno.replace(/^(de|cs|ar|dz)_/, '').replace(/_/g, ' ')
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

async function pedir(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { 'user-agent': USER_AGENT, accept: 'application/json, text/html', ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`${new URL(url).host} respondió ${response.status}`)
  return response
}

async function conReintento<T>(fn: () => Promise<T>, intentos = 3): Promise<T> {
  let ultimo: unknown
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn()
    } catch (error) {
      ultimo = error
      await new Promise((resolve) => setTimeout(resolve, 600 * (i + 1)))
    }
  }
  throw ultimo
}

// ---------------------------------------------------------------------------
// Formas crudas (sólo lo que se usa)
// ---------------------------------------------------------------------------

type InfoXplay = {
  success?: boolean
  result?: {
    match?: {
      id?: number
      hash?: string
      state?: string
      mapName?: string
      matchStartTime?: number
      score?: { team1?: number; team2?: number }
      parseState?: string
      scopeMatchID?: number | string | null
      demoUrl?: string | null
      players?: {
        team: number
        player: {
          accountId: number
          name?: string
          avatar?: string | null
          faceit?: { level?: number; elo?: number } | null
        }
      }[]
    }
  }
}

type PaginasScope = Record<string, Record<string, unknown> | undefined>
type LadoScope = { RoundsPlayed?: number; ScoreboardPages?: PaginasScope } | null | undefined

type BloqueScope = {
  base?: { Players?: { PlayerID: number }[] }[]
  round_infos?: unknown[]
  scoreboard_teams_data?: Record<string, number | null | undefined>[]
  scoreboard_values?: Record<string, { GeneralStats?: LadoScope; TSideStats?: LadoScope; CTSideStats?: LadoScope }>
  match_data?: { RoundsInHalf?: number; StoredFramerate?: number }
}

type JugadorRondaScope = { PlayerID: number; Team: number; Damage?: number }

type RondaScope = {
  Winner?: number
  RoundEndReason?: number
  FreezetimeEndFrameNumber?: number
  RoundEndFrameNumber?: number
  Players?: JugadorRondaScope[]
  TeamEconomics?: { TeamStats?: { Team: number; MoneySpent?: number; FreezetimeEndEquipmentValue?: number }[] }
  Events?: {
    FrameNumber?: number
    EventType?: number
    Data?: {
      Killer?: number
      Victim?: number
      Assister?: number
      IsHeadshot?: boolean
      Weapon?: { Weapon?: number }
    }
  }[]
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

async function traerInfo(hash: string) {
  const response = await conReintento(() => pedir(`${XPLAY_INFO}/${hash}/info`))
  const info = (await response.json()) as InfoXplay
  const match = info.result?.match
  if (!info.success || !match) throw new Error('Xplay no encontró esa partida. Revisá el link.')
  return match
}

async function traerBloqueScope(scopeId: string): Promise<BloqueScope | null> {
  const response = await conReintento(() => pedir(`${SCOPE_SCOREBOARD}?match_id=${scopeId}`))
  const html = await response.text()
  const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1]
  if (!json) return null
  const data = JSON.parse(json) as { props?: { matches?: { matchesDetailsBlock?: Record<string, BloqueScope> } } }
  return data.props?.matches?.matchesDetailsBlock?.[scopeId] ?? null
}

async function traerRonda(scopeId: string, indice: number) {
  const response = await conReintento(() =>
    pedir(SCOPE_RONDA, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ matchId: scopeId, roundIndexMatch: indice, decodeCoordinates: false }),
    }),
  )
  return (await response.json()) as RondaScope
}

async function traerRondas(scopeId: string, cantidad: number) {
  const rondas: RondaScope[] = new Array(cantidad)
  let siguiente = 0
  const trabajador = async () => {
    while (siguiente < cantidad) {
      const indice = siguiente++
      rondas[indice] = await traerRonda(scopeId, indice)
    }
  }
  await Promise.all(Array.from({ length: Math.min(RONDAS_EN_PARALELO, cantidad) }, trabajador))
  return rondas
}

// ---------------------------------------------------------------------------
// Traducción
// ---------------------------------------------------------------------------

const num = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
const numONull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const pct = (value: unknown) => {
  const n = numONull(value)
  return n === null ? null : Math.round(n * 1000) / 10
}
const redondear = (value: number, decimales = 1) => {
  const f = 10 ** decimales
  return Math.round(value * f) / f
}

function cifras(lado: LadoScope): CifrasXplay | null {
  const paginas = lado?.ScoreboardPages
  if (!lado || !paginas) return null
  const basic = paginas.Basic ?? {}
  const aim = paginas.AIM ?? {}
  const granadas = paginas.Grenades ?? {}
  const fun = paginas.Fun ?? {}
  return {
    rondas: num(lado.RoundsPlayed),
    kills: num(basic.Kills),
    deaths: num(basic.Deaths),
    assists: num(basic.Assists),
    damage: num(basic.Damage),
    adr: redondear(num(basic.AverageDamagePerRound)),
    rating: redondear(num(basic.Rating2), 2),
    kast: redondear(num(basic.KAST) * 100),
    mvps: num(basic.MVP),
    aperturas: num(basic.OpenKills),
    tradeKills: num(basic.TradeKills),
    clutches: num(basic.ClutchesWon),
    precisionRifle: pct(aim['AccuracySpottedByClass.Rifle']),
    primeraBala: pct(aim['FirstBulletAccuracyByClass.Rifle']),
    hsRifle: pct(aim['HeadshotPercentByClass.Rifle']),
    hsPistola: pct(aim['HeadshotPercentByClass.Pistol']),
    tiempoKill: numONull(aim['MedianKillTimeByClass.Rifle']) === null ? null : redondear(num(aim['MedianKillTimeByClass.Rifle']), 2),
    flasheados: num(granadas.EnemiesFlashed),
    segundosFlash: redondear(num(granadas.TotalEnemyFlashTime)),
    asistFlash: num(granadas.FlashAssists),
    danioGranadas: num(granadas.GrenadeDamage),
    quemados: num(granadas.EnemiesDamagedWithFire),
    smokes: num(granadas.SmokesUsed),
    cuchillazos: num(fun.KnifeKills),
    zeus: num(fun.ZeusKills),
    gallinas: num(fun.ChickenKills),
    segundosAislado: num(fun.SecondsInIsolation),
    inspecciones: num(fun.WeaponInspectKeyPressed),
  }
}

const LADO_SCOPE: Record<number, Lado> = { 2: 'T', 3: 'CT' }

function motivo(reason: number | undefined): MotivoRonda {
  if (reason === 1) return 'bomba'
  if (reason === 7) return 'desactivada'
  if (reason === 8 || reason === 9) return 'eliminacion'
  if (reason === 12) return 'tiempo'
  return 'otro'
}

/** Pistolas en la primera ronda de cada mitad; después, por lo que valía el equipo. */
function compra(n: number, rondasEnMitad: number | null, valor: number): Compra {
  if (n === 1 || (rondasEnMitad && n === rondasEnMitad + 1)) return 'pistolas'
  if (valor < 6000) return 'eco'
  if (valor < 18000) return 'semi'
  return 'full'
}

const PREMIOS: Record<string, keyof PremiosEquipo> = {
  EntryFragger: 'entry',
  Support: 'soporte',
  Clutcher: 'clutcher',
  WallBanger: 'wallbanger',
  Tradee: 'tradeado',
  Trader: 'trader',
  Survivor: 'superviviente',
  SmokeShooter: 'smokes',
  Unlucky: 'desafortunado',
}

function armarRondas(
  crudas: RondaScope[],
  equipoDe: Map<number, EquipoXplay>,
  rondasEnMitad: number | null,
  fps: number,
): { rondas: RondaXplay[]; kills: KillXplay[] } {
  const rondas: RondaXplay[] = []
  const kills: KillXplay[] = []
  const marcador: [number, number] = [0, 0]

  crudas.forEach((cruda, indice) => {
    const n = indice + 1
    const ladoDe = new Map<number, Lado>()
    for (const p of cruda.Players ?? []) {
      const lado = LADO_SCOPE[p.Team]
      if (lado) ladoDe.set(p.PlayerID, lado)
    }
    // El lado de cada equipo en esta ronda sale de cualquiera de sus jugadores.
    const ladoEquipo = new Map<EquipoXplay, Lado>()
    for (const [cuenta, lado] of ladoDe) {
      const equipo = equipoDe.get(cuenta)
      if (equipo && !ladoEquipo.has(equipo)) ladoEquipo.set(equipo, lado)
    }
    const ladoGanador = LADO_SCOPE[cruda.Winner ?? 0] ?? 'CT'
    const ganador: EquipoXplay = ladoEquipo.get(1) === ladoGanador ? 1 : 2
    marcador[ganador - 1]++

    const freeze = num(cruda.FreezetimeEndFrameNumber)
    const segundos = (frame: number | undefined) => (frame && freeze && fps ? redondear((frame - freeze) / fps) : null)

    const equipos: EquipoEnRonda[] = ([1, 2] as EquipoXplay[]).flatMap((equipo) => {
      const lado = ladoEquipo.get(equipo)
      if (!lado) return []
      const stats = cruda.TeamEconomics?.TeamStats?.find((t) => LADO_SCOPE[t.Team] === lado)
      const valor = num(stats?.FreezetimeEndEquipmentValue)
      return [{ equipo, lado, valor, gastado: num(stats?.MoneySpent), compra: compra(n, rondasEnMitad, valor) }]
    })

    const danio: Record<string, number> = {}
    for (const p of cruda.Players ?? []) danio[String(p.PlayerID)] = num(p.Damage)

    rondas.push({
      n,
      ganador,
      ladoGanador,
      motivo: motivo(cruda.RoundEndReason),
      marcador: [marcador[0], marcador[1]],
      duracion: segundos(cruda.RoundEndFrameNumber),
      equipos,
      danio,
    })

    const enRonda: KillXplay[] = []
    for (const evento of cruda.Events ?? []) {
      if (evento.EventType !== 1 || !evento.Data) continue
      const victima = num(evento.Data.Victim, -1)
      if (victima <= 0) continue
      const killerCrudo = num(evento.Data.Killer, -1)
      const killer = killerCrudo > 0 && killerCrudo !== victima ? killerCrudo : null
      const asistente = num(evento.Data.Assister, -1) > 0 ? num(evento.Data.Assister) : null
      const fuegoAmigo = killer !== null && ladoDe.get(killer) !== undefined && ladoDe.get(killer) === ladoDe.get(victima)
      enRonda.push({
        ronda: n,
        orden: enRonda.length,
        segundo: segundos(evento.FrameNumber),
        killer,
        victima,
        asistente,
        arma: num(evento.Data.Weapon?.Weapon),
        headshot: evento.Data.IsHeadshot === true,
        apertura: false,
        tradeada: false,
        fuegoAmigo,
      })
    }

    const apertura = enRonda.find((k) => k.killer !== null && !k.fuegoAmigo)
    if (apertura) apertura.apertura = true

    // Trade: un compañero de la víctima mata al que la mató poco después.
    for (const kill of enRonda) {
      if (kill.killer === null || kill.fuegoAmigo || kill.segundo === null) continue
      const ladoVictima = ladoDe.get(kill.victima)
      kill.tradeada = enRonda.some(
        (otra) =>
          otra.orden > kill.orden &&
          otra.victima === kill.killer &&
          otra.killer !== null &&
          otra.killer !== kill.victima &&
          ladoDe.get(otra.killer) === ladoVictima &&
          otra.segundo !== null &&
          otra.segundo - kill.segundo! <= SEGUNDOS_TRADE,
      )
    }

    kills.push(...enRonda)
  })

  return { rondas, kills }
}

export type ResumenXplay = Pick<
  PartidaXplay,
  'hash' | 'xplayId' | 'scopeMatchId' | 'mapaInterno' | 'mapa' | 'inicio' | 'estadoProceso' | 'demoUrl' | 'marcador'
> & {
  /** SCOPE terminó de procesar la demo: al guardar vienen las cifras. */
  procesable: boolean
  /** La partida terminó en Xplay. */
  terminada: boolean
  jugadores: Pick<JugadorXplay, 'accountId' | 'nombre' | 'avatar' | 'equipo' | 'faceitElo' | 'faceitNivel'>[]
}

/** Lo básico de la partida (un solo pedido, para la vista previa del formulario). */
export async function traerResumenXplay(linkOHash: string): Promise<ResumenXplay> {
  const hash = extraerHashXplay(linkOHash)
  if (!hash) throw new Error('Ese link no parece de una partida de Xplay.')
  const info = await traerInfo(hash)
  const mapaInterno = info.mapName ?? 'desconocido'
  return {
    hash,
    xplayId: numONull(info.id),
    scopeMatchId: info.scopeMatchID ? String(info.scopeMatchID) : null,
    mapaInterno,
    mapa: nombreMapa(mapaInterno),
    inicio: info.matchStartTime ? new Date(info.matchStartTime).toISOString() : null,
    estadoProceso: info.parseState ?? null,
    demoUrl: info.demoUrl ?? null,
    marcador: [num(info.score?.team1), num(info.score?.team2)],
    procesable: Boolean(info.scopeMatchID) && info.parseState === 'finished',
    terminada: info.state === 'closed',
    jugadores: (info.players ?? []).map((p) => ({
      accountId: p.player.accountId,
      nombre: p.player.name?.trim() || String(p.player.accountId),
      avatar: p.player.avatar ?? null,
      equipo: p.team === 1 ? 1 : 2,
      faceitElo: numONull(p.player.faceit?.elo),
      faceitNivel: numONull(p.player.faceit?.level),
    })),
  }
}

/**
 * Día de la partida, como se guardan en el sitio (medianoche UTC). Es el día en
 * Argentina, y lo que se juega de madrugada (antes de las 6) cuenta para la
 * noche anterior: una sesión no se parte en dos días.
 */
export function diaDeSesion(inicio: string | null) {
  const ms = inicio ? new Date(inicio).getTime() : Date.now()
  const corrido = new Date(ms - (3 + 6) * 3600_000)
  return `${corrido.toISOString().slice(0, 10)}T00:00:00.000Z`
}

/** Trae y traduce una partida. Si SCOPE no la procesó, vuelve sin cifras, rondas ni kills. */
export async function traerPartidaXplay(linkOHash: string): Promise<PartidaXplay> {
  const hash = extraerHashXplay(linkOHash)
  if (!hash) throw new Error('Ese link no parece de una partida de Xplay.')

  const info = await traerInfo(hash)
  const mapaInterno = info.mapName ?? 'desconocido'
  const scopeMatchId = info.scopeMatchID ? String(info.scopeMatchID) : null
  const marcador: [number, number] = [num(info.score?.team1), num(info.score?.team2)]
  const equipoDe = new Map<number, EquipoXplay>()
  for (const p of info.players ?? []) equipoDe.set(p.player.accountId, p.team === 1 ? 1 : 2)

  let bloque: BloqueScope | null = null
  let crudas: RondaScope[] = []
  if (scopeMatchId && info.parseState === 'finished') {
    bloque = await traerBloqueScope(scopeMatchId)
    const cantidad = bloque?.round_infos?.length ?? 0
    if (bloque && cantidad > 0) crudas = await traerRondas(scopeMatchId, cantidad)
  }

  const procesada = Boolean(bloque && crudas.length > 0)
  const rondasEnMitad = bloque?.match_data?.RoundsInHalf ?? null
  const fps = num(bloque?.match_data?.StoredFramerate, 32)
  const { rondas, kills } = procesada
    ? armarRondas(crudas, equipoDe, rondasEnMitad, fps)
    : { rondas: [] as RondaXplay[], kills: [] as KillXplay[] }

  const jugadores: JugadorXplay[] = (info.players ?? []).map((p) => {
    const valores = bloque?.scoreboard_values?.[String(p.player.accountId)]
    const general = cifras(valores?.GeneralStats)
    const stats: StatsJugadorXplay | null = general
      ? { general, t: cifras(valores?.TSideStats), ct: cifras(valores?.CTSideStats) }
      : null
    const propias = kills.filter((k) => k.killer === p.player.accountId && !k.fuegoAmigo)
    return {
      accountId: p.player.accountId,
      nombre: p.player.name?.trim() || String(p.player.accountId),
      avatar: p.player.avatar ?? null,
      equipo: p.team === 1 ? 1 : 2,
      faceitElo: numONull(p.player.faceit?.elo),
      faceitNivel: numONull(p.player.faceit?.level),
      stats,
      hsPct: procesada && propias.length > 0 ? redondear((propias.filter((k) => k.headshot).length / propias.length) * 100) : procesada ? 0 : null,
    }
  })

  // Resumen de cada equipo de SCOPE: el equipo de Xplay sale de sus jugadores.
  const equipos: EquipoResumen[] = []
  bloque?.base?.forEach((base, i) => {
    const datos = bloque?.scoreboard_teams_data?.[i]
    const equipo = base.Players?.map((p) => equipoDe.get(p.PlayerID)).find(Boolean)
    if (!datos || !equipo) return
    const premios: PremiosEquipo = {}
    for (const [clave, nombre] of Object.entries(PREMIOS)) {
      const cuenta = numONull(datos[clave])
      if (cuenta && cuenta > 0) premios[nombre] = cuenta
    }
    equipos.push({
      equipo,
      puntaje: num(datos.Score),
      puntajeT: num(datos.TScore),
      puntajeCT: num(datos.CTScore),
      premios,
    })
  })

  return {
    hash,
    xplayId: numONull(info.id),
    scopeMatchId,
    mapaInterno,
    mapa: nombreMapa(mapaInterno),
    inicio: info.matchStartTime ? new Date(info.matchStartTime).toISOString() : null,
    estadoProceso: info.parseState ?? null,
    procesada,
    demoUrl: info.demoUrl ?? null,
    marcador,
    rondasEnMitad,
    jugadores,
    equipos,
    rondas,
    kills,
  }
}
