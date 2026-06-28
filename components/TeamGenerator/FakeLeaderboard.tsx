'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

type FakeEntry = {
  id: string
  player_name: string
  fake_count: number
  created_at: string
}

export function FakeLeaderboard() {
  const [entries, setEntries] = useState<FakeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [incrementing, setIncrementing] = useState<string | null>(null)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  
  const supabase = getSupabaseClient()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('fake_leaderboard')
        .select('*')
        .order('fake_count', { ascending: false })
        .order('player_name', { ascending: true }) // fallback sort
      
      if (data) {
        setEntries(data)
      }
      setLoading(false)
    }

    fetchInitial()

    const channel = supabase
      .channel('fake_leaderboard_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fake_leaderboard' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setEntries((current) => {
              const exists = current.some(e => e.id === payload.new.id)
              const newEntries = exists
                ? current.map((entry) => 
                    entry.id === payload.new.id 
                      ? { ...entry, fake_count: payload.new.fake_count }
                      : entry
                  )
                : [...current, payload.new as FakeEntry]
              
              return [...newEntries].sort((a, b) => {
                if (b.fake_count !== a.fake_count) {
                  return b.fake_count - a.fake_count
                }
                return a.player_name.localeCompare(b.player_name)
              })
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleIncrement = async (id: string, currentCount: number) => {
    if (!supabase || incrementing === id) return

    // Visual feedback state
    setAnimatingId(id)
    setTimeout(() => setAnimatingId(null), 1000)

    // Optimistic update
    setEntries((current) => {
      const newEntries = current.map((entry) =>
        entry.id === id ? { ...entry, fake_count: entry.fake_count + 1 } : entry
      )
      return [...newEntries].sort((a, b) => {
        if (b.fake_count !== a.fake_count) {
          return b.fake_count - a.fake_count
        }
        return a.player_name.localeCompare(b.player_name)
      })
    })

    setIncrementing(id)

    const { error } = await supabase
      .from('fake_leaderboard')
      .update({ fake_count: currentCount + 1 })
      .eq('id', id)

    setIncrementing(null)

    if (error) {
      // Revert optimistic update on error
      setEntries((current) => {
        const newEntries = current.map((entry) =>
          entry.id === id ? { ...entry, fake_count: Math.max(0, entry.fake_count - 1) } : entry
        )
        return [...newEntries].sort((a, b) => {
          if (b.fake_count !== a.fake_count) {
            return b.fake_count - a.fake_count
          }
          return a.player_name.localeCompare(b.player_name)
        })
      })
      alert('Error al actualizar el contador. Intente nuevamente.')
    }
  }

  const getBadgeColors = (count: number) => {
    if (count <= 2) return 'bg-zinc-800 text-zinc-400'
    if (count <= 7) return 'bg-yellow-900 text-yellow-300'
    if (count <= 14) return 'bg-orange-900 text-orange-300'
    return 'bg-red-900 text-red-300'
  }

  if (loading) {
    return (
      <div className="mt-12 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          🤡 Top Fakeados
        </h2>
        <div className="animate-pulse flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-zinc-900 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="mt-12 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          🤡 Top Fakeados
        </h2>
        <p className="text-sm text-muted-foreground italic">No hay registros de fakeos aún.</p>
      </div>
    )
  }

  return (
    <div className="mt-12 space-y-4">
      <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
        🤡 Top Fakeados
      </h2>
      <div className="flex flex-col gap-2">
        {entries.map((entry, index) => {
          const isTop = index === 0
          const badgeColors = getBadgeColors(entry.fake_count)
          const isAnimating = animatingId === entry.id

          return (
            <div 
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isTop 
                  ? 'bg-zinc-900/80 border-yellow-600/50 shadow-[inset_2px_0_0_0_rgba(202,138,4,0.5)]' 
                  : 'bg-zinc-950 border-border/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-muted-foreground w-6">
                  #{index + 1}
                </span>
                <span className="font-bold text-sm text-foreground truncate max-w-[120px] sm:max-w-xs">
                  {entry.player_name}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeColors}`}>
                  🤡 {entry.fake_count}
                </span>
              </div>

              <button
                onClick={() => handleIncrement(entry.id, entry.fake_count)}
                disabled={incrementing === entry.id}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all duration-200 ${
                  isAnimating
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-300'
                    : 'bg-transparent border-border hover:bg-zinc-900 text-foreground'
                } disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] flex justify-center`}
              >
                {isAnimating ? '🤡 +1' : '+ Fakear'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
