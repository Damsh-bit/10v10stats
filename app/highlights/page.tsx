import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'
import { highlightTypeColors, type HighlightType, getLiveData } from '@/lib/mockData'
import { VideoEmbed } from '@/components/video-embed'
import { Film } from 'lucide-react'
import Link from 'next/link'

type HighlightRow = {
  id: string
  player_id: string
  type: string | null
  description: string | null
  round_number: number | null
  clip_url: string | null
  created_at?: string | null
}

function resolveClipUrl(clipUrl: string | null | undefined): string | null {
  if (!clipUrl) return null
  const trimmed = clipUrl.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed

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
  return validTypes.includes(upper as HighlightType) ? (upper as HighlightType) : 'OTHER'
}

export default async function HighlightsPage() {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  let highlights: HighlightRow[] = []

  if (supabase) {
    const { data, error } = await supabase
      .from('highlights')
      .select('id, player_id, type, description, round_number, clip_url, created_at')
      .order('created_at', { ascending: false })

    if (!error && data) {
      highlights = data as HighlightRow[]
    }
  }

  // Fetch player names to show who the highlight belongs to
  const liveData = await getLiveData()
  const playerMap = new Map(liveData.players.map(p => [p.id, p.name]))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Highlights
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Todas las burradas(o no) de ALZ.
        </p>
      </div>

      {highlights.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/30">
            <Film className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Todavía no hay highlights registrados
          </p>
          <p className="max-w-xs text-xs text-muted-foreground/70">
            Los clips se agregan desde el botón &quot;Nuevo highlight&quot; en el dashboard.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((row) => {
            const type = normalizeType(row.type)
            const color = highlightTypeColors[type]
            const clipUrl = resolveClipUrl(row.clip_url)
            const playerName = playerMap.get(row.player_id) || 'Jugador desconocido'

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

                {/* Player Link & Meta */}
                <div className="mt-1 flex items-center justify-between">
                  <Link href={`/players/${row.player_id}`} className="font-semibold text-foreground hover:text-primary transition-colors text-sm">
                    {playerName}
                  </Link>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {row.round_number ? `R${row.round_number}` : ''}
                  </span>
                </div>

                {/* Type Badge */}
                <div className="flex items-center mt-1">
                  <span
                    className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-background"
                    style={{ backgroundColor: color }}
                  >
                    {type.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Description */}
                {row.description ? (
                  <p className="line-clamp-2 mt-1 text-[13px] leading-relaxed text-foreground/80">
                    {row.description}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
