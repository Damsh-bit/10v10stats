import type { LiveData, Match, MatchPlayer, Player, PlayerStats } from '@/types'
import { getPlayerStatsForData } from '@/lib/api'
import { formatShortDate } from '@/lib/format'
import { buildPairStats, getPair } from '@/lib/team-history'
import { getPlayerMatchScore } from '@/lib/utils'

/**
 * Perfil de un jugador: todo lo que sale de sus partidas en una temporada (o
 * en toda la carrera) para las pestañas del perfil. Funciones puras: corren en
 * el servidor y viajan al navegador como datos.
 */

export type Resultado = 'W' | 'L' | 'D'

export type PartidaForma = {
  matchId: string
  result: Resultado
  map: string
  date: string
  kills: number
  deaths: number
  assists: number
  damage: number
  mvp: boolean
}

export type Forma = {
  /** Últimas partidas, la más nueva primero. */
  ultimas: PartidaForma[]
  /** Positiva = victorias seguidas, negativa = derrotas seguidas (los empates no cortan). */
  racha: number
  mejorRacha: number
  peorRacha: number
}

export type FilaMapa = {
  map: string
  partidas: number
  wins: number
  draws: number
  losses: number
  winrate: number
  kda: number
  adm: number
  killsPorPartida: number
}

export type FilaCompanero = {
  player: Player
  juntos: number
  juntosWins: number
  /** % de victorias jugando en el mismo equipo (0–100). */
  juntosWinrate: number
  contra: number
  contraWins: number
  contraLosses: number
  coincidieron: number
  /** % de las partidas compartidas en las que rindió más que el otro (0–100). */
  mejorQue: number
}

export type MejorMarca = { key: string; label: string; value: string; detail: string; matchId: string }

export type PosicionLiga = { key: string; label: string; value: string; rank: number; of: number }

export type Tono = 'brand' | 'emerald' | 'amber' | 'rose' | 'sky'
/** Texto con partes resaltadas, sin HTML. */
export type Fragmento = string | { t: string; tono: Tono }
export type Curiosidad = { id: string; icono: string; partes: Fragmento[] }

export type EstiloKey = 'fragger' | 'soporte' | 'cabecero' | 'superviviente' | 'ablandador' | 'todoterreno'
export type Estilo = { key: EstiloKey; label: string; emoji: string; detalle: string }

export type PerfilAlcance = {
  forma: Forma
  mapas: FilaMapa[]
  companeros: FilaCompanero[]
  mejoresMarcas: MejorMarca[]
  posiciones: PosicionLiga[]
  curiosidades: Curiosidad[]
  estilo: Estilo | null
}

type Jugada = { match: Match; entry: MatchPlayer }

const FORMA_PARTIDAS = 15
const DIAS = ['los domingos', 'los lunes', 'los martes', 'los miércoles', 'los jueves', 'los viernes', 'los sábados']

const resultado = (entry: MatchPlayer): Resultado => (entry.won ? 'W' : entry.draw ? 'D' : 'L')
const kdaDe = (kills: number, deaths: number, assists: number) => (deaths === 0 ? kills + assists : (kills + assists) / deaths)
const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n: number) => n.toLocaleString('es-AR')
const resaltar = (t: string | number, tono: Tono = 'amber'): Fragmento => ({ t: String(t), tono })

/** Partidas del jugador en `data`, la más nueva primero. */
function jugadasDe(data: LiveData, playerId: string): Jugada[] {
  return data.matches
    .flatMap((match) => {
      const entry = match.players.find((p) => p.playerId === playerId)
      return entry ? [{ match, entry }] : []
    })
    .sort((a, b) => b.match.date.localeCompare(a.match.date))
}

function buildForma(jugadas: Jugada[]): Forma {
  const ultimas = jugadas.slice(0, FORMA_PARTIDAS).map(({ match, entry }) => ({
    matchId: match.id,
    result: resultado(entry),
    map: match.map,
    date: match.date,
    kills: entry.kills,
    deaths: entry.deaths,
    assists: entry.assists,
    damage: entry.damage,
    mvp: entry.mvps > 0,
  }))

  // De la más vieja a la más nueva; los empates no cortan las rachas.
  const decididas = jugadas.map((j) => resultado(j.entry)).filter((r) => r !== 'D').reverse()
  let mejorRacha = 0
  let peorRacha = 0
  let actual = 0
  for (const r of decididas) {
    actual = r === 'W' ? Math.max(actual, 0) + 1 : Math.min(actual, 0) - 1
    mejorRacha = Math.max(mejorRacha, actual)
    peorRacha = Math.max(peorRacha, -actual)
  }

  return { ultimas, racha: actual, mejorRacha, peorRacha }
}

function buildMapas(jugadas: Jugada[]): FilaMapa[] {
  const porMapa = new Map<string, Jugada[]>()
  for (const j of jugadas) porMapa.set(j.match.map, [...(porMapa.get(j.match.map) ?? []), j])

  return [...porMapa.entries()]
    .map(([map, lista]) => {
      const wins = lista.filter((j) => j.entry.won).length
      const draws = lista.filter((j) => j.entry.draw).length
      const kills = lista.reduce((acc, j) => acc + j.entry.kills, 0)
      const deaths = lista.reduce((acc, j) => acc + j.entry.deaths, 0)
      const assists = lista.reduce((acc, j) => acc + j.entry.assists, 0)
      const damage = lista.reduce((acc, j) => acc + j.entry.damage, 0)
      return {
        map,
        partidas: lista.length,
        wins,
        draws,
        losses: lista.length - wins - draws,
        winrate: pct(wins, lista.length),
        kda: Math.round(kdaDe(kills, deaths, assists) * 100) / 100,
        adm: Math.round(damage / lista.length),
        killsPorPartida: Math.round((kills / lista.length) * 10) / 10,
      }
    })
    .sort((a, b) => b.partidas - a.partidas || b.winrate - a.winrate)
}

function buildCompaneros(data: LiveData, playerId: string): FilaCompanero[] {
  const pares = buildPairStats(data.matches)
  return data.players
    .filter((p) => p.id !== playerId)
    .map((player) => {
      const par = getPair(pares, playerId, player.id)
      return {
        player,
        juntos: par.together,
        juntosWins: par.togetherWins,
        juntosWinrate: pct(par.togetherWins, par.together),
        contra: par.apart,
        contraWins: par.apartWins,
        contraLosses: par.apartLosses,
        coincidieron: par.shared,
        mejorQue: pct(par.better, par.shared),
      }
    })
    .filter((fila) => fila.coincidieron > 0)
    .sort((a, b) => b.juntos - a.juntos || b.juntosWinrate - a.juntosWinrate)
}

function buildMejoresMarcas(jugadas: Jugada[]): MejorMarca[] {
  if (jugadas.length === 0) return []
  const detalle = (j: Jugada) => `${j.match.map} · ${formatShortDate(j.match.date)}`
  const mejor = (score: (j: Jugada) => number, filtro: (j: Jugada) => boolean = () => true) => {
    let top: Jugada | null = null
    for (const j of jugadas) if (filtro(j) && (!top || score(j) > score(top))) top = j
    return top
  }
  const diferencia = (j: Jugada) => {
    const { playerScore, opponentScore } = getPlayerMatchScore(j.match, j.entry)
    return playerScore - opponentScore
  }
  const marcador = (j: Jugada) => {
    const { playerScore, opponentScore } = getPlayerMatchScore(j.match, j.entry)
    return `${playerScore}-${opponentScore}`
  }

  const marcas: (MejorMarca | null)[] = []
  const push = (key: string, label: string, j: Jugada | null, value: (j: Jugada) => string) => {
    marcas.push(j ? { key, label, value: value(j), detail: detalle(j), matchId: j.match.id } : null)
  }

  push('kills', 'Más kills', mejor((j) => j.entry.kills), (j) => String(j.entry.kills))
  push('damage', 'Más daño', mejor((j) => j.entry.damage), (j) => miles(j.entry.damage))
  push('assists', 'Más asistencias', mejor((j) => j.entry.assists), (j) => String(j.entry.assists))
  push('kd', 'Mejor K/D', mejor((j) => j.entry.kills / Math.max(1, j.entry.deaths), (j) => j.entry.kills >= 5), (j) =>
    (j.entry.kills / Math.max(1, j.entry.deaths)).toFixed(2),
  )
  push('deaths', 'Menos muertes', mejor((j) => -j.entry.deaths), (j) => String(j.entry.deaths))
  push('hs', 'Más headshots', mejor((j) => j.entry.hsPct, (j) => j.entry.kills >= 8 && j.entry.hsPct > 0), (j) => `${j.entry.hsPct}%`)
  push('paliza', 'Paliza más grande', mejor(diferencia, (j) => j.entry.won), marcador)
  push('derrota', 'Peor derrota', mejor((j) => -diferencia(j), (j) => !j.entry.won && !j.entry.draw), marcador)

  return marcas.filter((m): m is MejorMarca => m !== null)
}

/** Puesto con empates compartidos: 1 + cuántos están estrictamente mejor. */
function puesto(ranked: PlayerStats[], playerId: string, valor: (s: PlayerStats) => number, menorEsMejor = false) {
  const propio = ranked.find((s) => s.player.id === playerId)
  if (!propio) return null
  const mio = valor(propio)
  const mejores = ranked.filter((s) => (menorEsMejor ? valor(s) < mio : valor(s) > mio)).length
  return { rank: mejores + 1, of: ranked.length, mio }
}

function buildPosiciones(ranked: PlayerStats[], playerId: string): PosicionLiga[] {
  const metricas: { key: string; label: string; valor: (s: PlayerStats) => number; formato: (v: number) => string; menorEsMejor?: boolean }[] = [
    { key: 'kda', label: 'KDA', valor: (s) => s.kda, formato: (v) => v.toFixed(2) },
    { key: 'winrate', label: 'Winrate', valor: (s) => s.wins / s.matches, formato: (v) => `${Math.round(v * 100)}%` },
    { key: 'kpm', label: 'Kills por partida', valor: (s) => s.kills / s.matches, formato: (v) => v.toFixed(1) },
    { key: 'adm', label: 'Daño por partida', valor: (s) => s.adm, formato: (v) => String(v) },
    { key: 'dpm', label: 'Muertes por partida', valor: (s) => s.deaths / s.matches, formato: (v) => v.toFixed(1), menorEsMejor: true },
    { key: 'apm', label: 'Asistencias por partida', valor: (s) => s.assists / s.matches, formato: (v) => v.toFixed(1) },
    { key: 'hs', label: 'Headshots', valor: (s) => s.hsPct, formato: (v) => `${v}%` },
    { key: 'mvps', label: 'MVPs', valor: (s) => s.mvps, formato: (v) => String(v) },
    { key: 'matches', label: 'Partidas jugadas', valor: (s) => s.matches, formato: (v) => String(v) },
  ]

  return metricas.flatMap((m) => {
    const p = puesto(ranked, playerId, m.valor, m.menorEsMejor)
    return p ? [{ key: m.key, label: m.label, value: m.formato(p.mio), rank: p.rank, of: p.of }] : []
  })
}

const ESTILOS: Record<EstiloKey, Omit<Estilo, 'detalle'> & { detalle: (porcentaje: number) => string }> = {
  fragger: { key: 'fragger', label: 'Fragger', emoji: '🔫', detalle: (p) => `Hace más kills por partida que el ${p}% de la liga.` },
  soporte: { key: 'soporte', label: 'Soporte', emoji: '🤝', detalle: (p) => `Reparte más asistencias por partida que el ${p}% de la liga.` },
  cabecero: { key: 'cabecero', label: 'Cabecero', emoji: '🎯', detalle: (p) => `Tiene mejor porcentaje de headshots que el ${p}% de la liga.` },
  superviviente: { key: 'superviviente', label: 'Superviviente', emoji: '🛡️', detalle: (p) => `Muere menos por partida que el ${p}% de la liga.` },
  ablandador: {
    key: 'ablandador',
    label: 'Ablandador',
    emoji: '🧨',
    detalle: (p) => `Pega más daño por partida que el ${p}% de la liga, pero las kills se las llevan otros.`,
  },
  todoterreno: { key: 'todoterreno', label: 'Todoterreno', emoji: '⚖️', detalle: () => 'No se destaca en una sola cosa: está parejo en todo.' },
}

/** El rasgo en el que más se despega del resto de la liga. */
function buildEstilo(ranked: PlayerStats[], playerId: string): Estilo | null {
  const propio = ranked.find((s) => s.player.id === playerId)
  if (!propio || propio.matches < 2 || ranked.length < 4) return null
  const otros = ranked.filter((s) => s.player.id !== playerId)

  // Qué parte de la liga queda por debajo (0–1).
  const supera = (valor: (s: PlayerStats) => number, menorEsMejor = false) => {
    const mio = valor(propio)
    return otros.filter((s) => (menorEsMejor ? mio < valor(s) : mio > valor(s))).length / otros.length
  }
  const kills = supera((s) => s.kills / s.matches)
  const candidatos: [EstiloKey, number][] = [
    ['fragger', kills],
    ['soporte', supera((s) => s.assists / s.matches)],
    ['cabecero', supera((s) => s.hsPct)],
    ['superviviente', supera((s) => s.deaths / s.matches, true)],
    ['ablandador', kills < 0.5 ? supera((s) => s.adm) : 0],
  ]
  const [key, valor] = candidatos.sort((a, b) => b[1] - a[1])[0]
  const elegido = valor >= 0.7 ? ESTILOS[key] : ESTILOS.todoterreno
  return { key: elegido.key, label: elegido.label, emoji: elegido.emoji, detalle: elegido.detalle(Math.round(valor * 100)) }
}

type Grupo = { clave: string; total: number; wins: number }

function agrupar(jugadas: Jugada[], clave: (j: Jugada) => string | null): Grupo[] {
  const grupos = new Map<string, Grupo>()
  for (const j of jugadas) {
    const k = clave(j)
    if (k === null) continue
    const g = grupos.get(k) ?? { clave: k, total: 0, wins: 0 }
    g.total++
    if (j.entry.won) g.wins++
    grupos.set(k, g)
  }
  return [...grupos.values()]
}

function buildCuriosidades(
  jugadas: Jugada[],
  mapas: FilaMapa[],
  companeros: FilaCompanero[],
  contexto: 'temporada' | 'carrera',
): Curiosidad[] {
  const out: Curiosidad[] = []
  const total = jugadas.length
  if (total === 0) return out
  const add = (id: string, icono: string, partes: Fragmento[]) => out.push({ id, icono, partes })

  // Día de la semana
  const dias = agrupar(jugadas, (j) => {
    const d = new Date(j.match.date)
    return Number.isNaN(d.getTime()) ? null : String(d.getUTCDay())
  }).filter((g) => g.total >= 2)
  if (dias.length >= 2) {
    const mejor = [...dias].sort((a, b) => b.wins / b.total - a.wins / a.total || b.total - a.total)[0]
    const peor = [...dias].sort((a, b) => a.wins / a.total - b.wins / b.total || b.total - a.total)[0]
    if (mejor.wins / mejor.total >= 0.5) {
      add('dia-bueno', '📅', ['Rinde mejor ', resaltar(DIAS[Number(mejor.clave)], 'emerald'), ': ganó ', resaltar(`${pct(mejor.wins, mejor.total)}%`), ` (${mejor.wins} de ${mejor.total}).`])
    }
    if (peor !== mejor && peor.total >= 3 && peor.wins / peor.total <= 0.34) {
      add('dia-malo', '🙃', [`${DIAS[Number(peor.clave)].replace(/^los /, 'Los ')} no es lo suyo: perdió `, resaltar(`${peor.total - peor.wins} de ${peor.total}`, 'rose'), '.'])
    }
  }

  // Mapas
  const conMuestra = mapas.filter((m) => m.partidas >= 2)
  const fetiche = [...conMuestra].sort((a, b) => b.winrate - a.winrate || b.kda - a.kda)[0]
  if (fetiche && fetiche.winrate >= 60) {
    add('mapa-fetiche', '🗺️', ['En ', resaltar(fetiche.map, 'sky'), ' es otro: ganó ', resaltar(`${fetiche.winrate}%`), ` (${fetiche.wins} de ${fetiche.partidas}) con KDA ${fetiche.kda.toFixed(2)}.`])
  }
  const maldito = [...conMuestra].sort((a, b) => a.winrate - b.winrate || a.kda - b.kda)[0]
  if (maldito && maldito !== fetiche && maldito.winrate <= 34) {
    add('mapa-maldito', '💀', [resaltar(maldito.map, 'sky'), ' lo odia: perdió ', resaltar(`${maldito.losses} de ${maldito.partidas}`, 'rose'), '.'])
  }
  const masJugado = mapas[0]
  if (masJugado && masJugado.partidas >= 3 && masJugado !== fetiche) {
    add('mapa-favorito', '📍', ['Su mapa más jugado es ', resaltar(masJugado.map, 'sky'), `: ${masJugado.partidas} partidas.`])
  }

  // Compañeros y rivales
  const socios = companeros.filter((c) => c.juntos >= 3)
  const socio = [...socios].sort((a, b) => b.juntosWinrate - a.juntosWinrate || b.juntos - a.juntos)[0]
  if (socio && socio.juntosWinrate >= 50) {
    add('socio', '🤜', ['Con ', resaltar(socio.player.name, 'brand'), ' en el equipo gana el ', resaltar(`${socio.juntosWinrate}%`), ` (${socio.juntosWins} de ${socio.juntos}).`])
  }
  const yeta = [...socios].sort((a, b) => a.juntosWinrate - b.juntosWinrate || b.juntos - a.juntos)[0]
  if (yeta && yeta !== socio && yeta.juntosWinrate <= 34) {
    add('yeta', '🐈‍⬛', ['Con ', resaltar(yeta.player.name, 'brand'), ' en el equipo no hay caso: ganó ', resaltar(`${yeta.juntosWins} de ${yeta.juntos}`, 'rose'), '.'])
  }
  const rivales = companeros.filter((c) => c.contra >= 3)
  const nemesis = [...rivales].sort((a, b) => b.contraLosses / b.contra - a.contraLosses / a.contra || b.contra - a.contra)[0]
  if (nemesis && nemesis.contraLosses / nemesis.contra >= 0.6) {
    add('nemesis', '😈', ['Su némesis es ', resaltar(nemesis.player.name, 'brand'), ': jugando en contra perdió ', resaltar(`${nemesis.contraLosses} de ${nemesis.contra}`, 'rose'), '.'])
  }
  const victima = [...rivales].sort((a, b) => b.contraWins / b.contra - a.contraWins / a.contra || b.contra - a.contra)[0]
  if (victima && victima !== nemesis && victima.contraWins / victima.contra >= 0.6) {
    add('victima', '😎', ['Le tiene tomada la mano a ', resaltar(victima.player.name, 'brand'), ': jugando en contra le ganó ', resaltar(`${victima.contraWins} de ${victima.contra}`, 'emerald'), '.'])
  }
  const duelo = companeros.filter((c) => c.coincidieron >= 4).sort((a, b) => b.mejorQue - a.mejorQue)[0]
  if (duelo && duelo.mejorQue >= 70) {
    add('duelo', '⚔️', ['Rindió más que ', resaltar(duelo.player.name, 'brand'), ' en el ', resaltar(`${duelo.mejorQue}%`), ' de las partidas que compartieron.'])
  }

  // Números propios
  const record = [...jugadas].sort((a, b) => b.entry.kills - a.entry.kills)[0]
  add('record', '🏆', ['Su mejor partida: ', resaltar(`${record.entry.kills} kills`), ' en ', record.match.map, ' el ', formatShortDate(record.match.date), '.'])

  if (total >= 3) {
    const positivas = jugadas.filter((j) => j.entry.kills > j.entry.deaths).length
    add('positivas', '📈', ['Terminó con más kills que muertes en el ', resaltar(`${pct(positivas, total)}%`, positivas * 2 >= total ? 'emerald' : 'rose'), ' de sus partidas.'])
  }

  const damage = jugadas.reduce((acc, j) => acc + j.entry.damage, 0)
  if (damage >= 1000) {
    add('vidas', '💥', ['Lleva ', resaltar(miles(damage)), ' de daño: alcanza para bajar a ', resaltar(miles(Math.floor(damage / 100))), ' enemigos con la vida llena.'])
  }

  const cerradas = jugadas.filter((j) => {
    const { playerScore, opponentScore } = getPlayerMatchScore(j.match, j.entry)
    return !j.entry.draw && Math.abs(playerScore - opponentScore) <= 3
  })
  if (cerradas.length >= 3) {
    const ganadas = cerradas.filter((j) => j.entry.won).length
    add('cerradas', '😬', ['En partidas cerradas (por 3 rondas o menos) ganó ', resaltar(`${ganadas} de ${cerradas.length}`, ganadas * 2 >= cerradas.length ? 'emerald' : 'rose'), '.'])
  }

  const mvps = jugadas.filter((j) => j.entry.mvps > 0).length
  if (mvps > 0) {
    add('mvp', '👑', ['Fue MVP en el ', resaltar(`${pct(mvps, total)}%`), ` de sus partidas (${mvps}).`])
  }

  const equipos = agrupar(jugadas, (j) => j.entry.team).filter((g) => g.total >= 2)
  if (equipos.length >= 2) {
    const [a, b] = equipos.sort((x, y) => y.wins / y.total - x.wins / x.total)
    if (pct(a.wins, a.total) - pct(b.wins, b.total) >= 15) {
      add('equipo', '🎽', ['Con ', resaltar(a.clave, 'sky'), ' gana el ', resaltar(`${pct(a.wins, a.total)}%`, 'emerald'), '; con ', resaltar(b.clave, 'sky'), ' el ', resaltar(`${pct(b.wins, b.total)}%`, 'rose'), '.'])
    }
  }

  const debut = jugadas[jugadas.length - 1]
  add('debut', '🐣', [`Debutó ${contexto === 'carrera' ? 'en el 10v10' : 'en la temporada'} el `, resaltar(formatShortDate(debut.match.date), 'sky'), ' en ', debut.match.map, ` (${debut.entry.won ? 'ganó' : debut.entry.draw ? 'empató' : 'perdió'}).`])

  return out
}

/** Todo lo de un alcance (una temporada o la carrera). */
export function buildPerfilAlcance(data: LiveData, playerId: string, contexto: 'temporada' | 'carrera'): PerfilAlcance {
  const jugadas = jugadasDe(data, playerId)
  const ranked = getPlayerStatsForData(data, { minMatches: 1 })
  const mapas = buildMapas(jugadas)
  const companeros = buildCompaneros(data, playerId)

  return {
    forma: buildForma(jugadas),
    mapas,
    companeros,
    mejoresMarcas: buildMejoresMarcas(jugadas),
    posiciones: buildPosiciones(ranked, playerId),
    curiosidades: buildCuriosidades(jugadas, mapas, companeros, contexto),
    estilo: buildEstilo(ranked, playerId),
  }
}
