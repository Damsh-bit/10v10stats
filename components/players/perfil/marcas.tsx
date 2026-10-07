import Link from 'next/link'
import { Medal } from 'lucide-react'
import type { MejorMarca } from '@/lib/perfil/datos'
import type { RecordType } from '@/lib/records'
import { RecordBadge } from '@/components/players/record-badges'
import { Tarjeta } from './tarjeta'

/** Mejores (y peores) marcas propias en una partida, y los récords de la liga que tiene. */
export function Marcas({ marcas, records }: { marcas: MejorMarca[]; records: RecordType[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta icono={<Medal className="h-4 w-4" aria-hidden="true" />} tono="amber" titulo="Mejores marcas" subtitulo="Lo máximo en una sola partida. Tocá para verla.">
        {marcas.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Sin partidas en este período.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-4">
            {marcas.map((m) => (
              <li key={m.key} className="bg-card">
                <Link href={`/matches/${m.matchId}`} className="flex h-full flex-col gap-0.5 px-3 py-3 transition-colors hover:bg-accent/40 sm:px-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{m.label}</span>
                  <span className="font-mono text-2xl font-black text-foreground">{m.value}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{m.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {records.length > 0 && (
        <section className="rounded-xl border border-border bg-card px-4 py-3">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Récords de la liga que tiene</h2>
          <div className="flex flex-wrap gap-1.5">
            {records.map((record) => (
              <RecordBadge key={record} type={record} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
