import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

const MS_DAY = 86400000

export function toDateKey(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function getTodayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function getMondayRow(date: Date): number {
  const day = date.getUTCDay()
  return day === 0 ? 6 : day - 1
}

export type CalendarCell = {
  date: Date
  dateKey: string
  count: number
}

/** Number of weeks shown in the activity calendar (≈ 6 months). */
const WEEKS = 26

export function buildCalendarGrid(matchesByDate: Record<string, number>) {
  const endDate = getTodayUTC()
  // Start far enough back so we always fill WEEKS full columns.
  const startDate = addDaysUTC(endDate, -(WEEKS * 7 - 1))
  const firstMonday = addDaysUTC(startDate, -getMondayRow(startDate))

  const grid: (CalendarCell | null)[][] = Array.from({ length: WEEKS }, () => Array(7).fill(null))

  for (let i = 0; i < WEEKS * 7; i += 1) {
    const date = addDaysUTC(firstMonday, i)
    // Skip future dates
    if (date.getTime() > endDate.getTime()) break
    const col = Math.floor(i / 7)
    const row = getMondayRow(date)

    if (col >= 0 && col < WEEKS) {
      const dateKey = toDateKey(date)
      grid[col][row] = {
        date,
        dateKey,
        count: matchesByDate[dateKey] ?? 0,
      }
    }
  }

  const monthLabels: (string | null)[] = Array(WEEKS).fill(null)
  let previousMonth: number | null = null

  for (let col = 0; col < WEEKS; col += 1) {
    const cell = grid[col].find(Boolean)
    if (!cell) continue

    const month = cell.date.getUTCMonth()
    if (month !== previousMonth) {
      monthLabels[col] = cell.date.toLocaleDateString('es-AR', { month: 'short', timeZone: 'UTC' })
      previousMonth = month
    }
  }

  return { grid, monthLabels }
}

/** Returns a background color from the site's dark-blue/crimson palette. */
export function getLevelColor(count: number): string {
  if (count <= 0) return '#0b3e64'      // muted – empty cell
  if (count === 1) return '#5a0a28'     // low – dark crimson
  if (count === 2) return '#7d1040'     // medium-low
  if (count <= 4) return '#950c42'      // medium – primary
  return '#c41a5a'                      // high – bright primary
}

export function formatCalendarTooltip(date: Date, count: number): string {
  const formatted = date.toLocaleDateString('es-AR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

  if (count === 0) return `Sin partidas el ${formatted}`
  return `${count} partida${count === 1 ? '' : 's'} el ${formatted}`
}

export function formatCalendarFilterLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export async function getMatchesByDate(): Promise<Record<string, number>> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return {}

  const { data } = await supabase
    .from('matches')
    .select('played_at')
    .order('played_at', { ascending: true })

  const matchesByDate: Record<string, number> = {}

  for (const row of data ?? []) {
    if (!row.played_at) continue
    const dateKey = toDateKey(row.played_at)
    if (!dateKey) continue
    matchesByDate[dateKey] = (matchesByDate[dateKey] ?? 0) + 1
  }

  return matchesByDate
}
