import Image from 'next/image'
import Link from 'next/link'
import type { Player } from '@/types'

const CHICANAS = ['Cero rage quit', 'Equipos parejos', 'Nadie llora en el chat', '100% libre de bajón']

/** Lo que dice la foto de cada uno; el que no esté acá se lleva la genérica. */
const EPITAFIOS: Record<string, string> = {
  tiky: 'Rage quit definitivo',
  foco: 'Se quemó el Foco 💡',
}

/**
 * Banner promocional de arriba de todo en la home: arranca la temporada sin los
 * del homenaje QEPD, en chiste. Usa la foto de perfil de cada uno.
 */
export function BannerTemporadaNueva({ seasonName, depresivos }: { seasonName: string; depresivos: Player[] }) {
  if (depresivos.length === 0) return null
  const nombres = depresivos.map((player) => player.name).join(' y ')

  return (
    <section
      aria-labelledby="banner-temporada-nueva"
      className="relative overflow-hidden rounded-2xl border border-primary/40 bg-neutral-950 shadow-xl shadow-primary/20"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,color-mix(in_oklab,var(--primary)_45%,transparent),transparent_60%),radial-gradient(ellipse_at_100%_120%,rgba(245,158,11,0.25),transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgba(255,255,255,0.025)_22px_44px)]"
        aria-hidden="true"
      />

      <div className="relative grid grid-cols-2 items-center gap-x-4 gap-y-6 px-4 py-7 sm:px-8 lg:grid-cols-[auto_1fr_auto] lg:gap-x-10 lg:py-9">
        {depresivos.slice(0, 2).map((player, i) => (
          <FotoBaja
            key={player.id}
            player={player}
            inclinada={i === 0 ? '-rotate-3' : 'rotate-3'}
            className={i === 0 ? 'justify-self-end lg:order-1' : 'justify-self-start lg:order-3'}
          />
        ))}

        <div className="col-span-2 flex flex-col items-center gap-3 text-center lg:order-2 lg:col-span-1">
          <span className="rounded-full border border-primary/60 bg-primary/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-pink-200">
            {seasonName} · Arrancó
          </span>
          <h2 id="banner-temporada-nueva" className="font-heading font-black uppercase leading-[0.95] tracking-wide">
            <span className="block text-lg text-neutral-200 sm:text-2xl">Comienza una nueva temporada</span>
            <span className="block bg-gradient-to-r from-primary via-fuchsia-400 to-amber-300 bg-clip-text text-5xl text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-6xl">
              sin depresivos
            </span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-neutral-300">
            {nombres} colgaron los guantes y el servidor volvió a sonreír. Se terminó el “para qué juego si siempre pierdo”.
          </p>
          <ul className="flex flex-wrap justify-center gap-1.5">
            {CHICANAS.map((chicana) => (
              <li
                key={chicana}
                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
              >
                ✓ {chicana}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function FotoBaja({ player, inclinada, className }: { player: Player; inclinada: string; className: string }) {
  const epitafio = EPITAFIOS[player.name.trim().toLowerCase()] ?? 'Baja confirmada'

  return (
    <Link
      href={`/players/${player.id}`}
      className={`group flex w-32 flex-col rounded-lg bg-neutral-100 p-2 pb-2.5 shadow-2xl shadow-black/60 transition-transform hover:rotate-0 hover:scale-105 sm:w-40 ${inclinada} ${className}`}
    >
      <span
        className="relative block aspect-square w-full overflow-hidden rounded-sm"
        style={{ backgroundColor: player.avatarColor || '#64748b' }}
      >
        {player.photoUrl ? (
          <Image src={player.photoUrl} alt={player.name} fill sizes="160px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center font-mono text-4xl font-bold text-background">
            {player.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span
          className="absolute right-1 top-2 rotate-12 rounded-sm border-2 border-red-500 bg-black/55 px-1.5 py-0.5 font-heading text-sm font-black uppercase tracking-widest text-red-500 sm:text-base"
          aria-hidden="true"
        >
          Baja
        </span>
      </span>
      <span className="mt-2 text-center font-heading text-lg font-bold uppercase leading-none tracking-widest text-neutral-900">
        {player.name}
      </span>
      <span className="mt-1 text-center text-[11px] font-medium leading-tight text-neutral-600">{epitafio}</span>
    </Link>
  )
}
