import { createClient } from '@supabase/supabase-js'

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
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (
    !isValidHttpUrl(supabaseUrl) ||
    !supabaseAnonKey ||
    hasPlaceholderValue(supabaseUrl) ||
    hasPlaceholderValue(supabaseAnonKey)
  ) {
    return null
  }

  return {
    url: supabaseUrl.trim(),
    anonKey: supabaseAnonKey.trim(),
  }
}

export function getSupabaseClient() {
  const config = getSupabaseConfig()
  if (!config) return null

  return createClient(config.url, config.anonKey, {
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
