import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'
import { highlightTypeColors, type HighlightType } from '@/lib/mockData'
import { VideoEmbed } from '@/components/video-embed'
import { Film } from 'lucide-react'

type HighlightRow = {
  id: string
  player_id: string
  type: string | null
  description: string | null
  round_number: number | null
  clip_url: string | null
  created_at?: string | null
}

/**
 * Resolves the video URL for a highlight.
 *
 * - If `clip_url` is already a full URL (starts with http), it's returned as-is.
 *   This is the normal case because the API route already stores the public URL.
 * - If it's a relative storage path, we resolve it via `getPublicUrl`.
 */
function resolveClipUrl(clipUrl: string | null | undefined): string | null {
  if (!clipUrl) return null

  const trimmed = clipUrl.trim()
  if (!trimmed) return null

  // Already a full URL — return directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // Relative storage path — resolve via Supabase Storage
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return null

  const { data } = supabase.storage.from('highlights').getPublicUrl(trimmed)
  return data.publicUrl
}

function normalizeType(value: string | null): HighlightType {
  if (!value) return 'OTHER'
  const upper = value.trim().toUpperCase()
  const validTypes: HighlightType[] = [
    'ACE',
    'QUAD_KILL',
    'TRIPLE_KILL',
    'CLUTCH',
    'ENTRY_FRAG',
    'KNIFE_KILL',
    'OTHER',
  ]
  return validTypes.includes(upper as HighlightType)
    ? (upper as HighlightType)
    : 'OTHER'
}

/**
 * Fetches highlights directly from the `highlights` table for a specific player.
 * This is a focused query — no need to load the entire LiveData payload.
 */
async function fetchPlayerHighlights(playerId: string): Promise<HighlightRow[]> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('highlights')
    .select('id, player_id, type, description, round_number, clip_url, created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as HighlightRow[]
}

// ── Skeleton (shown via Suspense fallback) ──────────────────────────

export function PlayerHighlightsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 animate-pulse"
        >
          {/* Video skeleton */}
          <div className="aspect-video w-full rounded-lg bg-muted/40" />
          {/* Badge + round skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-5 w-20 rounded bg-muted/40" />
            <div className="h-4 w-10 rounded bg-muted/30" />
          </div>
          {/* Description skeleton */}
          <div className="h-4 w-3/4 rounded bg-muted/30" />
        </div>
      ))}
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/30">
        <Film className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Este jugador aún no tiene highlights
      </p>
      <p className="max-w-xs text-xs text-muted-foreground/70">
        Los clips se agregan desde el botón &quot;Nuevo highlight&quot; en el dashboard.
      </p>
    </div>
  )
}

// ── Main grid component ─────────────────────────────────────────────

export async function PlayerHighlightsGrid({
  playerId,
}: {
  playerId: string
}) {
  const rows = await fetchPlayerHighlights(playerId)

  if (rows.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => {
        const type = normalizeType(row.type)
        const color = highlightTypeColors[type]
        const clipUrl = resolveClipUrl(row.clip_url)

        return (
          <div
            key={row.id}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-lg hover:shadow-primary/5"
          >
            {/* Video player */}
            {clipUrl ? (
              <div className="overflow-hidden rounded-lg border border-border/60">
                <VideoEmbed
                  url={clipUrl}
                  title={row.description || type}
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted/20 text-xs text-muted-foreground">
                Sin video disponible
              </div>
            )}

            {/* Meta: badge + round */}
            <div className="flex items-center justify-between">
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-background"
                style={{ backgroundColor: color }}
              >
                {type.replace(/_/g, ' ')}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {row.round_number ? `R${row.round_number}` : ''}
              </span>
            </div>

            {/* Description */}
            {row.description ? (
              <p className="line-clamp-2 text-[13px] leading-relaxed text-foreground/80">
                {row.description}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
