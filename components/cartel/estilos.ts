import type { EstiloCartel } from '@/lib/cartel/tipos'

/** Cómo se ve cada estilo de cartel (lo elige el que paga). */
export const ESTILOS: Record<
  EstiloCartel,
  {
    nombre: string
    emoji: string
    /** Borde del cartel. */
    marco: string
    /** Brillos de fondo. */
    fondo: string
    /** Texto destacado y lamparitas. */
    acento: string
    glow: string
    boton: string
    /** Muestra en el selector. */
    muestra: string
  }
> = {
  fuego: {
    nombre: 'Fuego',
    emoji: '🔥',
    marco: 'border-orange-400/60',
    fondo:
      'bg-[radial-gradient(120%_140%_at_0%_0%,rgba(234,88,12,0.42),transparent_55%),radial-gradient(100%_130%_at_100%_100%,rgba(220,38,38,0.32),transparent_60%)]',
    acento: 'text-orange-300',
    glow: 'shadow-[0_0_50px_-14px_rgba(249,115,22,0.75)]',
    boton: 'bg-orange-500 text-black shadow-orange-500/40 hover:bg-orange-400',
    muestra: 'from-orange-400 to-red-600',
  },
  neon: {
    nombre: 'Neón',
    emoji: '⚡',
    marco: 'border-fuchsia-400/60',
    fondo:
      'bg-[radial-gradient(120%_140%_at_0%_0%,rgba(217,70,239,0.38),transparent_55%),radial-gradient(100%_130%_at_100%_100%,rgba(34,211,238,0.3),transparent_60%)]',
    acento: 'text-fuchsia-300',
    glow: 'shadow-[0_0_50px_-14px_rgba(217,70,239,0.75)]',
    boton: 'bg-fuchsia-500 text-white shadow-fuchsia-500/40 hover:bg-fuchsia-400',
    muestra: 'from-fuchsia-500 to-cyan-400',
  },
  oro: {
    nombre: 'Oro',
    emoji: '👑',
    marco: 'border-amber-300/70',
    fondo:
      'bg-[radial-gradient(120%_140%_at_0%_0%,rgba(251,191,36,0.36),transparent_55%),radial-gradient(100%_130%_at_100%_100%,rgba(202,138,4,0.3),transparent_60%)]',
    acento: 'text-amber-200',
    glow: 'shadow-[0_0_50px_-14px_rgba(251,191,36,0.75)]',
    boton: 'bg-amber-400 text-black shadow-amber-400/40 hover:bg-amber-300',
    muestra: 'from-amber-200 to-yellow-600',
  },
  toxico: {
    nombre: 'Tóxico',
    emoji: '☢️',
    marco: 'border-lime-400/60',
    fondo:
      'bg-[radial-gradient(120%_140%_at_0%_0%,rgba(163,230,53,0.32),transparent_55%),radial-gradient(100%_130%_at_100%_100%,rgba(16,185,129,0.3),transparent_60%)]',
    acento: 'text-lime-300',
    glow: 'shadow-[0_0_50px_-14px_rgba(163,230,53,0.7)]',
    boton: 'bg-lime-400 text-black shadow-lime-400/40 hover:bg-lime-300',
    muestra: 'from-lime-300 to-emerald-600',
  },
}
