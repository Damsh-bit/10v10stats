import { createClient } from '@supabase/supabase-js'

export type SupabasePlayerRecord = {
  id: string
  name: string | null
  badge?: string | null
  photo_url?: string | null
  contador_nelson?: number | null
}

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) return false

  const trimmed = value.trim()
  if (!trimmed) return false

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function hasPlaceholderValue(value: string | undefined) {
  if (!value) return true

  const normalized = value.trim().toLowerCase()
  return normalized.includes('your-') || normalized.includes('example') || normalized.includes('placeholder')
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL

  if (!isValidHttpUrl(supabaseUrl) || hasPlaceholderValue(supabaseUrl)) {
    return null
  }

  return {
    url: supabaseUrl.trim(),
  }
}

export function getSupabaseClient() {
  const config = getSupabaseConfig()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!config || !supabaseAnonKey || hasPlaceholderValue(supabaseAnonKey)) {
    return null
  }

  return createClient(config.url, supabaseAnonKey.trim(), {
    auth: { persistSession: false },
  })
}

export function getSupabaseAdminClient() {
  const config = getSupabaseConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!config || !serviceRoleKey || hasPlaceholderValue(serviceRoleKey)) {
    return null
  }

  return createClient(config.url, serviceRoleKey.trim(), {
    auth: { persistSession: false },
  })
}

export async function getPlayersFromSupabase(): Promise<SupabasePlayerRecord[]> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase.from('players').select('id, name, badge, photo_url, contador_nelson').order('name')

    if (error || !data) return []

    return (data ?? []).map((player) => ({
      id: player.id,
      name: player.name ?? 'Sin info',
      badge: player.badge ?? null,
      photo_url: player.photo_url ?? null,
      contador_nelson: player.contador_nelson ?? null,
    }))
  } catch {
    return []
  }
}
