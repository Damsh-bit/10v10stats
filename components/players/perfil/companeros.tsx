'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import type { FilaCompanero } from '@/lib/perfil/datos'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { cn } from '@/lib/utils'
import { Tarjeta } from './tarjeta'

type Vista = 'juntos' | 'contra'

const VISTAS: { key: Vista; label: string }[] = [
  { key: 'juntos', label: 'Juntos' },
  { key: 'contra', label: 'En contra' },
]

/** Con quién gana más jugando en el mismo equipo y cómo le va contra cada uno. */
export function Companeros({ companeros, nombre }: { companeros: FilaCompanero[]; nombre: string }) {
  const [vista, setVista] = useState<Vista>('juntos')
  const juntos = vista === 'juntos'

  const filas = companeros
    .filter((c) => (juntos ? c.juntos > 0 : c.contra > 0))
    .sort((a, b) =>
      juntos
        ? b.juntosWinrate - a.juntosWinrate || b.juntos - a.juntos
        : b.contraWins / b.contra - a.contraWins / a.contra || b.contra - a.contra,
    )

  return (
    <Tarjeta
      icono={<Users className="h-4 w-4" aria-hidden="true" />}
      tono="violet"
      titulo={juntos ? 'Compañeros' : 'Rivales'}
      subtitulo={juntos ? `Cómo le va a ${nombre} con cada uno en el equipo` : `Cómo le va a ${nombre} jugando en contra`}
      extra={
        <div className="flex items-center rounded-full bg-muted/40 p-0.5" role="group" aria-label="Ver compañeros o rivales">
          {VISTAS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={vista === key}
              onClick={() => setVista(key)}
              className={cn(
                'h-7 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                vista === key ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {filas.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Sin partidas con otros jugadores en este período.</p>
      ) : (
        <ul>
          {filas.map((c) => {
            const ganadas = juntos ? c.juntosWins : c.contraWins
            const total = juntos ? c.juntos : c.contra
            const winrate = total > 0 ? Math.round((ganadas / total) * 100) : 0
            return (
              <li key={c.player.id} className="border-b border-border/60 last:border-b-0">
                <Link href={`/players/${c.player.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40">
                  <PlayerAvatar player={c.player} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">{c.player.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Ganó {ganadas} de {total}
                      {c.coincidieron >= 3 && (
                        <span className="hidden sm:inline">
                          {' '}
                          · rindió más en el{' '}
                          <span className={c.mejorQue >= 50 ? 'text-emerald-300' : 'text-rose-300'}>{c.mejorQue}%</span> de las que
                          compartieron
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted/60 sm:block" aria-hidden="true">
                    <span
                      className={cn('block h-full rounded-full', winrate >= 50 ? 'bg-emerald-400/80' : 'bg-rose-400/70')}
                      style={{ width: `${Math.max(3, winrate)}%` }}
                    />
                  </span>
                  <span className={cn('w-11 text-right font-mono text-[14px] font-bold', winrate >= 50 ? 'text-emerald-300' : 'text-rose-300')}>
                    {winrate}%
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Tarjeta>
  )
}
