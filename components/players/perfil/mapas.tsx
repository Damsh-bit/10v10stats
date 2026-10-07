import { Map as MapIcon } from 'lucide-react'
import type { FilaMapa } from '@/lib/perfil/datos'
import { mapImageUrl } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Tarjeta } from './tarjeta'

/** Cómo le va en cada mapa: partidas, resultado, winrate y rendimiento. */
export function Mapas({ mapas }: { mapas: FilaMapa[] }) {
  return (
    <Tarjeta icono={<MapIcon className="h-4 w-4" aria-hidden="true" />} tono="sky" titulo="Por mapa" subtitulo="Winrate y rendimiento en cada mapa">
      {mapas.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Sin partidas en este período.</p>
      ) : (
        <ul>
          {mapas.map((m) => (
            <li
              key={m.map}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-border/60 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-9 w-14 shrink-0 rounded-md border border-white/10 bg-cover bg-center"
                  style={{ backgroundImage: `url('${mapImageUrl(m.map)}')` }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-foreground">{m.map}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {m.partidas} PJ · {m.wins}G-{m.draws}E-{m.losses}P
                  </p>
                </div>
              </div>

              <dl className="flex gap-3 text-right font-mono text-[11px] sm:col-start-3 sm:row-start-1">
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-muted-foreground">KDA</dt>
                  <dd className="font-bold text-foreground">{m.kda.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-muted-foreground">ADM</dt>
                  <dd className="font-bold text-foreground">{m.adm}</dd>
                </div>
                <div className="hidden sm:block">
                  <dt className="text-[9px] uppercase tracking-wider text-muted-foreground">K/PJ</dt>
                  <dd className="font-bold text-foreground">{m.killsPorPartida.toFixed(1)}</dd>
                </div>
              </dl>

              <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60" aria-hidden="true">
                  <span
                    className={cn('block h-full rounded-full', m.winrate >= 50 ? 'bg-emerald-400/80' : 'bg-rose-400/70')}
                    style={{ width: `${Math.max(3, m.winrate)}%` }}
                  />
                </span>
                <span className={cn('w-11 text-right font-mono text-[13px] font-bold', m.winrate >= 50 ? 'text-emerald-300' : 'text-rose-300')}>
                  {m.winrate}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}
