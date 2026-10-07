import Link from 'next/link'
import { ArrowRight, Crown } from 'lucide-react'
import { formatPesos } from '@/lib/apuestas/cuotas'
import { formatDuracion, type RankingDonador } from '@/lib/cartel/tipos'
import { JugadorAvatar } from '@/components/apuestas/ui'
import { cn } from '@/lib/utils'

const PUESTOS = [
  { medalla: '🥇', chip: 'border-amber-300/60 bg-amber-300/10 shadow-[0_0_16px_-4px_rgba(251,191,36,0.6)]', monto: 'text-amber-200' },
  { medalla: '🥈', chip: 'border-slate-300/50 bg-slate-300/10', monto: 'text-slate-200' },
  { medalla: '🥉', chip: 'border-orange-400/50 bg-orange-400/10', monto: 'text-orange-200' },
]

/** Tira de los que más donaron, abajo del cartel de la home. */
export function TopDonadores({ donadores, max = 5 }: { donadores: RankingDonador[]; max?: number }) {
  const top = donadores.slice(0, max)

  return (
    <section
      aria-label="Top donadores"
      className="flex flex-col gap-2 rounded-xl border border-amber-300/20 bg-card/95 px-3 py-2 sm:flex-row sm:items-center sm:gap-x-3"
    >
      {/* En el celu título y link van arriba y la lista abajo; desde sm, todo en una fila. */}
      <div className="flex items-center justify-between gap-3 sm:contents">
        <h2 className="flex shrink-0 items-center gap-1.5 font-heading text-[12px] font-bold uppercase tracking-[0.2em] text-amber-200">
          <Crown className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
          Top donadores
        </h2>
        <Link
          href="/cartel"
          className="group flex shrink-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground sm:order-last sm:ml-auto"
        >
          Ver ranking
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="min-w-0 flex-1 text-[12px] text-muted-foreground">
          Todavía nadie donó. El primero queda acá, primero, hasta que alguien ponga más.
        </p>
      ) : (
        <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {top.map((donador, i) => {
            const puesto = PUESTOS[i]
            return (
              <li
                key={`${donador.autor}-${i}`}
                title={`${donador.carteles === 1 ? '1 cartel' : `${donador.carteles} carteles`} · ${formatDuracion(donador.tiempoMs)} arriba`}
                className={cn(
                  'flex min-w-0 items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2.5 text-[12px]',
                  puesto?.chip ?? 'border-border bg-background/40',
                )}
              >
                <span className="w-4 text-center text-[12px] leading-none" aria-label={`Puesto ${i + 1}`}>
                  {puesto?.medalla ?? <span className="font-mono text-[10px] font-bold text-muted-foreground">{i + 1}</span>}
                </span>
                {donador.jugador ? (
                  <JugadorAvatar jugador={donador.jugador} size={20} />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px]" aria-hidden="true">
                    {donador.autor === 'Anónimo' ? '🕵️' : '✍️'}
                  </span>
                )}
                <span className="max-w-[110px] truncate font-semibold text-foreground">{donador.autor}</span>
                <span className={cn('font-mono text-[11px] font-black', puesto?.monto ?? 'text-muted-foreground')}>{formatPesos(donador.total)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
