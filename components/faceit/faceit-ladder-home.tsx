'use client'

import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import type { FaceitLadderRow } from '@/lib/faceit'
import { FaceitLadder } from '@/components/faceit/faceit-ladder'

/**
 * La ladder de FACEIT de la home, pedida desde el navegador: el elo cambia cada
 * vez que alguien juega, y adentro de la home cacheada la hacía reescribir entera.
 */
export function FaceitLadderHome({ expected }: { expected: number }) {
  const [rows, setRows] = useState<FaceitLadderRow[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/faceit/ladder', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { rows: [] }))
      .then((data: { rows?: FaceitLadderRow[] }) => setRows(data.rows ?? []))
      .catch((error: unknown) => {
        if ((error as Error)?.name !== 'AbortError') setRows([])
      })
    return () => controller.abort()
  }, [])

  if (rows === null) return <FaceitLadderSkeleton count={expected} />
  if (rows.length === 0) return null
  return <FaceitLadder rows={rows} variant="compact" />
}

/** Mismo alto que la ladder cargada, para que la columna no salte cuando llega. */
function FaceitLadderSkeleton({ count }: { count: number }) {
  return (
    <section
      aria-busy="true"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
    >
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
          <Gauge className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">Ladder FACEIT</h2>
          <span className="text-[11px] text-muted-foreground" role="status">
            Cargando el elo de cada uno…
          </span>
        </div>
      </header>
      <ol className="flex flex-col" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="flex items-center gap-2.5 border-b border-border px-2.5 py-2.5 last:border-b-0 sm:gap-3 sm:px-4">
            <span className="h-5 w-5 shrink-0 animate-pulse rounded bg-muted/50 sm:w-7" />
            <span className="h-[34px] w-[34px] shrink-0 animate-pulse rounded-full bg-muted/50" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="h-3 w-24 animate-pulse rounded bg-muted/50" />
              <span className="h-3 w-32 animate-pulse rounded bg-muted/40" />
            </span>
            <span className="h-4 w-12 shrink-0 animate-pulse rounded bg-muted/50" />
          </li>
        ))}
      </ol>
      <div className="h-[41px] border-t border-border" />
    </section>
  )
}
