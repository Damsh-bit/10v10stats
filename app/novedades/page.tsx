import type { Metadata } from 'next'
import { Megaphone } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import { NovedadesTimeline } from '@/components/novedades/novedades-timeline'
import { WhatsNewModal } from '@/components/novedades/whats-new-modal'

export const metadata: Metadata = {
  title: 'Novedades — 10v10 Stats',
  description: 'Todo lo nuevo del 10v10 Stats, explicado fácil y con lo más nuevo arriba.',
}

export default function NovedadesPage() {
  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <WhatsNewModal autoOpen={false} />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <Reveal immediate className="mb-4">
          <span className="flex items-center gap-1.5 font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            10v10 Stats
          </span>
          <h1 className="font-heading text-4xl font-bold uppercase tracking-wide text-foreground sm:text-5xl">Novedades</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Todo lo nuevo del sitio, contado fácil. Lo más nuevo está arriba: andá bajando y leyendo de a una.
          </p>
        </Reveal>

        <NovedadesTimeline />
      </div>
    </main>
  )
}
