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

function Lamparitas({ className }: { className: string }) {
  return (
    <div className={cn('cartel-bulbs pointer-events-none flex justify-between px-3', className)} aria-hidden="true">
      {Array.from({ length: BULBS }, (_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-current" />
      ))}
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

/** Recuadro de la izquierda: la foto que subió, o la cara del apuntado, o el emoji del estilo. */
function Recuadro({ cartel, variante }: { cartel: CartelVista; variante: Variante }) {
  const [abierta, setAbierta] = useState(false)
  const estilo = ESTILOS[cartel.estilo]
  const tamaño = variante === 'home' ? 'h-[84px] w-[84px] sm:h-[132px] sm:w-[132px]' : 'h-[72px] w-[72px]'
  const sizes = variante === 'home' ? '(min-width: 640px) 132px, 84px' : '72px'
  const marco = cn('relative shrink-0 overflow-hidden rounded-xl border-2 bg-black/40', estilo.marco, tamaño)

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

  if (cartel.objetivo?.photoUrl) {
    return (
      <div className={marco}>
        <FotoCartel src={cartel.objetivo.photoUrl} alt={cartel.objetivo.name} sizes={sizes} />
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

function Persona({ jugador, nombre }: { jugador: JugadorMini | null; nombre: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {jugador && <JugadorAvatar jugador={jugador} size={20} />}
      <span className="truncate font-semibold text-foreground">{nombre}</span>
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
            {cartel.objetivo && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span aria-hidden="true">🎯</span>
                <span className="text-white/50">para</span>
                <Persona jugador={cartel.objetivo} nombre={cartel.objetivo.name} />
              </span>
            )}
          </div>
        </div>

        {acciones && <div className={cn(home ? 'col-span-2 lg:col-span-1' : 'col-span-2')}>{acciones}</div>}
      </div>

      {pie}
      <Lamparitas className={cn(estilo.acento, home ? 'pb-2' : 'pb-1.5')} />
    </div>
  )
}
