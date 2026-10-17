import Link from 'next/link'
import type { PlayerStats } from '@/types'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { formatSeasonDate } from '@/lib/seasons'

export type Difunto = {
  /** Cifras de toda su carrera. */
  stats: PlayerStats
  /** Primera y última partida que jugó. */
  desde: string | null
  hasta: string | null
}

const FRASE_VELORIO =
  'Sus compañeros de equipo participan con dolor su retiro del servidor. Se fueron como vivieron: muriendo primero. Que en paz descansen, y que allá arriba les toque el equipo bueno.'

/**
 * Homenaje en blanco y negro a los que ya no juegan más: salieron de la ladder,
 * pero acá quedan con las cifras de toda su carrera.
 */
export function HomenajeQepd({ difuntos }: { difuntos: Difunto[] }) {
  if (difuntos.length === 0) return null

  return (
    <section
      aria-labelledby="homenaje-qepd"
      className="relative overflow-hidden rounded-xl border border-white/15 bg-neutral-950 grayscale"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_65%)]"
        aria-hidden="true"
      />

      <header className="relative flex flex-col items-center gap-1 border-b border-white/10 px-4 pb-4 pt-5 text-center">
        <span className="text-2xl leading-none" aria-hidden="true">
          🕯️
        </span>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-neutral-400">Homenaje</p>
        <h2 id="homenaje-qepd" className="font-heading text-3xl font-black uppercase tracking-[0.3em] text-neutral-100">
          Q.E.P.D.
        </h2>
        <p className="mt-1 max-w-lg text-[13px] italic leading-relaxed text-neutral-300">“{FRASE_VELORIO}”</p>
      </header>

      <ul className="relative grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2">
        {difuntos.map(({ stats: s, desde, hasta }) => (
          <li key={s.player.id}>
            <Link
              href={`/players/${s.player.id}`}
              className="group flex h-full flex-col items-center gap-2 rounded-t-[5rem] rounded-b-lg border border-white/15 bg-gradient-to-b from-neutral-800 to-neutral-900 px-4 pb-4 pt-6 text-center transition-colors hover:border-white/30"
            >
              <span className="flex rounded-full opacity-90 ring-2 ring-white/20 transition-opacity group-hover:opacity-100">
                <PlayerAvatar player={s.player} size={72} />
              </span>
              <span className="text-[11px] leading-none text-neutral-500" aria-hidden="true">
                ✝
              </span>
              <span className="font-heading text-xl font-bold uppercase tracking-widest text-neutral-100">{s.player.name}</span>
              {s.player.badge && <span className="text-[12px] italic text-neutral-400">“{s.player.badge}”</span>}
              {desde && hasta && (
                <span className="font-mono text-[11px] text-neutral-400">
                  {formatSeasonDate(desde)} — {formatSeasonDate(hasta)}
                </span>
              )}
              <span className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-neutral-300">
                <span>{s.matches} partidas</span>
                <span className="opacity-40">·</span>
                <span title="Kills / Deaths / Assists">
                  {s.kills}/{s.deaths}/{s.assists}
                </span>
                <span className="opacity-40">·</span>
                <span>KDA {s.kda.toFixed(2)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="relative border-t border-white/10 px-4 py-2.5 text-center text-[11px] text-neutral-500">
        Ya no juegan más: salieron de la ladder. Sus partidas siguen contando en los récords y en sus perfiles.
      </p>
    </section>
  )
}
