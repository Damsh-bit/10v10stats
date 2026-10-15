import Link from 'next/link'
import type { Player } from '@/types'
import type { DetalleXplay } from '@/lib/xplay/leer'
import type { EquipoXplay } from '@/lib/xplay/tipos'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { cn } from '@/lib/utils'

/** Un jugador de la partida, con su nombre del sitio si lo tiene. */
export type Participante = {
  accountId: number
  equipo: EquipoXplay
  /** Nombre del sitio (o el nick de Xplay si no está en el sitio). */
  nombre: string
  nick: string
  player: Player | null
  avatar: string | null
}

export function armarParticipantes(detalle: DetalleXplay, players: Player[]) {
  const porId = new Map(players.map((p) => [p.id, p]))
  const mapa = new Map<number, Participante>()
  for (const j of detalle.jugadores) {
    const player = j.playerId ? porId.get(j.playerId) ?? null : null
    mapa.set(j.accountId, {
      accountId: j.accountId,
      equipo: j.equipo,
      nombre: player?.name ?? j.nombre,
      nick: j.nombre,
      player,
      avatar: j.avatar,
    })
  }
  return mapa
}

/** Colores de cada equipo: los de siempre para Equipo Papi y Equipo Viejo. */
export function tonoEquipo(nombre: string) {
  const n = nombre.toLowerCase()
  if (n.includes('viejo')) return { texto: 'text-purple-400', fondo: 'bg-purple-500/20', borde: 'border-purple-400/40', solido: 'bg-purple-400' }
  if (n.includes('papi')) return { texto: 'text-blue-400', fondo: 'bg-blue-500/20', borde: 'border-blue-400/40', solido: 'bg-blue-400' }
  return { texto: 'text-brand', fondo: 'bg-primary/20', borde: 'border-primary/40', solido: 'bg-primary' }
}

export function Avatar({ p, size = 24 }: { p: Participante; size?: number }) {
  if (p.player) return <PlayerAvatar player={p.player} size={size} />
  return p.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.avatar} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="shrink-0 rounded-full bg-muted" style={{ width: size, height: size }} aria-hidden="true" />
  )
}

/** Avatar + nombre; si es del sitio, linkea a su perfil. */
export function NombreJugador({
  p,
  size = 24,
  className,
  conNick = false,
}: {
  p: Participante
  size?: number
  className?: string
  conNick?: boolean
}) {
  const contenido = (
    <>
      <Avatar p={p} size={size} />
      <span className="min-w-0">
        <span className="block truncate">{p.nombre}</span>
        {conNick && p.player && p.nick !== p.nombre ? (
          <span className="block truncate text-[10px] font-normal text-muted-foreground">{p.nick}</span>
        ) : null}
      </span>
    </>
  )
  const clases = cn('flex min-w-0 items-center gap-2', className)
  return p.player ? (
    <Link href={`/players/${p.player.id}`} className={cn(clases, 'transition-colors hover:text-brand')}>
      {contenido}
    </Link>
  ) : (
    <span className={clases}>{contenido}</span>
  )
}

export function segundosATexto(segundos: number | null) {
  if (segundos === null || segundos < 0) return '—'
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
