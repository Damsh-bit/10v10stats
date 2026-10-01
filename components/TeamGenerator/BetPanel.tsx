'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HandCoins, Loader2, Lock, Swords } from 'lucide-react'
import { duelProbability, type BalanceOption } from '@/lib/teamBalancer'
import type { PairStatsMap } from '@/lib/team-history'
import type { ApuestasPublicConfig } from '@/lib/apuestas/config'
import { claveDuelo, cuotaJusta, entradaJustaPozo, formatCuota, formatPesos, formatProb, montoJustoRival } from '@/lib/apuestas/cuotas'
import { llamar, useSesionApuestas } from '@/components/apuestas/cliente'
import { SesionApuestas } from '@/components/apuestas/sesion-apuestas'
import { Aviso, MontoInput } from '@/components/apuestas/ui'
import { cn } from '@/lib/utils'
import { TEAM_TONES } from './team-ui'

const HORAS = [1, 2, 3, 6]

/**
 * Cuánto paga cada cosa con los equipos que salieron, y el botón para abrir
 * las apuestas: congela los equipos y lleva a la página de la partida, donde
 * se entra al pozo y se desafía a los rivales.
 */
export function BetPanel({
  option,
  pairs,
  map,
  sourceLabel,
  faceitWeight,
  config,
}: {
  option: BalanceOption
  pairs: PairStatsMap
  map: string | null
  sourceLabel: string
  faceitWeight: number
  config: ApuestasPublicConfig
}) {
  const router = useRouter()
  const [monto, setMonto] = useState(Math.max(1000, config.montoMin))
  const [horas, setHoras] = useState(3)
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { sesion, jugadores, cargando, setSesion } = useSesionApuestas(config.habilitadas)

  const [t1, t2] = option.teams
  const probA = t1.winProb
  const justa = entradaJustaPozo(monto, probA)

  // Chance de "mejor partida" para cualquier par de los 10: la usan los duelos de la partida.
  const duelos = useMemo(() => {
    const todos = [...t1.players, ...t2.players]
    const out: Record<string, number> = {}
    for (let i = 0; i < todos.length; i++) {
      for (let j = i + 1; j < todos.length; j++) {
        const [a, b] = todos[i].id < todos[j].id ? [todos[i], todos[j]] : [todos[j], todos[i]]
        out[claveDuelo(a.id, b.id)] = Math.round(duelProbability(a, b, pairs) * 10000) / 10000
      }
    }
    return out
  }, [t1, t2, pairs])

  const abrir = async () => {
    setAbriendo(true)
    setError(null)
    try {
      const { id } = await llamar<{ id: string }>('/api/apuestas/eventos', {
        equipoA: t1.players.map((p) => p.id),
        equipoB: t2.players.map((p) => p.id),
        equipoANombre: t1.name,
        equipoBNombre: t2.name,
        probA,
        mapa: map,
        horas,
        cuotas: { duelos, fuente: sourceLabel, pesoFaceit: faceitWeight },
      })
      router.push(`/apuestas/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron abrir las apuestas')
      setAbriendo(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-amber-400/25 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
            <HandCoins className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">Apuestas</h2>
            <span className="text-[11px] text-muted-foreground">Cuánto paga cada cosa según las chances del generador</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Si ponés</span>
          <MontoInput value={monto} onChange={setMonto} min={config.montoMin} max={config.montoMax} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {option.teams.map((team, i) => {
          const tone = TEAM_TONES[i as 0 | 1]
          const cuota = cuotaJusta(team.winProb)
          return (
            <div key={team.name} className={cn('flex flex-col gap-1 rounded-lg border px-3 py-2.5', tone.border, tone.soft)}>
              <span className={cn('font-heading text-[12px] font-bold uppercase tracking-[0.22em]', tone.text)}>Gana {team.name}</span>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-3xl font-black tabular-nums text-foreground" title="Cuota justa: 1 / chance">
                  {formatCuota(cuota)}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{formatProb(team.winProb)} de chance</span>
              </div>
              <span className="text-[12px] text-muted-foreground">
                Ponés {formatPesos(monto)} → cobrás <strong className="text-foreground">{formatPesos(Math.round(monto * cuota))}</strong>
              </span>
            </div>
          )
        })}
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
          <strong className="text-foreground">Pozo parejo:</strong> si cada uno del {t1.name} pone {formatPesos(justa.A)}, lo justo es que
          cada uno del {t2.name} ponga {formatPesos(justa.B)}. En el pozo real la cuota sale de cuánta plata hay de cada lado.
        </p>
      </div>

      <div className="border-t border-border/60">
        <div className="flex items-center gap-1.5 px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <Swords className="h-3 w-3" aria-hidden="true" />
          Duelos 1v1 · mejor partida
        </div>
        <ol className="flex flex-col px-2 pb-2 pt-1">
          {option.duels.map((duel) => {
            const prob = duel.probA
            const rival = montoJustoRival(monto, prob)
            return (
              <li key={`${duel.a.id}-${duel.b.id}`} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-muted/30">
                <span className="truncate font-semibold text-foreground">{duel.a.stats.player.name}</span>
                <span className="flex items-center gap-2 font-mono tabular-nums">
                  <span className={prob >= 0.5 ? TEAM_TONES[0].text : 'text-muted-foreground'}>{formatCuota(cuotaJusta(prob))}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className={prob < 0.5 ? TEAM_TONES[1].text : 'text-muted-foreground'}>{formatCuota(cuotaJusta(1 - prob))}</span>
                </span>
                <span className="truncate text-right font-semibold text-foreground">{duel.b.stats.player.name}</span>
                <span className="col-span-3 text-center text-[10px] text-muted-foreground">
                  Justo: {duel.a.stats.player.name} pone {formatPesos(monto)} y {duel.b.stats.player.name} {formatPesos(rival)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <footer className="flex flex-col gap-3 border-t border-border bg-black/10 px-4 py-3">
        {!config.habilitadas ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Las apuestas con plata todavía no están activas.
            </span>
            {config.faltantes.length > 0 && (
              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Qué falta configurar</summary>
                <ul className="mt-1 list-disc pl-4 font-mono">
                  {config.faltantes.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : cargando ? (
          <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" aria-label="Cargando" />
        ) : !sesion ? (
          <SesionApuestas sesion={null} jugadores={jugadores} onCambio={setSesion} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              Cierran en
              <select
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                className="rounded-md border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
              >
                {HORAS.map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? 'hora' : 'horas'}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={abrir}
              disabled={abriendo}
              className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2 text-[13px] font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-400/20 transition-transform hover:scale-105 disabled:opacity-60"
            >
              {abriendo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <HandCoins className="h-4 w-4" aria-hidden="true" />}
              Abrir apuestas para esta partida
            </button>
          </div>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
      </footer>
    </section>
  )
}
