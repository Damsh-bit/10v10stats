'use client'

import { useEffect, useId, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Flag, Loader2, MessageSquareHeart, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDeviceId } from './dispositivo'
import { Tarjeta } from './tarjeta'

export type Recomendacion = { id: string; texto: string; creadaAt: string }

const MIN = 3
const MAX = 280
const CLAVE_REPORTADAS = 'recomendaciones-reportadas'

function leerReportadas(): Set<string> {
  try {
    const raw = localStorage.getItem(CLAVE_REPORTADAS)
    const lista: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(lista) ? lista.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function guardarReportada(id: string) {
  try {
    const ids = leerReportadas()
    ids.add(id)
    localStorage.setItem(CLAVE_REPORTADAS, JSON.stringify([...ids].slice(-200)))
  } catch {
    // sin storage: el servidor igual cuenta un reporte por navegador
  }
}

function hace(fecha: string) {
  const d = new Date(fecha)
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true, locale: es })
}

/**
 * Recomendaciones anónimas para el jugador, al pie del resumen como los
 * comentarios del perfil: cualquiera escribe, con 3 reportes se ocultan.
 */
export function Recomendaciones({
  playerId,
  nombre,
  iniciales,
}: {
  playerId: string
  nombre: string
  /** Las del render del servidor (null si la base no respondió). */
  iniciales: Recomendacion[] | null
}) {
  const [lista, setLista] = useState<Recomendacion[] | null>(iniciales)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [reportadas, setReportadas] = useState<Set<string>>(new Set())
  const [cargaFallo, setCargaFallo] = useState(false)
  const campoId = useId()

  // La página se cachea un minuto: al montarse se traen las últimas.
  useEffect(() => {
    setReportadas(leerReportadas())
    let vivo = true
    fetch(`/api/players/${playerId}/recomendaciones`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!vivo) return
        if (res.ok && Array.isArray(data?.recomendaciones)) setLista(data.recomendaciones)
        else setCargaFallo(true)
      })
      .catch(() => vivo && setCargaFallo(true))
    return () => {
      vivo = false
    }
  }, [playerId])

  const largo = texto.trim().length
  const valido = largo >= MIN && largo <= MAX

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valido || enviando) return
    setEnviando(true)
    setError(null)
    setOk(false)
    try {
      const res = await fetch(`/api/players/${playerId}/recomendaciones`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo enviar')
      setLista((actual) => [data.recomendacion as Recomendacion, ...(actual ?? [])])
      setTexto('')
      setOk(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar')
    } finally {
      setEnviando(false)
    }
  }

  const reportar = async (id: string) => {
    if (reportadas.has(id)) return
    if (!window.confirm('¿Reportar esta recomendación? Con 3 reportes se oculta.')) return
    guardarReportada(id)
    setReportadas((actual) => new Set(actual).add(id))
    try {
      const res = await fetch(`/api/players/${playerId}/recomendaciones/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device: getDeviceId() }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.oculta) setLista((actual) => actual?.filter((r) => r.id !== id) ?? null)
    } catch {
      // el reporte queda marcado acá; si falló, se puede volver a intentar recargando
    }
  }

  return (
    <Tarjeta
      icono={<MessageSquareHeart className="h-4 w-4" aria-hidden="true" />}
      tono="rose"
      titulo="Recomendaciones"
      subtitulo={`Consejos anónimos para ${nombre}`}
      extra={
        lista && lista.length > 0 ? (
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-200">
            {lista.length}
          </span>
        ) : undefined
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <label htmlFor={campoId} className="text-[12px] text-muted-foreground">
          Dejale una recomendación. Es anónima: nadie ve quién la escribió.
        </label>
        <textarea
          id={campoId}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setOk(false)
          }}
          maxLength={MAX}
          rows={3}
          placeholder={`Ej.: ${nombre}, comprá más granadas y dejá de pushear solo.`}
          className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:border-rose-400/60 focus:outline-none"
          disabled={enviando}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('font-mono text-[11px]', largo > 0 && !valido ? 'text-rose-300' : 'text-muted-foreground')}>
            {texto.length}/{MAX}
          </span>
          {error && (
            <span role="alert" className="text-[12px] text-rose-300">
              {error}
            </span>
          )}
          {ok && (
            <span role="status" className="text-[12px] text-emerald-300">
              ¡Listo! Ya está en el muro.
            </span>
          )}
          <button
            type="submit"
            disabled={!valido || enviando}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-full bg-rose-500/90 px-4 text-[12px] font-bold uppercase tracking-wider text-black transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Enviar
          </button>
        </div>
      </form>

      {lista === null ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          {cargaFallo ? 'No se pudieron cargar las recomendaciones.' : 'Cargando…'}
        </p>
      ) : lista.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Nadie le dejó una recomendación todavía. ¡Sé el primero!</p>
      ) : (
        <ul aria-label={`Recomendaciones para ${nombre}`}>
          {lista.map((r) => {
            const yaReportada = reportadas.has(r.id)
            return (
              <li key={r.id} className="flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-b-0">
                <span className="mt-0.5 text-base leading-none" aria-hidden="true">
                  🕵️
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-foreground">{r.texto}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Anónimo · {hace(r.creadaAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => reportar(r.id)}
                  disabled={yaReportada}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-white/5 hover:text-rose-300 disabled:cursor-default disabled:text-rose-300/60"
                  aria-label={yaReportada ? 'Ya la reportaste' : 'Reportar recomendación'}
                  title={yaReportada ? 'Ya la reportaste' : 'Reportar'}
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Tarjeta>
  )
}
