import type { Player } from '@/types'
import { PlayerAvatar } from '@/components/shared/strike-ui'

const CHICANAS = [
  'Por fin se puede jugar sin que alguien diga "para qué juego si siempre pierdo".',
  'Bajó la tasa de rage quit del servidor un 100%.',
  'Los equipos ahora se arman parejos: ya no hay que repartir el lastre.',
]

/**
 * Banner promocional de arriba de todo en la home: arranca la temporada sin los
 * del homenaje QEPD, en chiste. Usa las mismas fotos de la base que el homenaje.
 */
export function BannerTemporadaNueva({ seasonName, depresivos }: { seasonName: string; depresivos: Player[] }) {
  if (depresivos.length === 0) return null
  const nombres = depresivos.map((player) => player.name).join(' y ')

  return (
    <section
      aria-labelledby="banner-temporada-nueva"
      className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/25 via-background to-amber-500/20 shadow-lg shadow-primary/20"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_18px,rgba(255,255,255,0.03)_18px_36px)]"
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center gap-5 px-4 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
        <ul className="flex shrink-0 -space-x-3" aria-label={`Los que se fueron: ${nombres}`}>
          {depresivos.map((player, i) => (
            <li
              key={player.id}
              className={`relative flex flex-col items-center ${i % 2 === 0 ? '-rotate-6' : 'rotate-6'}`}
            >
              <span className="relative flex rounded-full ring-4 ring-background">
                <span className="flex grayscale">
                  <PlayerAvatar player={player} size={84} />
                </span>
                <span
                  className="absolute inset-0 flex items-center justify-center text-6xl font-black leading-none text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  aria-hidden="true"
                >
                  ✕
                </span>
              </span>
              <span className="relative z-10 -mt-3 rounded bg-red-600 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white shadow">
                {player.name}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-primary">
            {seasonName} · Ahora 100% libre de bajón
          </p>
          <h2
            id="banner-temporada-nueva"
            className="font-heading text-2xl font-black uppercase leading-tight tracking-wide text-foreground sm:text-4xl"
          >
            Comienza una nueva temporada <span className="text-primary">sin depresivos</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {nombres} colgaron los guantes y el servidor volvió a sonreír. Ya no hay que bancarse el “tiro y me muero”
            ni el “cerrá el juego que no da más”.
          </p>
          <ul className="mt-1 flex flex-col gap-1 self-center text-left text-[12px] text-foreground/80 sm:self-start">
            {CHICANAS.map((chicana) => (
              <li key={chicana} className="flex gap-2">
                <span aria-hidden="true">✅</span>
                <span>{chicana}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
