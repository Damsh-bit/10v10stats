import type { PlayerStats } from '@/types'
import { levelForElo } from '@/lib/faceit-format'
import { getPair, type PairStatsMap, type PlayerForm } from '@/lib/team-history'

/**
 * Generador de equipos.
 *
 * Cada jugador tiene un "poder" de 0 a 100 que mezcla su elo de FACEIT con su
 * rendimiento en el 10v10 (en el contexto elegido: carrera, temporada o
 * últimas partidas) y suma o resta un poco según cómo viene. Con 10 jugadores
 * hay sólo 126 formas de armar dos equipos de 5, así que se prueban todas y se
 * elige la que deja más parejos el poder, el nivel de FACEIT, las rachas y
 * cada duelo por posición. La química de las duplas (cuánto ganan juntas)
 * también cuenta.
 */

export type FaceitInfo = { level: number; elo: number }

export type FaceitWeightKey = 'bajo' | 'medio' | 'alto'

export const FACEIT_WEIGHTS: { key: FaceitWeightKey; label: string; value: number }[] = [
  { key: 'bajo', label: 'Bajo', value: 0.3 },
  { key: 'medio', label: 'Medio', value: 0.5 },
  { key: 'alto', label: 'Alto', value: 0.7 },
]

export type BalancerContext = {
  /** Estadísticas de todos los jugadores en el contexto elegido. */
  sourceStats: PlayerStats[]
  /** "Carrera", "Season 2", "Últimas 20"… */
  sourceLabel: string
  sourceIsCareer: boolean
  /** Carrera de todos: completa a quien tiene pocas partidas en el contexto. */
  careerStats: PlayerStats[]
  faceit: Record<string, FaceitInfo>
  form: Record<string, PlayerForm>
  /** Duplas dentro del contexto elegido. */
  pairs: PairStatsMap
  /** 0 a 1: cuánto pesa FACEIT en el poder de cada jugador. */
  faceitWeight: number
}

export type PlayerProfile = {
  id: string
  /** Del contexto elegido; de la carrera si no jugó en él. */
  stats: PlayerStats
  faceit: FaceitInfo | null
  /** Elo para comparar: el de FACEIT o, si no tiene, uno estimado con su 10v10. */
  elo: number
  faceitScore: number
  /** Rendimiento en el 10v10 (0–100), completado con la carrera si hay pocas partidas. */
  perf: number
  /** Partidas en el contexto elegido. */
  sample: number
  form: PlayerForm
  /** −1 (viene muy mal) a 1 (viene muy bien). */
  formScore: number
  /** Poder sin la forma: FACEIT + 10v10. */
  basePower: number
  power: number
}

export type TeamSummary = {
  name: string
  players: PlayerProfile[]
  winProb: number
  strength: number
  avgPower: number
  avgElo: number
  avgLevel: number
  avgFaceitScore: number
  avgPerf: number
  kda: number
  adm: number
  /** Win rate promedio en el contexto (0–100). */
  winRate: number
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

// ─── Constantes del modelo ────────────────────────────────────────────────────

/** Escala de FACEIT: 500 de elo = 0 de poder, 2100 = 100 (cada punto son 16 de elo). */
const ELO_FLOOR = 500
const ELO_PER_POINT = 16
const NEUTRAL = 50

/** Rendimiento en el 10v10: KDA 30, daño 25, win rate 20, HS 10, partidas positivas 10, MVPs 5. */
const PERF_WEIGHTS = { kda: 30, adm: 25, wr: 20, hs: 10, positive: 10, mvp: 5 }
/** Partidas mínimas para entrar en la escala del rendimiento (un debut malo no la deforma). */
const SCALE_MIN_MATCHES = 3
/** Con pocas partidas en el contexto, el rating se completa con la carrera (o con la media). */
const PERF_PRIOR_MATCHES = 5

/** Cuánto mueve la forma: hasta ±3 de poder. */
const FORM_POINTS = 3
const HOT_STREAK = 3

/** Química: victorias juntos por encima del 50%, con 6 partidas de prior para no creerle a 2 partidas. */
const SYNERGY_PRIOR_MATCHES = 6
const SYNERGY_POINTS = 2.5

/** Chance de victoria con la fórmula de elo de FACEIT: 100 de elo promedio de diferencia ≈ 64%. */
const TEAM_SCALE = 400 / ELO_PER_POINT
/** Duelos individuales: el modelo se mezcla con el historial real entre los dos. */
const DUEL_SCALE = 30
const DUEL_PRIOR_MATCHES = 6
/** Por debajo de 55% para alguno, un duelo se considera parejo. */
const EVEN_DUEL = 0.45

/** Pesos del costo de una combinación (en puntos de poder). */
const COST_FACEIT = 0.35
const COST_FORM = 1.5
const COST_SHAPE = 0.15

const MAX_OPTIONS = 8
const FAIR_MARGIN = 0.08
const UNEVEN_MARGIN = 0.1

// ─── Perfiles ─────────────────────────────────────────────────────────────────

const PERF_KEYS = Object.keys(PERF_WEIGHTS) as (keyof typeof PERF_WEIGHTS)[]

function perfInputs(s: PlayerStats): Record<keyof typeof PERF_WEIGHTS, number> {
  const n = s.matches || 1
  return { kda: s.kda, adm: s.adm, wr: s.wins / n, hs: s.hsPct, positive: s.positiveGames / n, mvp: s.mvps / n }
}

/** Rendimiento 0–100 de cada jugador con partidas, en la escala de todo el grupo (no sólo de los 10 elegidos). */
export function performanceScores(stats: PlayerStats[]): Map<string, number> {
  const played = stats.filter((s) => s.matches > 0)
  const regulars = played.filter((s) => s.matches >= SCALE_MIN_MATCHES)
  const scale = (regulars.length >= 2 ? regulars : played).map(perfInputs)
  if (scale.length === 0) return new Map()

  const bounds = Object.fromEntries(
    PERF_KEYS.map((k) => [k, { min: Math.min(...scale.map((i) => i[k])), max: Math.max(...scale.map((i) => i[k])) }]),
  ) as Record<keyof typeof PERF_WEIGHTS, { min: number; max: number }>

  return new Map(
    played.map((s) => {
      const inputs = perfInputs(s)
      const score = PERF_KEYS.reduce((acc, k) => {
        const { min, max } = bounds[k]
        const normalized = max === min ? 0.5 : clamp((inputs[k] - min) / (max - min), 0, 1)
        return acc + normalized * PERF_WEIGHTS[k]
      }, 0)
      return [s.player.id, score]
    }),
  )
}

function shrink(value: number, matches: number, prior: number) {
  return (matches * value + PERF_PRIOR_MATCHES * prior) / (matches + PERF_PRIOR_MATCHES)
}

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

export function buildProfiles(ids: string[], ctx: BalancerContext): PlayerProfile[] {
  const sourceScores = performanceScores(ctx.sourceStats)
  const careerScores = ctx.sourceIsCareer ? sourceScores : performanceScores(ctx.careerStats)
  const sourceById = new Map(ctx.sourceStats.map((s) => [s.player.id, s]))
  const careerById = new Map(ctx.careerStats.map((s) => [s.player.id, s]))

  return ids.flatMap((id) => {
    const source = sourceById.get(id)
    const career = careerById.get(id)
    const base = source ?? career
    if (!base) return []

    const careerMatches = career?.matches ?? 0
    const careerPerf = shrink(careerScores.get(id) ?? NEUTRAL, careerMatches, NEUTRAL)
    const sample = source?.matches ?? 0
    const perf = ctx.sourceIsCareer ? careerPerf : shrink(sourceScores.get(id) ?? careerPerf, sample, careerPerf)

    const faceit = ctx.faceit[id] ?? null
    const faceitScore = faceit ? clamp((faceit.elo - ELO_FLOOR) / ELO_PER_POINT, 0, 100) : perf
    const elo = faceit ? faceit.elo : Math.round(ELO_FLOOR + perf * ELO_PER_POINT)

    const form = ctx.form[id] ?? { recent: [], streak: 0 }
    const formScore = computeFormScore(form)
    const basePower = ctx.faceitWeight * faceitScore + (1 - ctx.faceitWeight) * perf

    return [
      {
        id,
        stats: sample > 0 || !career ? base : career,
        faceit,
        elo,
        faceitScore,
        perf,
        sample,
        form,
        formScore,
        basePower,
        power: basePower + FORM_POINTS * formScore,
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
function rankSplits(profiles: PlayerProfile[], synergy: number[][], faceitWeight: number): Split[] {
  const n = profiles.length
  const size = Math.floor(n / 2)
  const splits: Split[] = []
  const faceitCost = COST_FACEIT * (faceitWeight / 0.5)

  const describe = (idx: number[]) => {
    let syn = 0
    for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) syn += synergy[idx[i]][idx[j]]
    const powers = idx.map((i) => profiles[i].power)
    return {
      strength: mean(powers) + SYNERGY_POINTS * syn,
      faceit: mean(idx.map((i) => profiles[i].faceitScore)),
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
    const cost =
      Math.abs(ta.strength - tb.strength) +
      faceitCost * Math.abs(ta.faceit - tb.faceit) +
      COST_FORM * Math.abs(ta.form - tb.form) +
      COST_SHAPE * shape

    splits.push({ mask, a, b, cost, winProbA: winProbability(ta.strength, tb.strength) })
  }

  return splits.sort((x, y) => x.cost - y.cost)
}

export function generateTeams(ids: string[], ctx: BalancerContext): BalanceResult | null {
  // El mejor jugador queda en el Equipo 1.
  const profiles = buildProfiles(ids, ctx).sort((a, b) => b.power - a.power)
  if (profiles.length < 2) return null

  const synergy = profiles.map((p) => profiles.map((q) => (p.id === q.id ? 0 : synergyOf(ctx.pairs, p.id, q.id))))
  const splits = rankSplits(profiles, synergy, ctx.faceitWeight)
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

  const avgElo = Math.round(mean(players.map((p) => p.elo)))
  const recent = players.flatMap((p) => p.form.recent)

  return {
    name,
    players,
    strength: mean(players.map((p) => p.power)) + SYNERGY_POINTS * syn,
    avgPower: mean(players.map((p) => p.power)),
    avgElo,
    avgLevel: levelForElo(avgElo),
    avgFaceitScore: mean(players.map((p) => p.faceitScore)),
    avgPerf: mean(players.map((p) => p.perf)),
    kda: mean(players.map((p) => p.stats.kda)),
    adm: mean(players.map((p) => p.stats.adm)),
    winRate: mean(players.map((p) => (p.stats.matches > 0 ? (p.stats.wins / p.stats.matches) * 100 : 0))),
    formSum: sumOf(players.map((p) => p.formScore)),
    recentWins: recent.filter((r) => r === 'W').length,
    recentLosses: recent.filter((r) => r === 'L').length,
    hot: players.filter(isHot),
    cold: players.filter(isCold),
    synergy: syn,
    bestDuo,
  }
}

function buildDuels(t1: TeamSummary, t2: TeamSummary, pairs: PairStatsMap): Duel[] {
  return t1.players.map((a, k) => {
    const b = t2.players[k]
    const pair = getPair(pairs, a.id, b.id)
    const modelProbA = duelModelProb(a, b)
    return {
      a,
      b,
      probA: (pair.better + DUEL_PRIOR_MATCHES * modelProbA) / (pair.shared + DUEL_PRIOR_MATCHES),
      modelProbA,
      shared: pair.shared,
      betterA: pair.better,
      apart: pair.apart,
      apartWinsA: pair.apartWins,
      apartLossesA: pair.apartLosses,
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
  const duels = buildDuels(t1, t2, input.ctx.pairs)

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

  // FACEIT.
  const withFaceit = profiles.filter((p) => p.faceit)
  const eloGap = t1.avgElo - t2.avgElo
  const perfGap = t1.avgPerf - t2.avgPerf
  if (withFaceit.length === 0) {
    reasons.push({ tone: 'warn', text: 'No hay datos de FACEIT: el balance usa sólo el rendimiento en el 10v10.' })
  } else if (Math.abs(eloGap) <= 60) {
    reasons.push({
      tone: 'good',
      text: `FACEIT parejo: elo promedio **${formatElo(t1.avgElo)}** (nivel ${t1.avgLevel}) contra **${formatElo(t2.avgElo)}** (nivel ${t2.avgLevel}).`,
    })
  } else {
    const [up, down] = eloGap > 0 ? [t1, t2] : [t2, t1]
    reasons.push({
      tone: Math.abs(eloGap) > 150 ? 'warn' : 'info',
      text: `${up.name} tiene más FACEIT: **${formatElo(up.avgElo)}** de elo promedio (nivel ${up.avgLevel}) contra **${formatElo(down.avgElo)}** (nivel ${down.avgLevel}).`,
    })
  }

  // Los dos FACEIT más altos.
  const topFaceit = [...withFaceit].sort((a, b) => b.elo - a.elo).slice(0, 2)
  if (topFaceit.length === 2) {
    const [first, second] = topFaceit
    const sameTeam = teamOf(first, t1) === teamOf(second, t1)
    reasons.push(
      sameTeam
        ? {
            tone: 'info',
            text: `**${first.stats.player.name}** (nivel ${first.faceit!.level}) y **${second.stats.player.name}** (nivel ${second.faceit!.level}), los dos FACEIT más altos, juegan juntos en ${teamOf(first, t1)}.`,
          }
        : {
            tone: 'good',
            text: `Los dos FACEIT más altos quedaron separados: **${first.stats.player.name}** (nivel ${first.faceit!.level}) en ${teamOf(first, t1)} y **${second.stats.player.name}** (nivel ${second.faceit!.level}) en ${teamOf(second, t1)}.`,
          },
    )
  }

  // Rendimiento en el 10v10.
  if (Math.abs(perfGap) <= 5) {
    reasons.push({
      tone: 'good',
      text: `En el 10v10 (${ctx.sourceLabel}) rinden parecido: rating **${Math.round(t1.avgPerf)}** contra **${Math.round(t2.avgPerf)}**.`,
    })
  } else {
    const [up, down] = perfGap > 0 ? [t1, t2] : [t2, t1]
    reasons.push({
      tone: Math.abs(perfGap) > 12 ? 'warn' : 'info',
      text: `${up.name} rinde más en el 10v10 (${ctx.sourceLabel}): rating **${Math.round(up.avgPerf)}** contra **${Math.round(down.avgPerf)}**.`,
    })
  }

  // FACEIT para un lado y 10v10 para el otro: se compensan.
  if (withFaceit.length > 0 && Math.abs(eloGap) > 60 && Math.abs(perfGap) > 5 && Math.sign(eloGap) !== Math.sign(perfGap)) {
    const faceitSide = eloGap > 0 ? t1 : t2
    const perfSide = perfGap > 0 ? t1 : t2
    reasons.push({
      tone: 'good',
      text: `Se compensan: ${faceitSide.name} tiene más nivel de FACEIT y ${perfSide.name} rinde más en el 10v10.`,
    })
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
    const [winner, loser, prob] =
      lopsided.probA >= 0.5 ? [lopsided.a, lopsided.b, lopsided.probA] : [lopsided.b, lopsided.a, 1 - lopsided.probA]
    const even = evenDuels > 0 ? ` y **${evenDuels}** ${evenDuels === 1 ? 'está parejo' : 'están parejos'}` : ''
    reasons.push({
      tone: 'info',
      text: `Duelos por posición: Equipo 1 se impone en **${t1Duels}**, Equipo 2 en **${t2Duels}**${even}. El más desigual es **${winner.stats.player.name}** contra **${loser.stats.player.name}** (${Math.round(prob * 100)}%).`,
    })
  }

  // Avisos sobre los datos.
  const noFaceit = profiles.filter((p) => !p.faceit)
  if (withFaceit.length > 0 && noFaceit.length > 0) {
    reasons.push({
      tone: 'warn',
      text: `${joinNames(noFaceit)} ${noFaceit.length === 1 ? 'no tiene' : 'no tienen'} FACEIT cargado: se estimó su nivel con el 10v10.`,
    })
  }
  const fewMatches = profiles.filter((p) => p.sample < PERF_PRIOR_MATCHES)
  if (fewMatches.length > 0) {
    reasons.push({
      tone: 'warn',
      text: ctx.sourceIsCareer
        ? `${joinNames(fewMatches)} ${fewMatches.length === 1 ? 'jugó' : 'jugaron'} pocas partidas: su rating es más incierto.`
        : `${joinNames(fewMatches)} ${fewMatches.length === 1 ? 'tiene' : 'tienen'} pocas partidas en ${ctx.sourceLabel}: se completó con su carrera.`,
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

export function formatElo(elo: number) {
  return Math.round(elo).toLocaleString('es-AR')
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
