import { ListOrdered } from 'lucide-react'
import type { Estilo, PosicionLiga } from '@/lib/perfil/datos'
import { cn } from '@/lib/utils'
import { Tarjeta } from './tarjeta'

/** Estilo de juego y en qué puesto queda en cada rubro respecto del resto de la liga. */
export function Posiciones({ posiciones, estilo }: { posiciones: PosicionLiga[]; estilo: Estilo | null }) {
  if (posiciones.length === 0 && !estilo) return null

  return (
    <Tarjeta icono={<ListOrdered className="h-4 w-4" aria-hidden="true" />} tono="sky" titulo="En la liga" subtitulo="Su puesto en cada rubro">
      {estilo && (
        <div className="flex items-start gap-3 border-b border-border/60 bg-sky-500/[0.06] px-4 py-3">
          <span className="text-2xl leading-none" aria-hidden="true">
            {estilo.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Estilo de juego</p>
            <p className="font-heading text-lg font-bold uppercase leading-tight tracking-wide text-foreground">{estilo.label}</p>
            <p className="text-[12px] leading-snug text-muted-foreground">{estilo.detalle}</p>
          </div>
        </div>
      )}
      <ul className="text-[12px]">
        {posiciones.map((p) => {
          const podio = p.rank <= 3
          return (
            <li key={p.key} className="flex items-center gap-3 border-b border-border/60 px-4 py-2 last:border-b-0">
              <span
                className={cn(
                  'flex h-6 w-9 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold',
                  p.rank === 1 ? 'bg-amber-300/20 text-amber-200' : podio ? 'bg-white/10 text-foreground' : 'bg-muted/40 text-muted-foreground',
                )}
                title={`Puesto ${p.rank} de ${p.of}`}
              >
                #{p.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">{p.label}</span>
              <span className="font-mono font-semibold text-foreground">{p.value}</span>
              <span className="w-10 text-right font-mono text-[10px] text-muted-foreground">de {p.of}</span>
            </li>
          )
        })}
      </ul>
    </Tarjeta>
  )
}
