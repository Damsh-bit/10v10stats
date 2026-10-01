'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { EstadoApuesta, EstadoEvento, EstadoPosicion, JugadorMini, Posicion, TipoApuesta } from '@/lib/apuestas/tipos'
import { formatPesos } from '@/lib/apuestas/cuotas'
import { cn } from '@/lib/utils'

/** Piezas chicas que comparten el generador, la página de cada partida y el panel de la banca. */

export function JugadorAvatar({ jugador, size = 24 }: { jugador?: JugadorMini | null; size?: number }) {
  const name = jugador?.name ?? '?'
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-mono font-bold text-background"
      style={{ width: size, height: size, backgroundColor: `hsl(${hue} 65% 45%)`, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {jugador?.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={jugador.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  )
}

export function JugadorChip({ jugador, className }: { jugador?: JugadorMini | null; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <JugadorAvatar jugador={jugador} size={20} />
      <span className="truncate font-semibold text-foreground">{jugador?.name ?? '?'}</span>
    </span>
  )
}

const TONOS = {
  verde: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  ambar: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  rojo: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
  azul: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  gris: 'border-border bg-muted/40 text-muted-foreground',
} as const

type Tono = keyof typeof TONOS

const ESTADOS_EVENTO: Record<EstadoEvento, [string, Tono]> = {
  abierto: ['Apuestas abiertas', 'verde'],
  en_juego: ['En juego', 'ambar'],
  resuelto: ['Resuelto', 'azul'],
  cancelado: ['Cancelado', 'gris'],
}

const ESTADOS_APUESTA: Record<EstadoApuesta, [string, Tono]> = {
  propuesta: ['Esperando respuesta', 'ambar'],
  abierta: ['Esperando pagos', 'ambar'],
  confirmada: ['Confirmada', 'verde'],
  liquidada: ['Liquidada', 'azul'],
  anulada: ['Anulada', 'gris'],
}

const ESTADOS_POSICION: Record<EstadoPosicion, [string, Tono]> = {
  pendiente: ['Sin pagar', 'ambar'],
  en_proceso: ['Transferencia avisada', 'ambar'],
  pagada: ['Pagado', 'verde'],
  anulada: ['Anulado', 'gris'],
  reembolsada: ['Devuelto', 'gris'],
}

export function Chip({ tono, children, className }: { tono: Tono; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', TONOS[tono], className)}>
      {children}
    </span>
  )
}

export function EstadoEventoChip({ estado }: { estado: EstadoEvento }) {
  const [label, tono] = ESTADOS_EVENTO[estado]
  return <Chip tono={tono}>{label}</Chip>
}

export function EstadoApuestaChip({ estado, tipo }: { estado: EstadoApuesta; tipo?: TipoApuesta }) {
  // El pozo "abierta" está recibiendo entradas, no esperando a nadie en particular.
  const [label, tono] = tipo === 'pozo' && estado === 'abierta' ? (['Abierto', 'verde'] as const) : ESTADOS_APUESTA[estado]
  return <Chip tono={tono}>{label}</Chip>
}

export function EstadoPosicionChip({ estado }: { estado: EstadoPosicion }) {
  const [label, tono] = ESTADOS_POSICION[estado]
  return <Chip tono={tono}>{label}</Chip>
}

/** Plata que vuelve a su dueño: ya devuelta (reembolso o transferencia) o todavía a devolver por la banca. */
export function Devolucion({ posicion }: { posicion: Pick<Posicion, 'estado' | 'premioEstado'> }) {
  const devuelta = posicion.estado === 'reembolsada' || posicion.premioEstado === 'pagado'
  return <Chip tono={devuelta ? 'gris' : 'ambar'}>{devuelta ? 'Devuelto' : 'A devolver'}</Chip>
}

/** Chips de montos rápidos + input libre (pesos enteros). */
export function MontoInput({
  value,
  onChange,
  min,
  max,
  sugeridos = [500, 1000, 2000, 5000],
  id,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  sugeridos?: number[]
  id?: string
}) {
  const opciones = sugeridos.filter((m) => m >= min && m <= max)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {opciones.map((monto) => (
        <button
          key={monto}
          type="button"
          onClick={() => onChange(monto)}
          className={cn(
            'rounded-full border px-2.5 py-1 font-mono text-[12px] font-semibold tabular-nums transition-colors',
            value === monto ? 'border-primary bg-primary/20 text-white' : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {formatPesos(monto)}
        </button>
      ))}
      <label className="flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-1 focus-within:border-primary">
        <span className="text-[12px] text-muted-foreground">$</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={100}
          value={Number.isFinite(value) && value > 0 ? value : ''}
          onChange={(e) => onChange(Math.round(Number(e.target.value)))}
          className="w-20 bg-transparent font-mono text-[13px] tabular-nums text-foreground outline-none"
          aria-label="Monto en pesos"
        />
      </label>
    </div>
  )
}

export function Aviso({ tipo, children }: { tipo: 'error' | 'ok'; children: React.ReactNode }) {
  const Icon = tipo === 'error' ? AlertTriangle : CheckCircle2
  return (
    <p
      role={tipo === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-[12px] leading-snug',
        tipo === 'error' ? 'border-rose-400/40 bg-rose-400/10 text-rose-200' : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
      )}
    >
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/** "cierra en 2h 13m" que se actualiza solo. */
export function useCuentaRegresiva(hasta: string) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const restante = Date.parse(hasta) - ahora
  if (restante <= 0) return null
  const minutos = Math.ceil(restante / 60_000)
  const horas = Math.floor(minutos / 60)
  return horas > 0 ? `${horas}h ${minutos % 60}m` : `${minutos}m`
}
