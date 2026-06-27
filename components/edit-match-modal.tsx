'use client'

import { useState } from 'react'
import { Loader2, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

type PlayerRow = {
  player_id: string
  name: string
  team: string
  kills: string
  deaths: string
  assists: string
  damage: string
  hsPct: string
}

type EditMatchProps = {
  matchId: string
  initialCtScore: number
  initialTScore: number
  teamALabel: string
  teamBLabel: string
  matchPlayers: any[]
  allPlayers: any[]
}

export function EditMatchModal({
  matchId,
  initialCtScore,
  initialTScore,
  teamALabel,
  teamBLabel,
  matchPlayers,
  allPlayers,
}: EditMatchProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [password, setPassword] = useState('')

  const [scoreCt, setScoreCt] = useState(String(initialCtScore))
  const [scoreT, setScoreT] = useState(String(initialTScore))

  const [players, setPlayers] = useState<PlayerRow[]>(() => {
    return matchPlayers.map((p: any) => {
      const fullPlayer = allPlayers.find((ap) => ap.id === p.playerId)
      return {
        player_id: p.playerId,
        name: fullPlayer?.name || 'Desconocido',
        team: p.team,
        kills: String(p.kills),
        deaths: String(p.deaths),
        assists: String(p.assists),
        damage: String(p.damage),
        hsPct: String(p.hsPct),
      }
    })
  })

  const handleOpen = () => {
    setIsOpen(true)
    setError(null)
    setSuccess(null)
    setPassword('')
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const updatePlayerRow = (playerId: string, field: keyof PlayerRow, value: string) => {
    setPlayers((prev) =>
      prev.map((row) => (row.player_id === playerId ? { ...row, [field]: value } : row))
    )
  }

  const handleSubmit = async () => {
    if (!password) {
      setError('Debes ingresar la contraseña')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        password,
        score_ct: Number(scoreCt),
        score_t: Number(scoreT),
        players: players.map((row) => ({
          player_id: row.player_id,
          team: row.team,
          kills: Number(row.kills || 0),
          deaths: Number(row.deaths || 0),
          assists: Number(row.assists || 0),
          damage: Number(row.damage || 0),
          hs_pct: Number(row.hsPct || 0),
        })),
      }

      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo guardar la partida')
      }

      setSuccess('Partida editada correctamente.')
      setTimeout(() => {
        handleClose()
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={handleOpen} className="flex items-center gap-1.5 h-8 text-[12px] uppercase font-semibold">
        Editar Partida
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-0 sm:p-4">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center py-10">
            <div className="relative flex flex-col rounded-none border-0 bg-background/95 p-4 shadow-2xl sm:rounded-2xl sm:border sm:border-border">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Edición</p>
                  <h2 className="text-xl font-semibold text-foreground">Editar Datos de Partida</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {/* Scores */}
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Score {teamALabel}</span>
                    <input
                      type="number"
                      min="0"
                      value={scoreCt}
                      onChange={(e) => setScoreCt(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Score {teamBLabel}</span>
                    <input
                      type="number"
                      min="0"
                      value={scoreT}
                      onChange={(e) => setScoreT(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                </div>

                {/* Players */}
                <div className="space-y-6">
                  {/* Team A */}
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{teamALabel}</h3>
                    </div>
                    {players
                      .filter((row) => row.team === teamALabel || row.team === 'CT')
                      .map((row) => (
                      <div
                        key={row.player_id}
                        className="grid gap-2 rounded-xl border border-border bg-background/70 p-3 sm:grid-cols-[1fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr]"
                      >
                        <div className="space-y-1">
                          <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Jugador</label>
                          <div className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                            {row.name}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Equipo</label>
                          <select
                            value={row.team}
                            onChange={(e) => updatePlayerRow(row.player_id, 'team', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          >
                            <option value={teamALabel}>{teamALabel}</option>
                            <option value={teamBLabel}>{teamBLabel}</option>
                            {row.team !== teamALabel && row.team !== teamBLabel && (
                               <option value={row.team}>{row.team}</option>
                            )}
                          </select>
                        </div>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Kills</span>
                          <input
                            type="number"
                            min="0"
                            value={row.kills}
                            onChange={(e) => updatePlayerRow(row.player_id, 'kills', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Deaths</span>
                          <input
                            type="number"
                            min="0"
                            value={row.deaths}
                            onChange={(e) => updatePlayerRow(row.player_id, 'deaths', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Assists</span>
                          <input
                            type="number"
                            min="0"
                            value={row.assists}
                            onChange={(e) => updatePlayerRow(row.player_id, 'assists', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>HS%</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.hsPct}
                            onChange={(e) => updatePlayerRow(row.player_id, 'hsPct', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Damage</span>
                          <input
                            type="number"
                            min="0"
                            value={row.damage}
                            onChange={(e) => updatePlayerRow(row.player_id, 'damage', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Team B */}
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{teamBLabel}</h3>
                    </div>
                    {players
                      .filter((row) => row.team !== teamALabel && row.team !== 'CT')
                      .map((row) => (
                      <div
                        key={row.player_id}
                        className="grid gap-2 rounded-xl border border-border bg-background/70 p-3 sm:grid-cols-[1fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr]"
                      >
                        <div className="space-y-1">
                          <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Jugador</label>
                          <div className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                            {row.name}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Equipo</label>
                          <select
                            value={row.team}
                            onChange={(e) => updatePlayerRow(row.player_id, 'team', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          >
                            <option value={teamALabel}>{teamALabel}</option>
                            <option value={teamBLabel}>{teamBLabel}</option>
                            {row.team !== teamALabel && row.team !== teamBLabel && (
                               <option value={row.team}>{row.team}</option>
                            )}
                          </select>
                        </div>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Kills</span>
                          <input
                            type="number"
                            min="0"
                            value={row.kills}
                            onChange={(e) => updatePlayerRow(row.player_id, 'kills', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Deaths</span>
                          <input
                            type="number"
                            min="0"
                            value={row.deaths}
                            onChange={(e) => updatePlayerRow(row.player_id, 'deaths', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Assists</span>
                          <input
                            type="number"
                            min="0"
                            value={row.assists}
                            onChange={(e) => updatePlayerRow(row.player_id, 'assists', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>HS%</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.hsPct}
                            onChange={(e) => updatePlayerRow(row.player_id, 'hsPct', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Damage</span>
                          <input
                            type="number"
                            min="0"
                            value={row.damage}
                            onChange={(e) => updatePlayerRow(row.player_id, 'damage', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Clave de administrador (para guardar cambios)</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                      placeholder="••••••••"
                    />
                  </label>

                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  {success ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      {success}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={handleClose}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
