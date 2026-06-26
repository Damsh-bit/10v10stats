'use client'

import { useState } from 'react'
import type { Match } from '@/lib/mockData'
import { ActivityCalendar } from '@/components/activity-calendar'
import { MatchList } from '@/components/match-list'

type Props = {
  matches: Match[]
  matchesByDate: Record<string, number>
}

export function MatchesPageContent({ matches, matchesByDate }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Partidas (80%) ─────────────────────────────────── */}
      <div className="min-w-0 lg:flex-[4]">
        <MatchList matches={matches} calendarDateFilter={selectedDate} />
      </div>

      {/* ── Match Activity (20%) ───────────────────────────── */}
      <aside className="w-full lg:w-[20%] lg:shrink-0">
        <ActivityCalendar
          matchesByDate={matchesByDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </aside>
    </div>
  )
}
