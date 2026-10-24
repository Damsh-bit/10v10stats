import Link from 'next/link'
import { Bird, Flame } from 'lucide-react'
import type { Match, Player, PlayerStats } from '@/types'
import { PlayerAvatar } from '@/components/shared/strike-ui'

/** El velorio: el día que salieron de la ladder con el homenaje QEPD. */
const DIA_DEL_VELORIO = '2026-10-17'
/** El banner sale en la home hasta este día inclusive. */
const FENIX_HASTA = '2026-11-14'

const RESUCITADOS = [
  '94b3489e-d678-4cf6-8539-3741bb2166ed', // Tiky
  '7d6ee18d-e1af-4d9e-a1e0-d27ee8f61c45', // Foco
]

/** Brasas que suben desde abajo: posición (%), tamaño (px), demora y duración (s). */
const BRASAS = [
  [4, 3, 0.2, 3.4],
  [11, 2, 1.6, 2.8],
  [19, 4, 0.9, 3.8],
  [27, 2, 2.4, 3.1],
  [34, 3, 0.4, 2.6],
  [42, 2, 1.9, 3.6],
  [50, 4, 1.1, 3.2],
  [57, 2, 2.8, 2.9],
  [64, 3, 0.7, 3.5],
  [71, 2, 2.1, 2.7],
  [78, 4, 1.4, 3.9],
  [85, 2, 0.1, 3],
  [92, 3, 2.6, 3.3],
  [97, 2, 1.2, 2.5],
] as const

export type Resucitado = {
  player: Player
  /** Puesto en la ladder de la temporada en curso. */
  puesto: number | null
  /** Primera partida que jugó después del velorio (YYYY-MM-DD). */
  vuelta: string | null
}

const dia = (date: string) => date.slice(0, 10)
const diasDesdeElVelorio = (date: string) => Math.round((Date.parse(date) - Date.parse(DIA_DEL_VELORIO)) / 86_400_000)
const diaMes = (date: string) => `${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`

/**
 * Los que volvieron del homenaje QEPD, con su puesto actual y el día que
 * volvieron a jugar. Vacío cuando el banner ya cumplió su tiempo.
 */
export function armarResurreccion(players: Player[], matches: Match[], ranked: PlayerStats[]): Resucitado[] {
  if (dia(new Date().toISOString()) > FENIX_HASTA) return []

  return RESUCITADOS.flatMap((id) => {
    const player = players.find((p) => p.id === id)
    if (!player) return []
    const puesto = ranked.findIndex((s) => s.player.id === id)
    const vueltas = matches
      .filter((m) => dia(m.date) > DIA_DEL_VELORIO && m.players.some((mp) => mp.playerId === id))
      .map((m) => dia(m.date))
      .sort()
    return [{ player, puesto: puesto >= 0 ? puesto + 1 : null, vuelta: vueltas[0] ?? null }]
  })
}

/**
 * Banner de la home: Tiky y Foco dijeron que no jugaban más, les hicimos el
 * velorio y a la semana estaban de vuelta. Vuelven a la ladder como todos.
 */
export function ResurreccionFenix({ resucitados }: { resucitados: Resucitado[] }) {
  if (resucitados.length === 0) return null

  const nombres = resucitados.map((r) => r.player.name).join(' y ')
  const primeraVuelta = resucitados
    .map((r) => r.vuelta)
    .filter((v): v is string => v !== null)
    .sort()[0]

  return (
    <section
      aria-labelledby="resurreccion-fenix"
      className="relative overflow-hidden rounded-xl border border-orange-400/30 bg-[#170805] shadow-lg shadow-orange-950/40"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_130%,rgba(249,115,22,0.5),rgba(220,38,38,0.18)_45%,transparent_75%)]"
        aria-hidden="true"
      />
      <div className="fenix-brasas pointer-events-none absolute inset-0" aria-hidden="true">
        {BRASAS.map(([x, size, delay, duration], i) => (
          <span
            key={i}
            className={`absolute bottom-0 rounded-full bg-current ${i % 3 === 0 ? 'text-yellow-300' : i % 3 === 1 ? 'text-orange-400' : 'text-red-500'}`}
            style={{ left: `${x}%`, width: size, height: size, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
          />
        ))}
      </div>

      <div className="relative flex flex-col gap-6 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-1.5 rounded-full bg-orange-500 px-2.5 py-0.5 font-heading text-[11px] font-bold uppercase tracking-[0.2em] text-black">
              <Flame className="h-3 w-3" aria-hidden="true" />
              Último momento
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-orange-200/70">
              <s className="decoration-red-500 decoration-2">Q.E.P.D.</s>
              <span aria-hidden="true"> → </span>
              <span className="text-amber-200">V.E.P.D.</span>{' '}
              <span className="normal-case tracking-normal text-orange-200/60">(volvieron en pocos días)</span>
            </span>
          </div>

          <h2
            id="resurreccion-fenix"
            className="mt-3 font-heading text-3xl font-black uppercase leading-none tracking-wide sm:text-4xl"
          >
            <span className="bg-gradient-to-r from-yellow-200 via-orange-400 to-red-500 bg-clip-text text-transparent">
              ¡Resucitaron como el ave fénix!
            </span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-orange-50/85">
            {nombres} dijeron que no jugaban más, les hicimos el velorio con velitas y todo, y renacieron de sus cenizas.
            El retiro les duró <strong className="text-amber-200">menos que un pedo en una canasta</strong>. Vuelven a la
            ladder como cualquier hijo de vecino: a sufrir como el resto.
          </p>

          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-orange-200/70">
            <div>
              <dt className="inline">Velorio: </dt>
              <dd className="inline text-orange-50">{diaMes(DIA_DEL_VELORIO)}</dd>
            </div>
            {primeraVuelta && (
              <>
                <div>
                  <dt className="inline">Resurrección: </dt>
                  <dd className="inline text-orange-50">{diaMes(primeraVuelta)}</dd>
                </div>
                <div>
                  <dt className="inline">Duración del luto: </dt>
                  <dd className="inline text-amber-200">{diasDesdeElVelorio(primeraVuelta)} días</dd>
                </div>
              </>
            )}
          </dl>

          <p className="mt-3 text-[11px] italic text-orange-200/50">
            La temporada sin depresivos queda suspendida. Las coronas de flores no tienen devolución.
          </p>
        </div>

        <ul className="flex shrink-0 justify-center gap-5 sm:gap-8">
          {resucitados.map(({ player, puesto, vuelta }) => (
            <li key={player.id}>
              <Link
                href={`/players/${player.id}`}
                className="group flex w-32 flex-col items-center gap-1.5 text-center"
              >
                <span className="relative flex">
                  <span
                    className="fenix-llama absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.75),rgba(239,68,68,0.3)_55%,transparent_72%)] blur-sm"
                    aria-hidden="true"
                  />
                  <span className="relative flex rounded-full ring-2 ring-orange-400/70 transition-transform group-hover:-translate-y-0.5">
                    <PlayerAvatar player={player} size={68} />
                  </span>
                  <span
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-black ring-2 ring-[#170805]"
                    aria-hidden="true"
                  >
                    <Bird className="h-3.5 w-3.5" />
                  </span>
                </span>
                <span className="mt-1 font-heading text-lg font-bold uppercase tracking-widest text-orange-50 group-hover:text-white">
                  {player.name}
                </span>
                <span className="font-mono text-[11px] text-amber-200">
                  {puesto ? `#${puesto} en la ladder` : 'De vuelta en la ladder'}
                </span>
                <span className="text-[11px] leading-snug text-orange-200/70">
                  {vuelta
                    ? `Volvió el ${diaMes(vuelta)}: aguantó ${diasDesdeElVelorio(vuelta)} días muerto`
                    : 'Resucitó de palabra: le falta jugar'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
