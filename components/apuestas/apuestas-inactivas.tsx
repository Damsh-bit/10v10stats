import Link from 'next/link'
import { HandCoins } from 'lucide-react'
import type { ApuestasPublicConfig } from '@/lib/apuestas/config'

/** Lo que se ve mientras las apuestas no están configuradas. */
export function ApuestasInactivas({ config }: { config: ApuestasPublicConfig }) {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
        <HandCoins className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-foreground">Apuestas</h1>
      <p className="text-[13px] text-muted-foreground">
        Todavía no están activas. Mientras tanto, en el generador de equipos ya podés ver cuánto pagaría cada equipo y cada duelo.
      </p>
      {config.faltantes.length > 0 && (
        <details className="w-full text-left text-[12px] text-muted-foreground">
          <summary className="cursor-pointer text-center hover:text-foreground">Qué falta configurar</summary>
          <ul className="mt-2 list-disc pl-5 font-mono">
            {config.faltantes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-2">Detalle en docs/apuestas.md.</p>
        </details>
      )}
      <Link href="/creacion-de-equipos" className="mt-2 rounded-full bg-primary px-5 py-2 text-[13px] font-bold uppercase tracking-wider text-white">
        Ir al generador
      </Link>
    </section>
  )
}
