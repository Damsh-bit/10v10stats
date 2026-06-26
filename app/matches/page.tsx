import { getLiveData } from '@/lib/mockData'
import { getMatchesByDate } from '@/lib/matches-calendar'
import { MatchesPageContent } from '@/components/matches-page-content'

export const dynamic = 'force-dynamic'

export default async function MatchesPage() {
  const [data, matchesByDate] = await Promise.all([getLiveData(), getMatchesByDate()])
  const sorted = [...data.matches].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Partidas
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {data.matches.length} custom matches played. Filter by map below.
        </p>
      </div>
      <MatchesPageContent matches={sorted} matchesByDate={matchesByDate} />
    </main>
  )
}
