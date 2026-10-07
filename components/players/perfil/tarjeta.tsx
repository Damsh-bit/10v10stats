import { cn } from '@/lib/utils'

const TONOS = {
  brand: 'bg-primary/15 text-brand',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-400/15 text-amber-300',
  sky: 'bg-sky-500/15 text-sky-300',
  rose: 'bg-rose-500/15 text-rose-300',
  violet: 'bg-violet-500/15 text-violet-300',
} as const

/** Caja de un módulo del perfil: ícono, título, bajada y contenido. */
export function Tarjeta({
  icono,
  tono = 'brand',
  titulo,
  subtitulo,
  extra,
  children,
  className,
}: {
  icono: React.ReactNode
  tono?: keyof typeof TONOS
  titulo: string
  subtitulo?: string
  extra?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONOS[tono])}>{icono}</span>
          <div className="min-w-0">
            <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">{titulo}</h2>
            {subtitulo && <p className="truncate text-[11px] text-muted-foreground">{subtitulo}</p>}
          </div>
        </div>
        {extra}
      </header>
      {children}
    </section>
  )
}
