import Link from 'next/link'
import { Activity } from 'lucide-react'
import type { Forma, Resultado } from '@/lib/perfil/datos'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Tarjeta } from './tarjeta'

const RESULTADO: Record<Resultado, { letra: string; nombre: string; clase: string }> = {
  W: { letra: 'G', nombre: 'Victoria', clase: 'bg-emerald-500/80 text-black' },
  L: { letra: 'P', nombre: 'Derrota', clase: 'bg-rose-500/80 text-black' },
  D: { letra: 'E', nombre: 'Empate', clase: 'bg-muted text-muted-foreground' },
}

/** Últimas partidas: kills para arriba, muertes para abajo y el resultado. Cada columna lleva a la partida. */
export function FormaReciente({ forma }: { forma: Forma }) {
  if (forma.ultimas.length === 0) return null
  const columnas = [...forma.ultimas].reverse()
  const tope = Math.max(1, ...columnas.flatMap((p) => [p.kills, p.deaths]))
  const racha = forma.racha

  return (
    <Tarjeta
      icono={<Activity className="h-4 w-4" aria-hidden="true" />}
      tono="emerald"
      titulo="Forma reciente"
      subtitulo={`Últimas ${columnas.length} · kills arriba, muertes abajo`}
      extra={
        racha !== 0 && Math.abs(racha) >= 2 ? (
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', racha > 0 ? 'bg-orange-500/15 text-orange-300' : 'bg-cyan-500/15 text-cyan-300')}>
            {racha > 0 ? `🔥 ${racha} ganadas seguidas` : `🧊 ${-racha} perdidas seguidas`}
          </span>
        ) : null
      }
    >
      <ol className="flex items-stretch justify-center gap-1 px-3 pb-2 pt-3 sm:gap-1.5 sm:px-4">
        {columnas.map((p) => {
          const r = RESULTADO[p.result]
          return (
            <li key={p.matchId} className="min-w-0 max-w-12 flex-1">
              <Link
                href={`/matches/${p.matchId}`}
                aria-label={`${r.nombre} en ${p.map} el ${formatShortDate(p.date)}: ${p.kills} kills, ${p.deaths} muertes, ${p.assists} asistencias`}
                title={`${p.map} · ${formatShortDate(p.date)} · ${p.kills}/${p.deaths}/${p.assists}${p.mvp ? ' · MVP' : ''}`}
                className="group flex flex-col items-center gap-1 rounded-md py-1 transition-colors hover:bg-accent/40"
              >
                <span className="flex h-12 w-full items-end justify-center" aria-hidden="true">
                  <span className="w-full max-w-[14px] rounded-t-sm bg-emerald-400/80" style={{ height: `${Math.max(4, (p.kills / tope) * 100)}%` }} />
                </span>
                <span className="h-px w-full bg-border" aria-hidden="true" />
                <span className="flex h-9 w-full items-start justify-center" aria-hidden="true">
                  <span className="w-full max-w-[14px] rounded-b-sm bg-rose-400/70" style={{ height: `${Math.max(4, (p.deaths / tope) * 100)}%` }} />
                </span>
                <span className={cn('flex h-5 w-full max-w-[22px] items-center justify-center rounded text-[10px] font-black', r.clase)} aria-hidden="true">
                  {p.mvp ? '👑' : r.letra}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
        <span>
          Mejor racha: <span className="font-mono font-bold text-emerald-300">{forma.mejorRacha} ganadas</span>
        </span>
        <span>
          Peor racha: <span className="font-mono font-bold text-rose-300">{forma.peorRacha} perdidas</span>
        </span>
        <span className="ml-auto hidden sm:inline">G ganó · P perdió · E empate · 👑 MVP</span>
      </p>
    </Tarjeta>
  )
}
