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
    <>
      <ActivityCalendar
        matchesByDate={matchesByDate}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <MatchList matches={matches} calendarDateFilter={selectedDate} />
    </>
  )
}
