'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { X } from 'lucide-react'

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
  const [selectedPlayer, setSelectedPlayer] = useState<FakeEntry | null>(null)
  
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
        .order('player_name', { ascending: true })
      
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

  if (loading) {
    return (
      <div className="mt-8 space-y-4">
        <h2 className="font-heading text-[13px] font-bold uppercase tracking-[0.2em] text-foreground">
          StatTrak™ Fakasos
        </h2>
        <div className="animate-pulse flex flex-col gap-px bg-border/50 border border-border/50 rounded-lg overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-card"></div>
          ))}
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return null
  }

  return (
    <>
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-[13px] font-bold uppercase tracking-[0.2em] text-foreground">
            StatTrak™ Fakasos
          </h2>
        </div>
        <div className="flex flex-col border border-border/50 rounded-lg overflow-hidden bg-card">
          {entries.map((entry, index) => {
            const isTop = index === 0
            
            return (
              <button 
                key={entry.id}
                onClick={() => setSelectedPlayer(entry)}
                disabled={incrementing === entry.id}
                className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-white/[0.03] transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-mono w-4 ${isTop ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {index + 1}.
                  </span>
                  <span className={`text-sm font-medium ${isTop ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                    {entry.player_name}
                  </span>
                </div>
                <div className="font-mono text-[13px] font-semibold text-primary/80">
                  {entry.fake_count.toLocaleString()}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border p-5 rounded-lg shadow-xl max-w-[320px] w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Sumar Fakaso</h3>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[13px] text-muted-foreground mb-6">
              ¿Confirmás que querés sumarle un fakaso a <strong className="text-foreground">{selectedPlayer.player_name}</strong>?
            </p>
            
            <div className="flex gap-2 justify-end">
              <button 
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSelectedPlayer(null)}
              >
                Cancelar
              </button>
              <button 
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 font-bold uppercase tracking-wider transition-colors"
                onClick={() => { 
                  handleIncrement(selectedPlayer.id, selectedPlayer.fake_count)
                  setSelectedPlayer(null)
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
