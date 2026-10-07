import { Lightbulb } from 'lucide-react'
import type { Curiosidad, Fragmento, Tono } from '@/lib/perfil/datos'
import { Tarjeta } from './tarjeta'

const TONOS: Record<Tono, string> = {
  brand: 'text-brand',
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
  rose: 'text-rose-300',
  sky: 'text-sky-300',
}

function Texto({ partes }: { partes: Fragmento[] }) {
  return (
    <>
      {partes.map((parte, i) =>
        typeof parte === 'string' ? (
          <span key={i}>{parte}</span>
        ) : (
          <strong key={i} className={`font-semibold ${TONOS[parte.tono]}`}>
            {parte.t}
          </strong>
        ),
      )}
    </>
  )
}

/** Datos curiosos del jugador, sacados de sus partidas. */
export function Curiosidades({ curiosidades, nombre }: { curiosidades: Curiosidad[]; nombre: string }) {
  return (
    <Tarjeta icono={<Lightbulb className="h-4 w-4" aria-hidden="true" />} tono="amber" titulo="Curiosidades" subtitulo={`Lo que dicen los números de ${nombre}`}>
      {curiosidades.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Todavía no hay partidas para sacar datos curiosos.</p>
      ) : (
        <ul className="grid gap-px bg-border/60 sm:grid-cols-2">
          {curiosidades.map((c) => (
            <li key={c.id} className="flex items-start gap-3 bg-card px-4 py-3 text-[13px] leading-snug text-foreground/90">
              <span className="mt-px text-lg leading-none" aria-hidden="true">
                {c.icono}
              </span>
              <p className="min-w-0">
                <Texto partes={c.partes} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}
