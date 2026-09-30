import { NextResponse } from 'next/server'
import { getLeagueData, getSeasonData } from '@/lib/api'
import { generateInsights, type Insight } from '@/lib/insights'
import { getPreviousSeason } from '@/lib/seasons'

// Cacheado: el banner lo pide en cada página y no necesita estar al segundo.
export const revalidate = 60

/** Con menos partidas que esto la temporada activa no da para curiosidades propias. */
const MIN_SEASON_MATCHES = 3

export async function GET() {
  try {
    const league = await getLeagueData()
    const season = league.currentSeason
    const current = getSeasonData(league, season.id)
    const insights: Insight[] = generateInsights(current)

    if (current.matches.length < MIN_SEASON_MATCHES) {
      insights.unshift({
        id: `season-start-${season.slug}`,
        category: 'highlights',
        title: `Arrancó la ${season.name}`,
        icon: '🚀',
        text: `Arrancó la ${season.name}: la tabla está en cero y el primer puesto está vacante.`,
        highlightedText: `Arrancó la <strong class="text-amber-300 font-semibold">${season.name}</strong>: la tabla está en cero y el <span class="text-emerald-400 font-bold">#1</span> está vacante.`,
      })

      const previous = getPreviousSeason(league.seasons, season)
      if (previous) {
        const legacy = generateInsights(getSeasonData(league, previous.id)).map((insight) => ({
          ...insight,
          id: `${previous.slug}-${insight.id}`,
          scope: previous.name,
        }))
        insights.push(...legacy)
      }
    }

    return NextResponse.json({ insights })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json({ insights: [] }, { status: 500 })
  }
}
