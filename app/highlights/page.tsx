import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'
import { getLiveData } from '@/lib/mockData'
import { HighlightsGrid } from '@/components/highlights-grid'

export const dynamic = 'force-dynamic'

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

export default async function HighlightsPage() {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  let highlights: {
    id: string
    player_id: string
    type: string | null
    description: string | null
    round_number: number | null
    clip_url: string | null
    created_at?: string | null
  }[] = []

  if (supabase) {
    const { data, error } = await supabase
      .from('highlights')
      .select('id, player_id, type, description, round_number, clip_url, created_at')
      .order('created_at', { ascending: false })

    if (!error && data) {
      highlights = data.map((row) => ({
        ...row,
        // Resolve storage paths to full public URLs server-side
        clip_url: resolveClipUrl(row.clip_url),
      }))
    }
  }

  // Fetch player list for filter dropdown
  const liveData = await getLiveData()
  const players = liveData.players.map((p) => ({ id: p.id, name: p.name }))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Highlights
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Todas las burradas (o no) de ALZ.
        </p>
      </div>

      <HighlightsGrid highlights={highlights} players={players} />
    </main>
  )
}
