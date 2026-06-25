import { NextResponse } from 'next/server'
import { getPlayersFromSupabase } from '@/lib/supabase'

export async function GET() {
  const players = await getPlayersFromSupabase()

  const mappedPlayers = players.map((player) => ({
    id: player.id,
    name: player.name ?? 'Sin info',
    badge: player.badge ?? null,
  }))

  return NextResponse.json(mappedPlayers)
}
