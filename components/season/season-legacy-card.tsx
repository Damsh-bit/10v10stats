'use client'

import Link from 'next/link'
import { ArrowRight, Archive } from 'lucide-react'
import type { PlayerStats } from '@/types'
import { SeasonPodium } from '@/components/season/season-podium'

type Props = {
  seasonName: string
  seasonSlug: string
  podium: PlayerStats[]
  matches: number
  dateRange: string
}

/** Resumen de la temporada anterior en la home: podio final y acceso al archivo. */
export function SeasonLegacyCard({ seasonName, seasonSlug, podium, matches, dateRange }: Props) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-amber-300/20 bg-gradient-to-b from-amber-300/[0.07] via-card to-card">
      <header className="flex items-start justify-between gap-2 px-4 pt-4">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-300/90">
            <Archive className="h-3 w-3" aria-hidden="true" />
            Archivo
          </p>
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-foreground">
            Así terminó la {seasonName}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {matches} partidas · {dateRange}
          </p>
        </div>
      </header>

      <div className="px-4 pb-1 pt-8">
        <SeasonPodium top={podium} compact />
      </div>

      <Link
        href={`/temporadas/${seasonSlug}`}
        className="group flex items-center justify-between border-t border-amber-300/15 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-300/10"
      >
        Ver tabla final, récords y partidas
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </section>
  )
}
