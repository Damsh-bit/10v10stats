'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Drama, X } from 'lucide-react'
import { LayoutGroup, motion } from 'motion/react'
import { Portal, useBodyScrollLock } from '@/components/ui/portal'

const ADMIN_PASSWORD = 'alzhannah2026'

type FakeEntry = {
  id: string
  player_name: string
  fake_count: number
  created_at: string
}

type ArchivedFakeEntry = { name: string; count: number }

/**
 * StatTrak™ Fakasos. Sin props muestra el contador vivo de la temporada activa;
 * con `archived` muestra el snapshot final de una temporada cerrada (solo lectura).
 */
export function FakeLeaderboard({ archived }: { archived?: ArchivedFakeEntry[] } = {}) {
  const readOnly = archived !== undefined
  const [entries, setEntries] = useState<FakeEntry[]>(() =>
    (archived ?? [])
      .map((entry) => ({ id: entry.name, player_name: entry.name, fake_count: entry.count, created_at: '' }))
      .sort((a, b) => b.fake_count - a.fake_count || a.player_name.localeCompare(b.player_name)),
  )
  const [loading, setLoading] = useState(!readOnly)
  const [incrementing, setIncrementing] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<FakeEntry | null>(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useBodyScrollLock(!!selectedPlayer)
  const supabase = getSupabaseClient()

  useEffect(() => {
    if (readOnly) return
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
  }, [supabase, readOnly])

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

  const header = (
    <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
        <Drama className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
          StatTrak™ Fakasos
        </h2>
        <p className="text-[11px] text-muted-foreground">
          {readOnly ? 'Conteo final de la temporada' : 'Tocá un jugador para sumarle un fakaso'}
        </p>
      </div>
    </header>
  )

  if (loading) {
    return (
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {header}
        <div className="flex animate-pulse flex-col gap-px bg-border/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-card"></div>
          ))}
        </div>
      </section>
    )
  }

  if (entries.length === 0) {
    return null
  }

  const maxCount = Math.max(...entries.map((e) => e.fake_count), 1)
  const everyoneAtZero = entries.every((e) => e.fake_count === 0)
  const COLLAPSED_ROWS = 5
  const visibleEntries = expanded ? entries : entries.slice(0, COLLAPSED_ROWS)

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {header}
        {everyoneAtZero && !readOnly && (
          <p className="border-b border-border bg-purple-500/5 px-4 py-2 text-center text-[11px] text-purple-200/80">
            Contador en cero para todos. ¿Quién estrena el primer fakaso de la temporada?
          </p>
        )}
        <LayoutGroup>
          <ul className="flex flex-col">
            {visibleEntries.map((entry, index) => {
              const isTop = index === 0 && entry.fake_count > 0
              const row = (
                <>
                  <span className={`w-5 font-mono text-[11px] ${isTop ? 'font-bold text-purple-300' : 'text-muted-foreground'}`}>
                    {index + 1}.
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={`truncate text-sm ${isTop ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {isTop && <span className="mr-1" aria-hidden="true">🎭</span>}
                      {entry.player_name}
                    </span>
                    <span className="h-1 w-full overflow-hidden rounded-full bg-muted/50" aria-hidden="true">
                      <motion.span
                        className="block h-full rounded-full bg-purple-400/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${(entry.fake_count / maxCount) * 100}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                  </span>
                  <span className="w-8 text-right font-mono text-[13px] font-semibold text-purple-300/90 tabular-nums">
                    {entry.fake_count.toLocaleString()}
                  </span>
                </>
              )

              return (
                <motion.li key={entry.id} layout transition={{ type: 'spring', stiffness: 500, damping: 40 }} className="border-b border-border/60 last:border-0">
                  {readOnly ? (
                    <div className="flex items-center gap-3 px-4 py-2">{row}</div>
                  ) : (
                    <button
                      onClick={() => { setSelectedPlayer(entry); setPassword(''); setPasswordError(false) }}
                      disabled={incrementing === entry.id}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.03] disabled:opacity-50"
                    >
                      {row}
                    </button>
                  )}
                </motion.li>
              )
            })}
          </ul>
        </LayoutGroup>
        {entries.length > COLLAPSED_ROWS && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="w-full border-t border-border/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-purple-300 transition-colors hover:bg-purple-500/10"
            aria-expanded={expanded}
          >
            {expanded ? 'Ver menos' : `Ver los ${entries.length}`}
          </button>
        )}
      </section>

      {selectedPlayer && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border p-5 rounded-lg shadow-xl max-w-[320px] w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Sumar Fakaso</h3>
                <button 
                  onClick={() => { setSelectedPlayer(null); setPassword(''); setPasswordError(false) }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-[13px] text-muted-foreground mb-4">
                ¿Confirmás que querés sumarle un fakaso a <strong className="text-foreground">{selectedPlayer.player_name}</strong>?
              </p>
  
              <div className="mb-4">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Clave
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(false) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (password !== ADMIN_PASSWORD) {
                        setPasswordError(true)
                      } else {
                        handleIncrement(selectedPlayer.id, selectedPlayer.fake_count)
                        setSelectedPlayer(null)
                        setPassword('')
                        setPasswordError(false)
                      }
                    }
                  }}
                  placeholder="••••••••••••"
                  autoFocus
                  className={`w-full rounded border px-3 py-1.5 text-sm bg-background text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors ${
                    passwordError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-border focus:border-primary'
                  }`}
                />
                {passwordError && (
                  <p className="mt-1.5 text-[11px] text-red-500">Clave incorrecta.</p>
                )}
              </div>
              
              <div className="flex gap-2 justify-end">
                <button 
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setSelectedPlayer(null); setPassword(''); setPasswordError(false) }}
                >
                  Cancelar
                </button>
                <button 
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!password}
                  onClick={() => {
                    if (password !== ADMIN_PASSWORD) {
                      setPasswordError(true)
                      return
                    }
                    handleIncrement(selectedPlayer.id, selectedPlayer.fake_count)
                    setSelectedPlayer(null)
                    setPassword('')
                    setPasswordError(false)
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
