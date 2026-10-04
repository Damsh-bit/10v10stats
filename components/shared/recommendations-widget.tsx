"use client"

import { useState, useEffect, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { MessageSquarePlus, X } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { useDropdownTransition } from "@/components/ui/dropdown"
import { useWebHaptics } from "@/components/amicro/hooks/use-web-haptics"

type Recommendation = {
  id: string
  content: string
  created_at: string
}

export function RecommendationsWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownState = useDropdownTransition(isOpen)
  const haptics = useWebHaptics()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [content, setContent] = useState("")
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const supabase = getSupabaseClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase) return

    // Fetch initial
    const fetchRecommendations = async () => {
      const { data } = await supabase
        .from('recommendations')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (data) setRecommendations(data)
    }

    fetchRecommendations()

    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recommendations',
        },
        (payload) => {
          setRecommendations((prev) => [payload.new as Recommendation, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || content.trim().length < 5 || content.trim().length > 500) return

    setStatus('submitting')
    const { error } = await supabase
      .from('recommendations')
      .insert({ content: content.trim() })

    if (error) {
      console.error("Error inserting recommendation:", error)
      setStatus('error')
      haptics.trigger('error')
    } else {
      setStatus('success')
      haptics.trigger('success')
      setContent('')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <>
      {/* Mobile: botón redondo en la esquina, para no tapar el contenido. */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/40 bg-background/95 text-emerald-400 shadow-lg shadow-black/40 backdrop-blur transition-colors hover:bg-muted sm:hidden"
        aria-label="Recomendaciones"
        aria-expanded={isOpen}
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed z-50 bottom-6 left-0 hidden items-center justify-center bg-background border border-border border-l-0 text-foreground px-1.5 py-4 rounded-r-lg shadow-md hover:bg-muted transition-colors group sm:flex"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        aria-label="Recomendaciones"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium tracking-wider uppercase text-emerald-500 group-hover:text-emerald-400">
          Recomendaciones
        </span>
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 sm:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        data-origin="bottom-right"
        data-origin-sm="bottom-left"
        inert={!isOpen}
        className={`t-dropdown ${dropdownState} fixed z-50 bottom-[4.5rem] left-2 right-2 sm:bottom-6 sm:left-12 sm:right-auto sm:w-[320px] bg-background border border-border shadow-lg rounded-xl flex flex-col overflow-hidden`}
        style={{ maxHeight: '420px', height: '100%' }}
      >
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span>💬</span> Recomendaciones
          </h3>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[150px]">
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center my-auto">
              No hay recomendaciones aún. ¡Sé el primero!
            </p>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} className="text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <p className="text-foreground whitespace-pre-wrap break-words">{rec.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-border bg-muted/10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dejá tu recomendación..."
              className="w-full text-sm bg-background border border-input rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              rows={3}
              maxLength={500}
              disabled={status === 'submitting'}
            />
            
            <div className="flex items-center justify-between">
              <span className={`text-[10px] ${content.trim().length > 0 && (content.trim().length < 5 || content.trim().length > 500) ? 'text-destructive' : 'text-muted-foreground'}`}>
                {content.length}/500
              </span>
              
              {status === 'success' && (
                <span className="text-[10px] text-emerald-500 font-medium">¡Gracias por tu recomendación! 🎉</span>
              )}
              {status === 'error' && (
                <span className="text-[10px] text-destructive font-medium">Algo salió mal</span>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'submitting' || content.trim().length < 5 || content.trim().length > 500}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
