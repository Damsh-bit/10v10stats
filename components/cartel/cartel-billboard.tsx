'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { formatPesos } from '@/lib/apuestas/cuotas'
import { formatDuracion, type Cartel, type JugadorMini } from '@/lib/cartel/tipos'
import { JugadorAvatar } from '@/components/apuestas/ui'
import { Portal, useBodyScrollLock } from '@/components/ui/portal'
import { cn } from '@/lib/utils'
import { ESTILOS } from './estilos'

/** Lo que hace falta para dibujar un cartel (también el borrador del que está por pagar). */
export type CartelVista = Omit<Cartel, 'id' | 'pagadoAt'> & { id?: string; pagadoAt?: string }

type Variante = 'home' | 'preview'

const BULBS = 22

/** Minutos desde que se puso, sólo en el navegador (así no salta al hidratar). */
export function useAhora(intervaloMs = 30_000) {
  const [ahora, setAhora] = useState<number | null>(null)
  useEffect(() => {
    setAhora(Date.now())
    const timer = window.setInterval(() => setAhora(Date.now()), intervaloMs)
    return () => window.clearInterval(timer)
  }, [intervaloMs])
  return ahora
}

function tamañoMensaje(largo: number, variante: Variante) {
  if (variante === 'preview') return largo <= 40 ? 'text-[22px]' : largo <= 90 ? 'text-[18px]' : 'text-[15px]'
  return largo <= 40 ? 'text-[26px] sm:text-[40px]' : largo <= 90 ? 'text-[20px] sm:text-[30px]' : 'text-[17px] sm:text-[23px]'
}

/** Foto del cartel o de los que firman: sirve también para las vistas previas (blob:). */
export function FotoCartel({ src, alt, sizes, className }: { src: string; alt: string; sizes: string; className?: string }) {
  if (src.startsWith('blob:')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cn('h-full w-full object-cover', className)} />
  }
  return <Image src={src} alt={alt} fill sizes={sizes} className={cn('object-cover', className)} />
}

/**
 * Dos filas superpuestas (pares e impares) que titilan alternadas: así se animan
 * dos capas en vez de una por lamparita, que en una PC floja se notaba.
 */
function Lamparitas({ className }: { className: string }) {
  return (
    <div className={cn('pointer-events-none', className)} aria-hidden="true">
      <div className="relative h-1.5">
        {[0, 1].map((fila) => (
          <div
            key={fila}
            className={cn('cartel-bulbs-fila absolute inset-x-3 inset-y-0 flex justify-between', fila === 1 && 'cartel-bulbs-fila-b')}
          >
            {Array.from({ length: BULBS }, (_, i) => (
              <span key={i} className={cn('h-1.5 w-1.5 rounded-full bg-current', i % 2 !== fila && 'invisible')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useBodyScrollLock(true)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <Portal>
      <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={alt}>
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-[85vh] max-w-[92vw] rounded-xl border border-white/10 object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
      </div>
    </Portal>
  )
}

/** Lo que entra en el recuadro cuando va para varios: hasta 4 caras (la última, "+N" si son más). */
const CARAS_MAX = 4

/** Una cara del collage: la foto del jugador o sus iniciales en su color. */
function Cara({ jugador, sizes, className }: { jugador: JugadorMini; sizes: string; className?: string }) {
  if (jugador.photoUrl) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <FotoCartel src={jugador.photoUrl} alt={jugador.name} sizes={sizes} />
      </div>
    )
  }
  const hue = jugador.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={cn('flex items-center justify-center font-mono text-[13px] font-bold text-background sm:text-[18px]', className)}
      style={{ backgroundColor: `hsl(${hue} 65% 45%)` }}
      aria-label={jugador.name}
    >
      {jugador.name.slice(0, 2).toUpperCase()}
    </div>
  )
}

/** Dos caras: mitad y mitad. Tres: la primera alta y dos a la derecha. Cuatro o más: 2×2. */
function Collage({ jugadores, sizes }: { jugadores: JugadorMini[]; sizes: string }) {
  const sobran = jugadores.length > CARAS_MAX ? jugadores.length - (CARAS_MAX - 1) : 0
  const caras = jugadores.slice(0, sobran ? CARAS_MAX - 1 : CARAS_MAX)
  return (
    <div className={cn('grid h-full w-full gap-px bg-black/60', jugadores.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2')}>
      {caras.map((jugador, i) => (
        <Cara key={jugador.id} jugador={jugador} sizes={sizes} className={cn(jugadores.length === 3 && i === 0 && 'row-span-2')} />
      ))}
      {sobran > 0 && (
        <div className="flex items-center justify-center bg-black/70 font-mono text-[13px] font-black text-white sm:text-[18px]" aria-label={`y ${sobran} más`}>
          +{sobran}
        </div>
      )}
    </div>
  )
}

/** Recuadro de la izquierda: la foto que subió, la cara del apuntado (o las caras, si son varios) o el emoji del estilo. */
function Recuadro({ cartel, variante }: { cartel: CartelVista; variante: Variante }) {
  const [abierta, setAbierta] = useState(false)
  const estilo = ESTILOS[cartel.estilo]
  const tamaño = variante === 'home' ? 'h-[84px] w-[84px] sm:h-[132px] sm:w-[132px]' : 'h-[72px] w-[72px]'
  const sizes = variante === 'home' ? '(min-width: 640px) 132px, 84px' : '72px'
  const marco = cn('relative shrink-0 overflow-hidden rounded-xl border-2 bg-black/40', estilo.marco, tamaño)
  const unico = cartel.objetivos.length === 1 ? cartel.objetivos[0] : null

  if (cartel.imagenUrl) {
    return (
      <>
        <button type="button" onClick={() => setAbierta(true)} className={cn(marco, 'group cursor-zoom-in')} aria-label="Ver la imagen del cartel en grande">
          <FotoCartel src={cartel.imagenUrl} alt="Imagen del cartel" sizes={sizes} className="transition-transform duration-300 group-hover:scale-105" />
        </button>
        {abierta && <Lightbox src={cartel.imagenUrl} alt="Imagen del cartel" onClose={() => setAbierta(false)} />}
      </>
    )
  }

  if (cartel.objetivos.length > 1 || unico?.photoUrl) {
    return (
      <div className={marco}>
        {unico?.photoUrl ? (
          <FotoCartel src={unico.photoUrl} alt={unico.name} sizes={sizes} />
        ) : (
          <Collage jugadores={cartel.objetivos} sizes={variante === 'home' ? '(min-width: 640px) 66px, 42px' : '36px'} />
        )}
        <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[12px] leading-none" aria-hidden="true">
          🎯
        </span>
      </div>
    )
  }

  return (
    <div className={cn(marco, 'flex items-center justify-center')} aria-hidden="true">
      <span className={variante === 'home' ? 'text-[40px] sm:text-[64px]' : 'text-[34px]'}>{cartel.oculto ? '🚫' : estilo.emoji}</span>
    </div>
  )
}

function Persona({ jugador, nombre, size = 20 }: { jugador: JugadorMini | null; nombre: string; size?: number }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {jugador && <JugadorAvatar jugador={jugador} size={size} />}
      <span className="truncate font-semibold text-foreground">{nombre}</span>
    </span>
  )
}

/** Hasta acá se nombra a cada uno con su cara; con más, van las caras apiladas y "A, B y N más". */
const NOMBRES_MAX = 3

/** "🎯 para A, B y C" (también en el historial). */
export function Destinatarios({ jugadores, size = 20 }: { jugadores: JugadorMini[]; size?: number }) {
  if (jugadores.length === 0) return null
  const nombres = jugadores.map((jugador) => jugador.name)

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      <span aria-hidden="true">🎯</span>
      <span className="opacity-75">para</span>
      {jugadores.length <= NOMBRES_MAX ? (
        jugadores.map((jugador, i) => (
          <span key={jugador.id} className="inline-flex min-w-0 items-center gap-1.5">
            {i > 0 && i === jugadores.length - 1 && <span className="opacity-75">y</span>}
            <Persona jugador={jugador} nombre={jugador.name} size={size} />
            {i < jugadores.length - 2 && <span className="-ml-1.5 opacity-75">,</span>}
          </span>
        ))
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1.5" title={nombres.join(', ')}>
          <span className="flex shrink-0">
            {jugadores.slice(0, 5).map((jugador, i) => (
              <span key={jugador.id} className={cn('rounded-full ring-2 ring-black/70', i > 0 && '-ml-1.5')}>
                <JugadorAvatar jugador={jugador} size={size} />
              </span>
            ))}
          </span>
          <span className="truncate">
            <strong className="font-semibold text-foreground">{nombres.slice(0, 2).join(', ')}</strong> y{' '}
            <strong className="font-semibold text-foreground">{jugadores.length - 2} más</strong>
          </span>
        </span>
      )}
    </span>
  )
}

/**
 * El cartel tal cual se ve en la home: marco con lamparitas, foto, mensaje en
 * grande, quién lo firma y a quién va. `acciones` va a la derecha (o abajo en
 * el celu): ahí van el botón para sacarlo y los links.
 */
export function CartelBillboard({
  cartel,
  variante = 'home',
  acciones,
  pie,
  className,
}: {
  cartel: CartelVista
  variante?: Variante
  acciones?: React.ReactNode
  pie?: React.ReactNode
  className?: string
}) {
  const estilo = ESTILOS[cartel.estilo]
  const ahora = useAhora()
  const arriba = ahora !== null && cartel.pagadoAt ? formatDuracion(Math.max(0, ahora - Date.parse(cartel.pagadoAt))) : null
  const mensaje = cartel.oculto ? 'Este cartel lo bajó la moderación.' : cartel.mensaje || 'Tu mensaje acá…'
  const home = variante === 'home'

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border-2 bg-[#06121e]/95',
        estilo.marco,
        home && estilo.glow,
        className,
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 -z-10', estilo.fondo)} aria-hidden="true" />
      <div className="cs-grid pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
      <Lamparitas className={cn(estilo.acento, home ? 'pt-2' : 'pt-1.5')} />

      <div
        className={cn(
          'grid items-center',
          home
            ? 'grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 pb-2 pt-2 sm:gap-x-5 sm:px-5 sm:pb-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]'
            : 'grid-cols-[auto_minmax(0,1fr)] gap-3 px-3 pb-2 pt-1.5',
        )}
      >
        <Recuadro cartel={cartel} variante={variante} />

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-[0.22em] text-white ring-1 ring-white/15">
              <span aria-hidden="true">📢</span> El cartel
            </span>
            <span
              className={cn(
                '-rotate-2 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider ring-1',
                cartel.esCasa ? 'bg-white/10 text-white/80 ring-white/20' : cn('bg-black/60 ring-current', estilo.acento),
              )}
            >
              {cartel.esCasa ? 'De la casa' : `Puso ${formatPesos(cartel.monto)}`}
            </span>
            {arriba && <span className="text-[11px] text-white/60">· {arriba} arriba</span>}
          </div>

          <p
            className={cn(
              'font-heading font-bold leading-[1.08] tracking-wide text-white [overflow-wrap:anywhere] [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]',
              cartel.oculto && 'italic text-white/60',
              tamañoMensaje(Array.from(mensaje).length, variante),
            )}
          >
            {mensaje}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/70">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true">—</span>
              <Persona jugador={cartel.autorJugador} nombre={cartel.autor || 'Anónimo'} />
            </span>
            <Destinatarios jugadores={cartel.objetivos} />
          </div>
        </div>

        {acciones && <div className={cn(home ? 'col-span-2 lg:col-span-1' : 'col-span-2')}>{acciones}</div>}
      </div>

      {pie}
      <Lamparitas className={cn(estilo.acento, home ? 'pb-2' : 'pb-1.5')} />
    </div>
  )
}
