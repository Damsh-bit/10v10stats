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

export function buildCalendarGrid(matchesByDate: Record<string, number>) {
  const endDate = getTodayUTC()
  const startDate = addDaysUTC(endDate, -363)
  const firstMonday = addDaysUTC(startDate, -getMondayRow(startDate))

  const grid: (CalendarCell | null)[][] = Array.from({ length: 52 }, () => Array(7).fill(null))

  for (let i = 0; i < 364; i += 1) {
    const date = addDaysUTC(startDate, i)
    const col = Math.floor((date.getTime() - firstMonday.getTime()) / (7 * MS_DAY))
    const row = getMondayRow(date)

    if (col >= 0 && col < 52) {
      const dateKey = toDateKey(date)
      grid[col][row] = {
        date,
        dateKey,
        count: matchesByDate[dateKey] ?? 0,
      }
    }
  }

  const monthLabels: (string | null)[] = Array(52).fill(null)
  let previousMonth: number | null = null

  for (let col = 0; col < 52; col += 1) {
    const cell = grid[col].find(Boolean)
    if (!cell) continue

    const month = cell.date.getUTCMonth()
    if (month !== previousMonth) {
      monthLabels[col] = cell.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
      previousMonth = month
    }
  }

  return { grid, monthLabels }
}

export function getLevelColor(count: number): string {
  if (count <= 0) return '#161b22'
  if (count === 1) return '#0e4429'
  if (count === 2) return '#006d32'
  if (count <= 4) return '#26a641'
  return '#39d353'
}

export function formatCalendarTooltip(date: Date, count: number): string {
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

  if (count === 0) return `No matches on ${formatted}`
  return `${count} match${count === 1 ? '' : 'es'} on ${formatted}`
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
