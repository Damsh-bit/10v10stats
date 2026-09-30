'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Match } from '@/types'
import type { Season } from '@/lib/seasons'
import { toDateKey } from '@/lib/matches-calendar'
import { ActivityCalendar } from '@/components/stats/activity-calendar'
import { MatchList } from '@/components/matches/match-list'
import { SeasonTabs } from '@/components/season/season-tabs'

type Props = {
  matches: Match[]
  seasons: Season[]
  currentSeasonId: number
}

const ALL = 'todas'

export function MatchesPageContent({ matches, seasons, currentSeasonId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = seasons.find((s) => s.id === currentSeasonId)
  const requested = searchParams.get('temporada')
  const initialScope =
    requested && (requested === ALL || seasons.some((s) => s.slug === requested)) ? requested : current?.slug ?? ALL

  const [scope, setScope] = useState(initialScope)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const scopedMatches = useMemo(() => {
    if (scope === ALL) return matches
    const season = seasons.find((s) => s.slug === scope)
    return season ? matches.filter((m) => m.seasonId === season.id) : matches
  }, [matches, scope, seasons])

  // El calendario se arma con las mismas partidas que se listan (sin otra consulta a la base).
  const matchesByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const match of scopedMatches) {
      const key = toDateKey(match.date)
      if (key) counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [scopedMatches])

  const handleScope = (value: string) => {
    setScope(value)
    setSelectedDate(null)
    const params = new URLSearchParams(searchParams.toString())
    if (value === current?.slug) params.delete('temporada')
    else params.set('temporada', value)
    const query = params.toString()
    router.replace(query ? `/matches?${query}` : '/matches', { scroll: false })
  }

  const options = [
    ...[...seasons]
      .sort((a, b) => b.id - a.id)
      .map((s) => ({
        value: s.slug,
        label: s.name,
        hint: String(matches.filter((m) => m.seasonId === s.id).length),
      })),
    { value: ALL, label: 'Todas', hint: String(matches.length) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <SeasonTabs options={options} value={scope} onChange={handleScope} layoutId="matches-season-tab" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:flex-[4]">
          <MatchList key={scope} matches={scopedMatches} calendarDateFilter={selectedDate} />
        </div>

        <aside className="w-full lg:w-[20%] lg:shrink-0">
          <ActivityCalendar matchesByDate={matchesByDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </aside>
      </div>
    </div>
  )
}
