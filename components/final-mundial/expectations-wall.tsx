'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { SmilePlus, X } from 'lucide-react'
import EmojiPicker, { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react'
import { getSupabaseClient } from '@/lib/supabase'

type Expectation = {
  id: string
  content: string
  created_at: string
}

type Reaction = {
  id: string
  expectation_id: string
  emoji: string
  count: number
}

const MY_REACTIONS_KEY = 'final_mundial_my_reactions'
const MIN_LENGTH = 3
const MAX_LENGTH = 280
const STAGGER_STEP_MS = 60
const STAGGER_CAP = 8

function loadMyReactions(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(MY_REACTIONS_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveMyReactions(reactions: Set<string>) {
  try {
    window.localStorage.setItem(MY_REACTIONS_KEY, JSON.stringify([...reactions]))
  } catch {
    // ignore storage errors
  }
}

export function ExpectationsWall() {
  const [expectations, setExpectations] = useState<Expectation[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set())
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [loading, setLoading] = useState(true)
  const [openPickerId, setOpenPickerId] = useState<string | null>(null)

  const supabase = getSupabaseClient()

  useEffect(() => {
    setMyReactions(loadMyReactions())
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const fetchInitial = async () => {
      const [{ data: expData }, { data: reactData }] = await Promise.all([
        supabase.from('final_expectations').select('*').order('created_at', { ascending: false }),
        supabase.from('final_expectation_reactions').select('*'),
      ])

      if (expData) setExpectations(expData)
      if (reactData) setReactions(reactData)
      setLoading(false)
    }

    fetchInitial()

    const channel = supabase
      .channel('final_expectations_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'final_expectations' },
        (payload) => {
          setExpectations((current) => [payload.new as Expectation, ...current])
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'final_expectation_reactions' },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          const row = payload.new as Reaction
          setReactions((current) => {
            const exists = current.some((r) => r.id === row.id)
            return exists ? current.map((r) => (r.id === row.id ? row : r)) : [...current, row]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const reactionsByExpectation = useMemo(() => {
    const map = new Map<string, Map<string, Reaction>>()
    for (const reaction of reactions) {
      if (!map.has(reaction.expectation_id)) map.set(reaction.expectation_id, new Map())
      map.get(reaction.expectation_id)!.set(reaction.emoji, reaction)
    }
    return map
  }, [reactions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!supabase || trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) return

    setStatus('submitting')
    const { error } = await supabase.from('final_expectations').insert({ content: trimmed })

    if (error) {
      setStatus('error')
    } else {
      setStatus('success')
      setContent('')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  const handleReact = async (expectationId: string, emoji: string) => {
    if (!supabase) return

    const key = `${expectationId}:${emoji}`
    const alreadyReacted = myReactions.has(key)
    const existing = reactionsByExpectation.get(expectationId)?.get(emoji)

    const nextMyReactions = new Set(myReactions)
    if (alreadyReacted) {
      nextMyReactions.delete(key)
    } else {
      nextMyReactions.add(key)
    }
    setMyReactions(nextMyReactions)
    saveMyReactions(nextMyReactions)

    if (alreadyReacted && existing) {
      const nextCount = Math.max(0, existing.count - 1)
      setReactions((current) => current.map((r) => (r.id === existing.id ? { ...r, count: nextCount } : r)))
      await supabase.from('final_expectation_reactions').update({ count: nextCount }).eq('id', existing.id)
      return
    }

    if (existing) {
      const nextCount = existing.count + 1
      setReactions((current) => current.map((r) => (r.id === existing.id ? { ...r, count: nextCount } : r)))
      await supabase.from('final_expectation_reactions').update({ count: nextCount }).eq('id', existing.id)
      return
    }

    const { data } = await supabase
      .from('final_expectation_reactions')
      .insert({ expectation_id: expectationId, emoji, count: 1 })
      .select()
      .single()

    if (data) {
      setReactions((current) => [...current, data as Reaction])
    }
  }

  return (
    <section className="mt-8 flex flex-col gap-4">
      <h2 className="fade-in-up font-heading text-[13px] font-bold uppercase tracking-[0.2em] text-foreground opacity-0">
        Expectativas para la Final del Mundo
      </h2>

      <form
        onSubmit={handleSubmit}
        className="fade-in-up flex flex-col gap-2 rounded-lg border border-border bg-card p-4 opacity-0"
        style={{ animationDelay: '100ms' }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dejá tu expectativa de forma anónima..."
          className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
          rows={3}
          maxLength={MAX_LENGTH}
          disabled={status === 'submitting'}
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] ${
              content.trim().length > 0 && (content.trim().length < MIN_LENGTH || content.trim().length > MAX_LENGTH)
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {content.length}/{MAX_LENGTH}
          </span>
          {status === 'success' && (
            <span className="text-[10px] font-medium text-yellow-400">¡Gracias por tu expectativa! 🔥</span>
          )}
          {status === 'error' && <span className="text-[10px] font-medium text-destructive">Algo salió mal</span>}
        </div>
        <button
          type="submit"
          disabled={status === 'submitting' || content.trim().length < MIN_LENGTH || content.trim().length > MAX_LENGTH}
          className="w-full cursor-pointer rounded-md bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 py-2 text-sm font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'submitting' ? 'Enviando...' : 'Publicar anónimamente'}
        </button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-border/50 bg-card" />
          ))}
        </div>
      ) : expectations.length === 0 ? (
        <p className="fade-in-up rounded-lg border border-border/50 bg-card py-8 text-center text-sm text-muted-foreground opacity-0">
          Todavía no hay expectativas. ¡Sé el primero en dejar la tuya!
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {expectations.map((exp, index) => {
            const expReactions = reactionsByExpectation.get(exp.id)
            const usedEmojis = expReactions
              ? [...expReactions.values()].filter((r) => r.count > 0).map((r) => r.emoji)
              : []

            return (
              <div
                key={exp.id}
                className="fade-in-up flex flex-col justify-between gap-3 rounded-lg border border-border/50 bg-card p-4 opacity-0 shadow-sm"
                style={{ animationDelay: `${(index % STAGGER_CAP) * STAGGER_STEP_MS}ms` }}
              >
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">{exp.content}</p>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(exp.created_at), { addSuffix: true, locale: es })}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {usedEmojis.map((emoji) => {
                      const count = expReactions?.get(emoji)?.count ?? 0
                      const reacted = myReactions.has(`${exp.id}:${emoji}`)
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReact(exp.id, emoji)}
                          className={`flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] transition-colors ${
                            reacted
                              ? 'border-yellow-400 bg-yellow-400/15 text-yellow-300'
                              : 'border-border/60 text-muted-foreground hover:border-yellow-400/50 hover:text-foreground'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="font-mono">{count}</span>
                        </button>
                      )
                    })}

                    <button
                      onClick={() => setOpenPickerId(exp.id)}
                      className="flex cursor-pointer items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[12px] text-muted-foreground transition-colors hover:border-yellow-400/50 hover:text-foreground"
                    >
                      <SmilePlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {openPickerId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpenPickerId(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="pop-in relative">
            <button
              onClick={() => setOpenPickerId(null)}
              className="absolute -top-3 -right-3 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <EmojiPicker
              theme={Theme.DARK}
              emojiStyle={EmojiStyle.NATIVE}
              searchDisabled
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
              width={Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 32 : 320)}
              height={420}
              onEmojiClick={(emojiData: EmojiClickData) => {
                handleReact(openPickerId, emojiData.emoji)
                setOpenPickerId(null)
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
