import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await supabase.from('players').select('id, name').order('name')

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los jugadores' }, { status: 500 })
  }

  return NextResponse.json((data ?? []).map((player) => ({ id: player.id, name: player.name ?? 'Sin info' })))
}
