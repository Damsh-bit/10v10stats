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

  let recordKills = { value: 0, playerName: 'Sin datos' }
  let recordDeaths = { value: 0, playerName: 'Sin datos' }
  let recordAssists = { value: 0, playerName: 'Sin datos' }
  let recordDamage = { value: 0, playerName: 'Sin datos' }
  
  data.matches.forEach(m => {
    m.players.forEach(p => {
      const pName = data.players.find(pl => pl.id === p.playerId)?.name || 'Jugador'
      if (p.kills > recordKills.value) recordKills = { value: p.kills, playerName: pName }
      if (p.deaths > recordDeaths.value) recordDeaths = { value: p.deaths, playerName: pName }
      if (p.assists > recordAssists.value) recordAssists = { value: p.assists, playerName: pName }
      if (p.damage > recordDamage.value) recordDamage = { value: p.damage, playerName: pName }
    })
  })
  const topHs = [...stats].filter(s => s.hsPct > 0).sort((a, b) => b.hsPct - a.hsPct)[0]

  const statCards = [
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
    {
      title: 'Más Kills (Partida)',
      value: String(recordKills.value),
      subtitle: recordKills.value > 0 ? recordKills.playerName : 'Sin datos',
      color: 'text-green-400'
    },
    {
      title: 'Más Muertes (Partida)',
      value: String(recordDeaths.value),
      subtitle: recordDeaths.value > 0 ? recordDeaths.playerName : 'Sin datos',
      color: 'text-red-400'
    },
    {
      title: 'Más Asistencias (Partida)',
      value: String(recordAssists.value),
      subtitle: recordAssists.value > 0 ? recordAssists.playerName : 'Sin datos',
      color: 'text-purple-400'
    },
    {
      title: 'Más Daño (Partida)',
      value: recordDamage.value > 0 ? recordDamage.value.toLocaleString() : '0',
      subtitle: recordDamage.value > 0 ? recordDamage.playerName : 'Sin datos',
      color: 'text-orange-400'
    },
    {
      title: 'Mejor % de HS',
      value: topHs ? `${topHs.hsPct}%` : '0%',
      subtitle: topHs ? topHs.player.name : 'Sin datos',
      color: 'text-yellow-400'
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
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${card.bgImage ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {card.title}
                </h3>
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
