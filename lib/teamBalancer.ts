import type { PlayerStats } from '@/types'
import { getPair, type PairStatsMap, type PlayerForm } from '@/lib/team-history'
import { getCaraACara, type CaraACaraMap, type RatingXplay } from '@/lib/xplay/rating'

/**
 * Generador de equipos.
 *
 * Cada jugador vale su rating de Xplay (el Rating 2.1 que da SCOPE.GG en cada
 * partida, promediado por ronda y ajustado por cuántas jugó: ver
 * lib/xplay/rating.ts) en el contexto elegido (carrera, temporada o últimas
 * partidas), y suma o resta un poco según cómo viene. Con 10 jugadores hay
 * sólo 126 formas de armar dos equipos de 5, así que se prueban todas y se
 * elige la que deja más parejos el rating, las rachas y cada duelo por
 * posición. La química de las duplas (cuánto ganan juntas) también cuenta.
 */

export type PlayerProfile = {
  id: string
  /** Del 10v10 en el contexto elegido; de la carrera si no jugó en él. */
  stats: PlayerStats
  xplay: RatingXplay
  /** El rating que usa el generador. */
  rating: number
  /** Partidas con Xplay en el contexto elegido. */
  sample: number
  form: PlayerForm
  /** −1 (viene muy mal) a 1 (viene muy bien). */
  formScore: number
  /** Rating más lo que suma o resta la forma. */
  power: number
}

export type TeamSummary = {
  name: string
  players: PlayerProfile[]
  winProb: number
  strength: number
  avgPower: number
  avgRating: number
  /** Promedios de Xplay de los que tienen; null si nadie jugó con Xplay. */
  adr: number | null
  kast: number | null
  kda: number
  formSum: number
  recentWins: number
  recentLosses: number
  hot: PlayerProfile[]
  cold: PlayerProfile[]
  synergy: number
  bestDuo: Duo | null
}

export type Duo = { a: PlayerProfile; b: PlayerProfile; together: number; wins: number; synergy: number }

export type Duel = {
  a: PlayerProfile
  b: PlayerProfile
  /** Chance de que A tenga mejor partida que B: modelo + historial entre ellos. */
  probA: number
  modelProbA: number
  /** Partidas en las que coincidieron y en cuántas A tuvo mejor partida. */
  shared: number
  betterA: number
  /** Partidas como rivales, ganadas y perdidas por el equipo de A. */
  apart: number
  apartWinsA: number
  apartLossesA: number
  /** Cara a cara en Xplay: cuántas veces A mató a B y cuántas B a A. */
  killsA: number
  killsB: number
}

export type ReasonTone = 'good' | 'warn' | 'info'
/** Texto con **negritas**. */
export type BalanceReason = { tone: ReasonTone; text: string }
export type Verdict = { label: string; tone: 'good' | 'warn' | 'bad' }

export type BalanceOption = {
  id: string
  /** Posición entre todas las combinaciones, de más pareja a menos. */
  rank: number
  teams: [TeamSummary, TeamSummary]
  duels: Duel[]
  verdict: Verdict
  reasons: BalanceReason[]
}

export type BalanceResult = {
  profiles: PlayerProfile[]
  /** Combinaciones posibles (126 con 10 jugadores). */
  total: number
  /** Parte de las combinaciones que dejan a un equipo con más de 60% de chances. */
  unevenShare: number
  /** Las mejores combinaciones, la más pareja primero. */
  options: BalanceOption[]
}

export type BalancerContext = {
  /** Estadísticas del 10v10 de todos los jugadores en el contexto elegido. */
  sourceStats: PlayerStats[]
  /** "Carrera", "Season 2", "Últimas 20"… */
  sourceLabel: string
  sourceIsCareer: boolean
  /** Carrera de todos: para mostrar a quien no jugó en el contexto. */
  careerStats: PlayerStats[]
  /** Rating de Xplay de cada jugador en el contexto elegido. */
  ratings: Record<string, RatingXplay>
  form: Record<string, PlayerForm>
  /** Duplas dentro del contexto elegido. */
  pairs: PairStatsMap
  /** Kills entre cada dupla dentro del contexto elegido. */
  caraACara: CaraACaraMap
}

// ─── Constantes del modelo ────────────────────────────────────────────────────

/** Si a alguien le falta el rating, vale como el promedio. */
const DEFAULT_RATING = 1
/** Con menos partidas con Xplay que esto, su rating se completa con otra cosa (y se avisa). */
const FEW_MATCHES = 5

/** Cuánto mueve la forma: hasta ±0,04 de rating. */
const FORM_RATING = 0.04
const HOT_STREAK = 3

/** Química: victorias juntos por encima del 50%, con 6 partidas de prior para no creerle a 2 partidas. */
const SYNERGY_PRIOR_MATCHES = 6
const SYNERGY_RATING = 0.04

/**
 * Chance de victoria: en las partidas de Xplay, la diferencia de rating
 * promedio entre los dos equipos varía ±0,43 de una partida a otra (y el que la
 * tiene a favor gana 95% de las veces). Con eso, 0,10 de diferencia ≈ 60% y
 * 0,20 ≈ 68%.
 */
const TEAM_SCALE = 0.6
/** Duelos: el rating de cada uno varía ±0,28 de partida a partida; 0,15 de diferencia ≈ 65%. */
const DUEL_SCALE = 0.55
/** Los duelos mezclan el modelo con el historial real entre los dos. */
const DUEL_PRIOR_MATCHES = 6
/** Por debajo de 55% para alguno, un duelo se considera parejo. */
const EVEN_DUEL = 0.45

/** Pesos del costo de una combinación (en rating). */
const COST_FORM = 0.025
const COST_SHAPE = 0.15

const MAX_OPTIONS = 8
const FAIR_MARGIN = 0.08
const UNEVEN_MARGIN = 0.1

// ─── Perfiles ─────────────────────────────────────────────────────────────────

export function computeFormScore(form: PlayerForm) {
  const wins = form.recent.filter((r) => r === 'W').length
  const losses = form.recent.filter((r) => r === 'L').length
  return clamp(0.5 * clamp(form.streak / 4, -1, 1) + 0.5 * ((wins - losses) / 5), -1, 1)
}

export function isHot(p: PlayerProfile) {
  return p.form.streak >= HOT_STREAK || p.formScore >= 0.5
}

export function isCold(p: PlayerProfile) {
  return p.form.streak <= -HOT_STREAK || p.formScore <= -0.5
}

const NO_XPLAY: RatingXplay = { rating: DEFAULT_RATING, crudo: null, partidas: 0, rondas: 0, adr: null, kast: null, base: 'promedio' }

export function buildProfiles(ids: string[], ctx: BalancerContext): PlayerProfile[] {
  const sourceById = new Map(ctx.sourceStats.map((s) => [s.player.id, s]))
  const careerById = new Map(ctx.careerStats.map((s) => [s.player.id, s]))

  return ids.flatMap((id) => {
    const source = sourceById.get(id)
    const career = careerById.get(id)
    const base = source ?? career
    if (!base) return []

    const xplay = ctx.ratings[id] ?? NO_XPLAY
    const form = ctx.form[id] ?? { recent: [], streak: 0 }
    const formScore = computeFormScore(form)

    return [
      {
        id,
        stats: (source?.matches ?? 0) > 0 || !career ? base : career,
        xplay,
        rating: xplay.rating,
        sample: xplay.partidas,
        form,
        formScore,
        power: xplay.rating + FORM_RATING * formScore,
      },
    ]
  })
}

// ─── Combinaciones ────────────────────────────────────────────────────────────

type Split = { mask: number; a: number[]; b: number[]; cost: number; winProbA: number }

function synergyOf(pairs: PairStatsMap, a: string, b: string) {
  const pair = getPair(pairs, a, b)
  return (pair.togetherPoints - pair.together / 2) / (pair.together + SYNERGY_PRIOR_MATCHES)
}

export function winProbability(strengthA: number, strengthB: number) {
  return 1 / (1 + 10 ** (-(strengthA - strengthB) / TEAM_SCALE))
}

function duelModelProb(a: PlayerProfile, b: PlayerProfile) {
  return 1 / (1 + 10 ** (-(a.power - b.power) / DUEL_SCALE))
}

/** Prueba todas las formas de dividir a los jugadores en dos equipos y las ordena de más pareja a menos. */
function rankSplits(profiles: PlayerProfile[], synergy: number[][]): Split[] {
  const n = profiles.length
  const size = Math.floor(n / 2)
  const splits: Split[] = []

  const describe = (idx: number[]) => {
    let syn = 0
    for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) syn += synergy[idx[i]][idx[j]]
    const powers = idx.map((i) => profiles[i].power)
    return {
      strength: mean(powers) + SYNERGY_RATING * syn,
      form: sumOf(idx.map((i) => profiles[i].formScore)),
      sorted: powers.sort((x, y) => y - x),
    }
  }

  // El jugador 0 va siempre en el equipo A: así cada división aparece una sola vez.
  for (let mask = 0; mask < 1 << n; mask++) {
    if (!(mask & 1) || popcount(mask) !== size) continue
    const a: number[] = []
    const b: number[] = []
    for (let i = 0; i < n; i++) (mask & (1 << i) ? a : b).push(i)

    const ta = describe(a)
    const tb = describe(b)
    const shape = mean(ta.sorted.map((p, k) => Math.abs(p - (tb.sorted[k] ?? 0))))
    const cost = Math.abs(ta.strength - tb.strength) + COST_FORM * Math.abs(ta.form - tb.form) + COST_SHAPE * shape

    splits.push({ mask, a, b, cost, winProbA: winProbability(ta.strength, tb.strength) })
  }

  return splits.sort((x, y) => x.cost - y.cost)
}

export function generateTeams(ids: string[], ctx: BalancerContext): BalanceResult | null {
  // El mejor jugador queda en el Equipo 1.
  const profiles = buildProfiles(ids, ctx).sort((a, b) => b.power - a.power)
  if (profiles.length < 2) return null

  const synergy = profiles.map((p) => profiles.map((q) => (p.id === q.id ? 0 : synergyOf(ctx.pairs, p.id, q.id))))
  const splits = rankSplits(profiles, synergy)
  const total = splits.length
  const unevenShare = splits.filter((s) => Math.abs(s.winProbA - 0.5) > UNEVEN_MARGIN).length / total

  const fair = splits.filter((s) => Math.abs(s.winProbA - 0.5) <= FAIR_MARGIN).slice(0, MAX_OPTIONS)
  const chosen = fair.length >= 3 ? fair : splits.slice(0, Math.min(3, total))

  const options = chosen.map((split) =>
    analyzeSplit(split, splits.indexOf(split) + 1, { profiles, synergy, ctx, total, unevenShare }),
  )
  return { profiles, total, unevenShare, options }
}

// ─── Análisis de una combinación ──────────────────────────────────────────────

type AnalysisInput = {
  profiles: PlayerProfile[]
  synergy: number[][]
  ctx: BalancerContext
  total: number
  unevenShare: number
}

function meanOrNull(values: (number | null)[]) {
  const known = values.filter((v): v is number => v !== null)
  return known.length > 0 ? mean(known) : null
}

function summarizeTeam(name: string, idx: number[], input: AnalysisInput): Omit<TeamSummary, 'winProb'> {
  const { profiles, synergy, ctx } = input
  const players = idx.map((i) => profiles[i]).sort((a, b) => b.power - a.power)

  let syn = 0
  let bestDuo: Duo | null = null
  for (let i = 0; i < idx.length; i++) {
    for (let j = i + 1; j < idx.length; j++) {
      const value = synergy[idx[i]][idx[j]]
      syn += value
      const a = profiles[idx[i]]
      const b = profiles[idx[j]]
      const pair = getPair(ctx.pairs, a.id, b.id)
      if (pair.together >= 3 && value > 0.05 && (!bestDuo || value > bestDuo.synergy)) {
        bestDuo = { a, b, together: pair.together, wins: pair.togetherWins, synergy: value }
      }
    }
  }

  const recent = players.flatMap((p) => p.form.recent)

  return {
    name,
    players,
    strength: mean(players.map((p) => p.power)) + SYNERGY_RATING * syn,
    avgPower: mean(players.map((p) => p.power)),
    avgRating: mean(players.map((p) => p.rating)),
    adr: meanOrNull(players.map((p) => p.xplay.adr)),
    kast: meanOrNull(players.map((p) => p.xplay.kast)),
    kda: mean(players.map((p) => p.stats.kda)),
    formSum: sumOf(players.map((p) => p.formScore)),
    recentWins: recent.filter((r) => r === 'W').length,
    recentLosses: recent.filter((r) => r === 'L').length,
    hot: players.filter(isHot),
    cold: players.filter(isCold),
    synergy: syn,
    bestDuo,
  }
}

/** Chance de que A tenga mejor partida que B: el modelo mezclado con el historial real entre los dos. */
export function duelProbability(a: PlayerProfile, b: PlayerProfile, pairs: PairStatsMap) {
  const pair = getPair(pairs, a.id, b.id)
  return (pair.better + DUEL_PRIOR_MATCHES * duelModelProb(a, b)) / (pair.shared + DUEL_PRIOR_MATCHES)
}

function buildDuels(t1: TeamSummary, t2: TeamSummary, ctx: BalancerContext): Duel[] {
  return t1.players.map((a, k) => {
    const b = t2.players[k]
    const pair = getPair(ctx.pairs, a.id, b.id)
    const kills = getCaraACara(ctx.caraACara, a.id, b.id)
    return {
      a,
      b,
      probA: duelProbability(a, b, ctx.pairs),
      modelProbA: duelModelProb(a, b),
      shared: pair.shared,
      betterA: pair.better,
      apart: pair.apart,
      apartWinsA: pair.apartWins,
      apartLossesA: pair.apartLosses,
      killsA: kills.mato,
      killsB: kills.murio,
    }
  })
}

function verdictFor(winProb: number): Verdict {
  const favorite = Math.max(winProb, 1 - winProb)
  if (favorite <= 0.53) return { label: 'Muy parejo', tone: 'good' }
  if (favorite <= 0.56) return { label: 'Parejo', tone: 'good' }
  if (favorite <= 0.6) return { label: 'Algo desparejo', tone: 'warn' }
  return { label: 'Desbalanceado', tone: 'bad' }
}

function analyzeSplit(split: Split, rank: number, input: AnalysisInput): BalanceOption {
  const base1 = summarizeTeam('Equipo 1', split.a, input)
  const base2 = summarizeTeam('Equipo 2', split.b, input)
  const winProb = winProbability(base1.strength, base2.strength)
  const t1: TeamSummary = { ...base1, winProb }
  const t2: TeamSummary = { ...base2, winProb: 1 - winProb }
  const duels = buildDuels(t1, t2, input.ctx)

  return {
    id: split.mask.toString(36),
    rank,
    teams: [t1, t2],
    duels,
    verdict: verdictFor(winProb),
    reasons: explain(t1, t2, duels, rank, input),
  }
}

// ─── Explicación ──────────────────────────────────────────────────────────────

function teamOf(p: PlayerProfile, t1: TeamSummary) {
  return t1.players.includes(p) ? 'Equipo 1' : 'Equipo 2'
}

/** "viene de 4 victorias seguidas", "ganó 1 de las últimas 5"… */
export function describeForm(form: PlayerForm) {
  if (form.streak >= 2) return `viene de ${form.streak} victorias seguidas`
  if (form.streak <= -2) return `viene de ${-form.streak} derrotas seguidas`
  const wins = form.recent.filter((r) => r === 'W').length
  if (form.recent.length === 0) return 'sin partidas recientes'
  return `ganó ${wins} de las últimas ${form.recent.length}`
}

function explain(t1: TeamSummary, t2: TeamSummary, duels: Duel[], rank: number, input: AnalysisInput): BalanceReason[] {
  const { profiles, ctx, total, unevenShare } = input
  const reasons: BalanceReason[] = []
  const all = [...t1.players, ...t2.players]

  // Qué tan buena es esta combinación frente a las demás.
  const randomLine =
    unevenShare >= 0.1
      ? ` Armados al azar, ${Math.round(unevenShare * 10)} de cada 10 dejarían a un equipo con más de 60% de chances.`
      : ''
  reasons.push(
    rank === 1
      ? { tone: 'good', text: `De las **${total}** formas de dividir a estos 10, esta es la más pareja.${randomLine}` }
      : { tone: 'info', text: `Es la combinación n.º **${rank}** de ${total}, ordenadas de más pareja a menos.${randomLine}` },
  )

  // Rating de Xplay.
  const ratingGap = t1.avgRating - t2.avgRating
  if (Math.abs(ratingGap) <= 0.03) {
    reasons.push({
      tone: 'good',
      text: `Rating de Xplay parejo (${ctx.sourceLabel}): **${formatRating(t1.avgRating)}** contra **${formatRating(t2.avgRating)}** de promedio.`,
    })
  } else {
    const [up, down] = ratingGap > 0 ? [t1, t2] : [t2, t1]
    reasons.push({
      tone: Math.abs(ratingGap) > 0.08 ? 'warn' : 'info',
      text: `${up.name} tiene más rating de Xplay (${ctx.sourceLabel}): **${formatRating(up.avgRating)}** contra **${formatRating(down.avgRating)}** de promedio.`,
    })
  }

  // Los dos ratings más altos.
  const [first, second] = [...all].sort((a, b) => b.rating - a.rating)
  if (first && second) {
    const sameTeam = teamOf(first, t1) === teamOf(second, t1)
    const who = (p: PlayerProfile) => `**${p.stats.player.name}** (${formatRating(p.rating)})`
    reasons.push(
      sameTeam
        ? { tone: 'info', text: `${who(first)} y ${who(second)}, los dos ratings más altos, juegan juntos en ${teamOf(first, t1)}.` }
        : {
            tone: 'good',
            text: `Los dos ratings más altos quedaron separados: ${who(first)} en ${teamOf(first, t1)} y ${who(second)} en ${teamOf(second, t1)}.`,
          },
    )
  }

  reasons.push(...explainForm(t1, t2))

  // Química: la dupla que más gana junta.
  let strongest: Duo | null = null
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const pair = getPair(ctx.pairs, all[i].id, all[j].id)
      const value = synergyOf(ctx.pairs, all[i].id, all[j].id)
      if (pair.together >= 4 && value > 0.08 && (!strongest || value > strongest.synergy)) {
        strongest = { a: all[i], b: all[j], together: pair.together, wins: pair.togetherWins, synergy: value }
      }
    }
  }
  if (strongest) {
    const { a, b } = strongest
    const record = `ganaron ${strongest.wins} de ${strongest.together} juntos`
    reasons.push(
      teamOf(a, t1) === teamOf(b, t1)
        ? {
            tone: 'info',
            text: `**${a.stats.player.name}** y **${b.stats.player.name}**, la dupla con más química (${record}), están en ${teamOf(a, t1)}: ya está contemplado en la chance de victoria.`,
          }
        : {
            tone: 'good',
            text: `Separamos a la dupla con más química: **${a.stats.player.name}** y **${b.stats.player.name}** ${record}.`,
          },
    )
  }

  // Duelos por posición: con menos de 55% para alguno, el duelo cuenta como parejo.
  const t1Duels = duels.filter((d) => d.probA >= 1 - EVEN_DUEL).length
  const t2Duels = duels.filter((d) => d.probA <= EVEN_DUEL).length
  const evenDuels = duels.length - t1Duels - t2Duels
  const lopsided = [...duels].sort((x, y) => Math.abs(y.probA - 0.5) - Math.abs(x.probA - 0.5))[0]
  if (lopsided) {
    const aWins = lopsided.probA >= 0.5
    const [winner, loser, prob] = aWins ? [lopsided.a, lopsided.b, lopsided.probA] : [lopsided.b, lopsided.a, 1 - lopsided.probA]
    const [killsW, killsL] = aWins ? [lopsided.killsA, lopsided.killsB] : [lopsided.killsB, lopsided.killsA]
    const even = evenDuels > 0 ? ` y **${evenDuels}** ${evenDuels === 1 ? 'está parejo' : 'están parejos'}` : ''
    const h2h =
      killsW + killsL > 0
        ? `; cara a cara, ${winner.stats.player.name} lo mató ${killsW} ${killsW === 1 ? 'vez' : 'veces'} y ${loser.stats.player.name} ${killsL}`
        : ''
    reasons.push({
      tone: 'info',
      text: `Duelos por posición: Equipo 1 se impone en **${t1Duels}**, Equipo 2 en **${t2Duels}**${even}. El más desigual es **${winner.stats.player.name}** contra **${loser.stats.player.name}** (${Math.round(prob * 100)}%${h2h}).`,
    })
  }

  // Avisos sobre los datos: a quién se le completó el rating y con qué.
  const few = profiles.filter((p) => p.sample < FEW_MATCHES)
  const fromCareer = few.filter((p) => p.xplay.base === 'carrera')
  const fromFaceit = few.filter((p) => p.xplay.base === 'faceit')
  const fromAverage = few.filter((p) => p.xplay.base === 'promedio')
  if (fromCareer.length > 0) {
    reasons.push({
      tone: 'warn',
      text: `${joinNames(fromCareer)} ${fromCareer.length === 1 ? 'tiene' : 'tienen'} pocas partidas con Xplay en ${ctx.sourceLabel}: se completó con su carrera.`,
    })
  }
  if (fromFaceit.length > 0) {
    reasons.push({
      tone: 'warn',
      text: `${joinNames(fromFaceit)} ${fromFaceit.length === 1 ? 'jugó' : 'jugaron'} pocas con Xplay: por ahora se completa con lo que diría su FACEIT, que deja de contar a las 5 partidas.`,
    })
  }
  if (fromAverage.length > 0) {
    reasons.push({
      tone: 'warn',
      text: `${joinNames(fromAverage)} ${fromAverage.length === 1 ? 'jugó' : 'jugaron'} pocas con Xplay: su rating se acerca al promedio del grupo hasta que juegue más.`,
    })
  }

  return reasons
}

function explainForm(t1: TeamSummary, t2: TeamSummary): BalanceReason[] {
  const reasons: BalanceReason[] = []
  const name = (p: PlayerProfile) => `**${p.stats.player.name}**`

  const compensated = new Set<PlayerProfile>()
  for (const team of [t1, t2]) {
    const cold = [...team.cold]
    for (const hot of team.hot) {
      const partner = cold.shift()
      if (!partner) break
      compensated.add(hot).add(partner)
      reasons.push({
        tone: 'good',
        text: `Rachas compensadas: ${name(hot)} (${describeForm(hot.form)}) juega con ${name(partner)} (${describeForm(partner.form)}).`,
      })
    }
  }

  const hot1 = t1.hot.filter((p) => !compensated.has(p))
  const hot2 = t2.hot.filter((p) => !compensated.has(p))
  if (hot1.length > 0 && hot2.length > 0) {
    reasons.push({
      tone: 'good',
      text: `Los que vienen bien quedaron repartidos: ${hot1.map(name).join(' y ')} en Equipo 1 y ${hot2.map(name).join(' y ')} en Equipo 2.`,
    })
  } else if (hot1.length + hot2.length >= 2) {
    const team = hot1.length > 0 ? t1 : t2
    reasons.push({
      tone: 'warn',
      text: `${[...hot1, ...hot2].map(name).join(' y ')} vienen en racha y quedaron juntos en ${team.name}.`,
    })
  }

  const cold1 = t1.cold.filter((p) => !compensated.has(p))
  const cold2 = t2.cold.filter((p) => !compensated.has(p))
  if (cold1.length + cold2.length >= 2 && (cold1.length === 0 || cold2.length === 0)) {
    const team = cold1.length > 0 ? t1 : t2
    reasons.push({
      tone: 'warn',
      text: `${[...cold1, ...cold2].map(name).join(' y ')} vienen en mala racha y quedaron juntos en ${team.name}.`,
    })
  }

  if (t1.hot.length + t2.hot.length + t1.cold.length + t2.cold.length === 0) {
    reasons.push({ tone: 'info', text: 'Nadie viene con una racha marcada en el 10v10: la forma casi no mueve el armado.' })
  } else if (reasons.length === 0) {
    reasons.push({
      tone: 'info',
      text: `Forma en las últimas 5 de cada uno: Equipo 1 **${t1.recentWins}V–${t1.recentLosses}D** y Equipo 2 **${t2.recentWins}V–${t2.recentLosses}D**.`,
    })
  }

  return reasons
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** 1.234 → "1.23", como lo muestra Xplay. */
export function formatRating(rating: number) {
  return rating.toFixed(2)
}

function joinNames(players: PlayerProfile[]) {
  const names = players.map((p) => `**${p.stats.player.name}**`)
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mean(values: number[]) {
  return values.length ? sumOf(values) / values.length : 0
}

function sumOf(values: number[]) {
  return values.reduce((a, b) => a + b, 0)
}

function popcount(n: number) {
  let count = 0
  while (n) {
    n &= n - 1
    count++
  }
  return count
}
