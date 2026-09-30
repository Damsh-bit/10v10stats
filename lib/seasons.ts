import { cache } from 'react'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

export type Season = {
  id: number
  slug: string
  name: string
  tagline: string | null
  startsAt: string
  endsAt: string | null
  isCurrent: boolean
}

export type SeasonSnapshot = {
  seasonId: number
  playerId: string
  nelsonPoints: number
  fakeCount: number
  mvps: number
}

/**
 * Corte entre temporadas. Las partidas se guardan con `played_at` a medianoche
 * UTC del día elegido, por eso el corte también va en UTC.
 */
export const SEASON_2_START = '2026-09-30T00:00:00.000Z'

/**
 * Se usa solo si la tabla `seasons` todavía no existe (migración
 * `supabase/migrations/20260930120000_seasons.sql` sin aplicar). En ese caso
 * las partidas se asignan a una temporada por fecha.
 */
const FALLBACK_SEASONS: Season[] = [
  {
    id: 1,
    slug: 'season-1',
    name: 'Season 1',
    tagline: 'La temporada fundacional',
    startsAt: '2025-12-31T00:00:00.000Z',
    endsAt: SEASON_2_START,
    isCurrent: false,
  },
  {
    id: 2,
    slug: 'season-2',
    name: 'Season 2',
    tagline: 'Todos arrancan de cero',
    startsAt: SEASON_2_START,
    endsAt: null,
    isCurrent: true,
  },
]

/** Partidas mínimas en la temporada para entrar al ranking (a partir de la S2). */
export const PLACEMENT_MATCHES = 3

export function getPlacementMatches(season: Pick<Season, 'id'>) {
  // La Season 1 se jugó sin partidas de clasificación: se respeta tal cual terminó.
  return season.id >= 2 ? PLACEMENT_MATCHES : 1
}

type SeasonRow = {
  id: number
  slug: string
  name: string
  tagline: string | null
  starts_at: string
  ends_at: string | null
  is_current: boolean
}

export const getSeasons = cache(async (): Promise<Season[]> => {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return FALLBACK_SEASONS

  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('id, slug, name, tagline, starts_at, ends_at, is_current')
      .order('id')

    if (error || !data || data.length === 0) return FALLBACK_SEASONS

    return (data as SeasonRow[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      isCurrent: row.is_current,
    }))
  } catch {
    return FALLBACK_SEASONS
  }
})

export const getSeasonSnapshots = cache(async (): Promise<SeasonSnapshot[] | null> => {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('season_player_snapshots')
      .select('season_id, player_id, nelson_points, fake_count, mvps')

    if (error || !data) return null

    return data.map((row) => ({
      seasonId: row.season_id as number,
      playerId: row.player_id as string,
      nelsonPoints: Number(row.nelson_points ?? 0),
      fakeCount: Number(row.fake_count ?? 0),
      mvps: Number(row.mvps ?? 0),
    }))
  } catch {
    return null
  }
})

export function getCurrentSeason(seasons: Season[]): Season {
  return seasons.find((s) => s.isCurrent) ?? seasons[seasons.length - 1] ?? FALLBACK_SEASONS[1]
}

export function getPreviousSeason(seasons: Season[], season: Season): Season | null {
  return [...seasons].filter((s) => s.id < season.id).sort((a, b) => b.id - a.id)[0] ?? null
}

export function findSeasonBySlug(seasons: Season[], slug: string) {
  return seasons.find((s) => s.slug === slug) ?? null
}

/** Asigna una partida a una temporada por fecha (solo para el modo fallback). */
export function seasonIdForDate(seasons: Season[], iso: string): number {
  const time = new Date(iso).getTime()
  const current = getCurrentSeason(seasons)
  if (Number.isNaN(time)) return current.id

  const match = [...seasons]
    .sort((a, b) => b.id - a.id)
    .find((s) => time >= new Date(s.startsAt).getTime())

  return match?.id ?? seasons[0]?.id ?? current.id
}

export function seasonShortName(season: Pick<Season, 'id'>) {
  return `S${season.id}`
}

/** Día de la temporada (1-based) para la temporada activa. */
export function getSeasonDay(season: Season, now = new Date()) {
  const start = new Date(season.startsAt).getTime()
  if (Number.isNaN(start)) return 1
  return Math.max(1, Math.floor((now.getTime() - start) / 86_400_000) + 1)
}

export function formatSeasonDate(iso: string | null) {
  if (!iso) return 'En curso'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin info'
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
