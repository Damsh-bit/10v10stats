import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCareerData, getLadderStats, getLeagueData, getPlayerStatsForData, getSeasonData } from '@/lib/api'
import { computeMatchRecords, computeSeasonSummary, type MatchRecord } from '@/lib/season-stats'
import { mapImageUrl } from '@/lib/format'
import { valorLadder } from '@/lib/ladder'
import { HallOfFameView, type HallCard, type HallScope } from '@/components/stats/hall-of-fame-view'
import { Reveal } from '@/components/motion/reveal'
import type { LiveData } from '@/types'
import { getCifrasXplayTodas, type FilaCifrasXplay } from '@/lib/xplay/leer'

// Cargar o editar una partida (o un jugador) ya la refresca al toque; esto es
// sólo un respaldo. Con 60 s se regeneraba sin parar y cada vez era una escritura.
export const revalidate = 3600

function recordCard(title: string, record: MatchRecord | null, color: string, format = (v: number) => String(v)): HallCard {
  return {
    title,
    value: record ? format(record.value) : '—',
    subtitle: record ? record.playerName : 'Sin datos',
    color,
    matchId: record?.matchId,
    playerId: record?.playerId,
  }
}

/** Con menos partidas de Xplay que esto no se entra en los promedios. */
const MIN_PARTIDAS_XPLAY = 3

/** Récords de Xplay: sólo aparecen si en el período hay partidas cargadas con el link. */
function xplayCards(data: LiveData, filas: FilaCifrasXplay[]): HallCard[] {
  const ids = new Set(data.matches.map((m) => m.id))
  const propias = filas.filter((f) => ids.has(f.matchId))
  if (propias.length === 0) return []
  const nombre = (playerId: string) => data.players.find((p) => p.id === playerId)?.name ?? 'Sin info'

  const mejorPartida = propias.reduce((best, f) => (f.rating > best.rating ? f : best))
  const porJugador = new Map<string, FilaCifrasXplay[]>()
  for (const f of propias) porJugador.set(f.playerId, [...(porJugador.get(f.playerId) ?? []), f])
  const promedios = [...porJugador.entries()].map(([playerId, lista]) => {
    const rondas = lista.reduce((acc, f) => acc + Math.max(1, f.rondas), 0)
    const pesado = (fn: (f: FilaCifrasXplay) => number) => lista.reduce((acc, f) => acc + fn(f) * Math.max(1, f.rondas), 0) / rondas
    return {
      playerId,
      partidas: lista.length,
      rating: pesado((f) => f.rating),
      adr: pesado((f) => f.adr),
      kast: pesado((f) => f.kast),
      aperturas: lista.reduce((acc, f) => acc + f.aperturas, 0),
      clutches: lista.reduce((acc, f) => acc + f.clutches, 0),
    }
  })
  const conVolumen = promedios.filter((p) => p.partidas >= MIN_PARTIDAS_XPLAY)
  const top = <T,>(lista: T[], fn: (x: T) => number) => (lista.length ? lista.reduce((best, x) => (fn(x) > fn(best) ? x : best)) : null)
  const card = (title: string, p: (typeof promedios)[number] | null, valor: (p: (typeof promedios)[number]) => string, color: string, detalle = ''): HallCard => ({
    title,
    value: p ? valor(p) : '—',
    subtitle: p ? `${nombre(p.playerId)}${detalle}` : `Mínimo ${MIN_PARTIDAS_XPLAY} partidas de Xplay`,
    color,
    playerId: p?.playerId,
  })

  const rating = top(conVolumen, (p) => p.rating)
  const adr = top(conVolumen, (p) => p.adr)
  const kast = top(conVolumen, (p) => p.kast)
  const aperturas = top(promedios, (p) => p.aperturas)
  const clutches = top(promedios, (p) => p.clutches)
  return [
    {
      title: 'Mejor rating (partida)',
      value: mejorPartida.rating.toFixed(2),
      subtitle: `${nombre(mejorPartida.playerId)} · Xplay`,
      color: 'text-sky-300',
      matchId: mejorPartida.matchId,
      playerId: mejorPartida.playerId,
    },
    card('Mejor rating promedio', rating, (p) => p.rating.toFixed(2), 'text-sky-300', ' · Xplay'),
    card('Mejor ADR promedio', adr, (p) => String(Math.round(p.adr)), 'text-orange-300', ' · Xplay'),
    card('Mejor KAST promedio', kast, (p) => `${Math.round(p.kast)}%`, 'text-emerald-300', ' · Xplay'),
    card('Más aperturas', aperturas, (p) => String(p.aperturas), 'text-amber-300', ' · primeras kills de ronda'),
    card('Más clutches', clutches, (p) => String(p.clutches), 'text-violet-300', ' · Xplay'),
  ]
}

function buildCards(data: LiveData, leaderTitle: string, xplay: FilaCifrasXplay[] = []): HallCard[] {
  const summary = computeSeasonSummary(data)
  const records = computeMatchRecords(data)
  const standings = getPlayerStatsForData(data, { minMatches: 1 })
  const byWins = [...standings].sort((a, b) => b.wins - a.wins)[0]
  const byLosses = [...standings].sort((a, b) => b.losses - a.losses)[0]
  // El líder sale de la ladder (sin inactivos); los récords cuentan a todos.
  const leader = getLadderStats(data, { minMatches: 1 })[0]
  const damage = (v: number) => v.toLocaleString('es-AR')

  return [
    {
      title: leaderTitle,
      value: leader ? valorLadder(leader).toFixed(2) : '—',
      subtitle: leader ? `${leader.player.name} · KDA` : 'Vacante',
      color: 'text-amber-300',
      playerId: leader?.player.id,
      highlight: true,
    },
    { title: 'Partidas', value: String(summary.matches), subtitle: `${summary.totalKills.toLocaleString('es-AR')} kills en total`, color: 'text-brand' },
    {
      title: 'Mapa más jugado',
      value: summary.mostPlayedMap?.map ?? '—',
      subtitle: summary.mostPlayedMap ? `${summary.mostPlayedMap.count} partidas` : 'Sin datos',
      color: 'text-white',
      bgImage: summary.mostPlayedMap ? mapImageUrl(summary.mostPlayedMap.map) : undefined,
    },
    {
      title: 'Más victorias',
      value: byWins && byWins.wins > 0 ? String(byWins.wins) : '—',
      subtitle: byWins && byWins.wins > 0 ? byWins.player.name : 'Sin datos',
      color: 'text-emerald-400',
      playerId: byWins?.player.id,
    },
    {
      title: 'Más derrotas',
      value: byLosses && byLosses.losses > 0 ? String(byLosses.losses) : '—',
      subtitle: byLosses && byLosses.losses > 0 ? byLosses.player.name : 'Sin datos',
      color: 'text-rose-500',
      playerId: byLosses?.player.id,
    },
    recordCard('Más kills (partida)', records.maxKills, 'text-green-400'),
    recordCard('Menos kills (partida)', records.minKills, 'text-red-300'),
    recordCard('Más muertes (partida)', records.maxDeaths, 'text-red-400'),
    recordCard('Menos muertes (partida)', records.minDeaths, 'text-green-300'),
    recordCard('Más asistencias (partida)', records.maxAssists, 'text-purple-400'),
    recordCard('Más daño (partida)', records.maxDamage, 'text-orange-400', damage),
    recordCard('Menor daño (partida)', records.minDamage, 'text-slate-400', damage),
    ...xplayCards(data, xplay),
  ]
}

export default async function EstadisticasPage() {
  const [league, xplay] = await Promise.all([getLeagueData(), getCifrasXplayTodas()])
  const seasons = [...league.seasons].sort((a, b) => b.id - a.id)

  const scopes: HallScope[] = [
    ...seasons.map((season) => {
      const data = getSeasonData(league, season.id)
      return {
        key: season.slug,
        label: season.name,
        hint: season.isCurrent ? 'actual' : undefined,
        cards: buildCards(data, season.isCurrent ? 'Líder actual' : 'Campeón', xplay),
      }
    }),
    { key: 'historico', label: 'Histórico', cards: buildCards(getCareerData(league), 'Mejor KDA histórico', xplay) },
  ]

  // Recién arrancada la temporada no hay récords: se abre en la última con partidas.
  const initialKey =
    seasons.find((s) => league.matches.some((m) => m.seasonId === s.id))?.slug ?? league.currentSeason.slug

  return (
    <main className="cs-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Reveal immediate className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">10v10 Stats</span>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">Hall of Fame</h1>
          </div>
        </Reveal>

        <HallOfFameView scopes={scopes} initialKey={initialKey} />
      </div>
    </main>
  )
}
