import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getAllPlayerStats, getLiveData } from '@/lib/mockData'

export const dynamic = 'force-dynamic'

export default async function EstadisticasPage() {
  const data = await getLiveData()
  const stats = await getAllPlayerStats()

  // Calcular mapa más jugado
  const mapCounts = data.matches.reduce((acc, match) => {
    acc[match.map] = (acc[match.map] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  let mostPlayedMap = 'Ninguno'
  let mostPlayedMapCount = 0
  for (const [map, count] of Object.entries(mapCounts)) {
    if (count > mostPlayedMapCount) {
      mostPlayedMap = map
      mostPlayedMapCount = count
    }
  }

  let topWins = { value: 0, playerName: 'Sin datos' }
  let topLosses = { value: 0, playerName: 'Sin datos' }

  stats.forEach(s => {
    if (s.wins > topWins.value) {
      topWins = { value: s.wins, playerName: s.player.name }
    }
    if (s.losses > topLosses.value) {
      topLosses = { value: s.losses, playerName: s.player.name }
    }
  })

  let recordKills = { value: 0, playerName: 'Sin datos', matchId: '' }
  let recordMinKills = { value: Infinity, playerName: 'Sin datos', matchId: '' }
  let recordDeaths = { value: 0, playerName: 'Sin datos', matchId: '' }
  let recordMinDeaths = { value: Infinity, playerName: 'Sin datos', matchId: '' }
  let recordAssists = { value: 0, playerName: 'Sin datos', matchId: '' }
  let recordDamage = { value: 0, playerName: 'Sin datos', matchId: '' }
  let recordMinDamage = { value: Infinity, playerName: 'Sin datos', matchId: '' }
  
  data.matches.forEach(m => {
    m.players.forEach(p => {
      const pName = data.players.find(pl => pl.id === p.playerId)?.name || 'Jugador'
      if (p.kills > recordKills.value) recordKills = { value: p.kills, playerName: pName, matchId: m.id }
      if (p.kills < recordMinKills.value) recordMinKills = { value: p.kills, playerName: pName, matchId: m.id }
      if (p.deaths > recordDeaths.value) recordDeaths = { value: p.deaths, playerName: pName, matchId: m.id }
      if (p.deaths < recordMinDeaths.value) recordMinDeaths = { value: p.deaths, playerName: pName, matchId: m.id }
      if (p.assists > recordAssists.value) recordAssists = { value: p.assists, playerName: pName, matchId: m.id }
      if (p.damage > recordDamage.value) recordDamage = { value: p.damage, playerName: pName, matchId: m.id }
      if (p.damage < recordMinDamage.value) recordMinDamage = { value: p.damage, playerName: pName, matchId: m.id }
    })
  })

  const hasMinDamage = Number.isFinite(recordMinDamage.value)
  const hasMinKills = Number.isFinite(recordMinKills.value)
  const hasMinDeaths = Number.isFinite(recordMinDeaths.value)

  const statCards = [
    // Generales
    {
      title: 'Total Partidas',
      value: data.matches.length.toString(),
      subtitle: 'Registradas en la historia',
      color: 'text-primary'
    },
    {
      title: 'Mapa más jugado',
      value: mostPlayedMap,
      subtitle: `${mostPlayedMapCount} partidas`,
      color: 'text-white',
      bgImage: `/maps/${mostPlayedMap.toLowerCase().replace(/\s+/g, '')}.webp`
    },
    // Historial
    {
      title: 'Más Victorias (Histórico)',
      value: String(topWins.value),
      subtitle: topWins.value > 0 ? topWins.playerName : 'Sin datos',
      color: 'text-emerald-400'
    },
    {
      title: 'Más Derrotas (Histórico)',
      value: String(topLosses.value),
      subtitle: topLosses.value > 0 ? topLosses.playerName : 'Sin datos',
      color: 'text-rose-500'
    },
    // Récords Kills
    {
      title: 'Más Kills (Partida)',
      value: String(recordKills.value),
      subtitle: recordKills.value > 0 ? recordKills.playerName : 'Sin datos',
      color: 'text-green-400',
      matchId: recordKills.matchId
    },
    {
      title: 'Menos Kills (Partida)',
      value: hasMinKills ? String(recordMinKills.value) : '0',
      subtitle: hasMinKills ? recordMinKills.playerName : 'Sin datos',
      color: 'text-red-300',
      matchId: hasMinKills ? recordMinKills.matchId : undefined
    },
    // Récords Muertes
    {
      title: 'Más Muertes (Partida)',
      value: String(recordDeaths.value),
      subtitle: recordDeaths.value > 0 ? recordDeaths.playerName : 'Sin datos',
      color: 'text-red-400',
      matchId: recordDeaths.matchId
    },
    {
      title: 'Menos Muertes (Partida)',
      value: hasMinDeaths ? String(recordMinDeaths.value) : '0',
      subtitle: hasMinDeaths ? recordMinDeaths.playerName : 'Sin datos',
      color: 'text-green-300',
      matchId: hasMinDeaths ? recordMinDeaths.matchId : undefined
    },
    // Récords Asistencias y Daño
    {
      title: 'Más Asistencias (Partida)',
      value: String(recordAssists.value),
      subtitle: recordAssists.value > 0 ? recordAssists.playerName : 'Sin datos',
      color: 'text-purple-400',
      matchId: recordAssists.matchId
    },
    {
      title: 'Más Daño (Partida)',
      value: recordDamage.value > 0 ? recordDamage.value.toLocaleString() : '0',
      subtitle: recordDamage.value > 0 ? recordDamage.playerName : 'Sin datos',
      color: 'text-orange-400',
      matchId: recordDamage.matchId
    },
    {
      title: 'Menor Daño (Partida)',
      value: hasMinDamage ? recordMinDamage.value.toLocaleString() : '0',
      subtitle: hasMinDamage ? recordMinDamage.playerName : 'Sin datos',
      color: 'text-slate-400',
      matchId: hasMinDamage ? recordMinDamage.matchId : undefined
    }
  ]

  return (
    <main className="cs-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="rounded-full bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
              10v10 Stats
            </span>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">
              Estadísticas Globales
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card, i) => (
            <div key={i} className="relative flex flex-col gap-1 overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm">
              {card.bgImage && (
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center" 
                  style={{ backgroundImage: `url('${card.bgImage}')` }} 
                />
              )}
              {card.bgImage && (
                <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
              )}
              
              <div className="relative z-10 flex flex-col gap-1">
                <div className="flex items-start justify-between">
                  <h3 className={`text-sm font-semibold uppercase tracking-wider ${card.bgImage ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {card.title}
                  </h3>
                  {card.matchId && (
                    <Link
                      href={`/matches/${card.matchId}`}
                      className={`flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase transition-colors hover:bg-primary hover:text-white ${card.bgImage ? 'text-white bg-white/20 hover:bg-white/40' : 'text-primary'}`}
                      title="Ver partida del récord"
                    >
                      Ver
                    </Link>
                  )}
                </div>
                <p className={`font-mono text-3xl font-bold ${card.color}`}>
                  {card.value}
                </p>
                <p className={`text-sm font-medium ${card.bgImage ? 'text-white/90' : 'text-foreground'}`}>
                  {card.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
