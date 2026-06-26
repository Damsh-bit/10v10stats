'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Team = 'CT' | 'T'

type PlayerOption = {
  id: string
  name: string
  badge?: string | null
}

type PlayerRow = {
  id: number
  team: Team
  player_id: string
  kills: string
  deaths: string
  assists: string
  damage: string
  hsPct: string
}

type FormState = {
  map: string
  team_a_name: string
  team_b_name: string
  score_ct: string
  score_t: string
  winner_team: Team
  played_at: string
  total_rounds: string
  video_url: string
  notes: string
  players: PlayerRow[]
}

const PLAYER_ROWS = 10
const STEP_LABELS = ['Subir captura', 'Datos de la partida', 'Guardar']

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

function createInitialFormState(): FormState {
  const rows: PlayerRow[] = []
  for (let index = 0; index < PLAYER_ROWS; index += 1) {
    const team: Team = index < 5 ? 'CT' : 'T'
    rows.push({
      id: index,
      team,
      player_id: '',
      kills: '',
      deaths: '',
      assists: '',
      damage: '',
      hsPct: '',
    })
  }

  return {
    map: '',
    team_a_name: 'Equipo A',
    team_b_name: 'Equipo B',
    score_ct: '',
    score_t: '',
    winner_team: 'CT',
    played_at: getTodayString(),
    total_rounds: '',
    video_url: '',
    notes: '',
    players: rows,
  }
}

export function NewMatchModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [form, setForm] = useState<FormState>(createInitialFormState)
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const loadPlayers = async () => {
      setIsLoadingPlayers(true)
      setError(null)
      try {
        const response = await fetch('/api/players')
        if (!response.ok) {
          throw new Error('No se pudieron cargar los jugadores')
        }
        const data = (await response.json()) as PlayerOption[]
        setPlayers(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los jugadores')
      } finally {
        setIsLoadingPlayers(false)
      }
    }

    loadPlayers()
  }, [isOpen])

  useEffect(() => {
    const scoreCt = Number(form.score_ct)
    const scoreT = Number(form.score_t)
    if (Number.isFinite(scoreCt) && Number.isFinite(scoreT)) {
      setForm((prev) => ({
        ...prev,
        winner_team: scoreCt !== scoreT ? (scoreCt > scoreT ? 'CT' : 'T') : prev.winner_team,
        total_rounds: form.score_ct !== '' && form.score_t !== '' ? String(scoreCt + scoreT) : '',
      }))
    }
  }, [form.score_ct, form.score_t])

  const teamAName = form.team_a_name.trim() || 'Equipo A'
  const teamBName = form.team_b_name.trim() || 'Equipo B'
  const selectedPlayerIds = form.players.map((row) => row.player_id).filter(Boolean)
  const hasDuplicateSelection = new Set(selectedPlayerIds).size !== selectedPlayerIds.length
  const allPlayersAssigned = form.players.every((row) => row.player_id)
  const scoresValid = form.score_ct !== '' && form.score_t !== ''
  const mapValid = form.map.trim().length > 0
  const canSave = mapValid && scoresValid && allPlayersAssigned && !hasDuplicateSelection

  const handleOpen = () => {
    setIsOpen(true)
    setStep(1)
    setError(null)
    setSuccessMessage(null)
    setForm(createInitialFormState())
    setScreenshotFile(null)
    setScreenshotUrl(null)
    setAdminPassword('')
  }

  const handleClose = () => {
    if (screenshotUrl) {
      URL.revokeObjectURL(screenshotUrl)
    }
    setIsOpen(false)
    setStep(1)
    setError(null)
    setSuccessMessage(null)
    setForm(createInitialFormState())
    setScreenshotFile(null)
    setScreenshotUrl(null)
    setAdminPassword('')
  }

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (screenshotUrl) {
      URL.revokeObjectURL(screenshotUrl)
    }

    setScreenshotFile(file)
    setScreenshotUrl(URL.createObjectURL(file))
    setError(null)
    setSuccessMessage(null)

    // Auto-advance to the data form after a brief preview
    setTimeout(() => setStep(2), 600)
  }

  const handleRemoveScreenshot = () => {
    if (screenshotUrl) {
      URL.revokeObjectURL(screenshotUrl)
    }
    setScreenshotFile(null)
    setScreenshotUrl(null)
  }

  const updatePlayerRow = (rowId: number, field: keyof PlayerRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      players: prev.players.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }))
  }

  const handleSubmit = async () => {
    if (!canSave) {
      setError('Completa todos los campos y asigna 10 jugadores únicos antes de guardar.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const payload = {
        map: form.map.trim(),
        team_a_name: teamAName,
        team_b_name: teamBName,
        score_ct: Number(form.score_ct),
        score_t: Number(form.score_t),
        winner_team: form.winner_team,
        played_at: form.played_at,
        total_rounds: form.total_rounds === '' ? null : Number(form.total_rounds),
        video_url: form.video_url.trim() || null,
        notes: form.notes.trim() || null,
        players: form.players.map((row) => ({
          player_id: row.player_id,
          team: row.team,
          won: row.team === form.winner_team,
          kills: Number(row.kills || 0),
          deaths: Number(row.deaths || 0),
          assists: Number(row.assists || 0),
          damage: Number(row.damage || 0),
          hs_pct: Number(row.hsPct || 0),
        })),
      }

      const formData = new FormData()
      formData.append('payload', JSON.stringify(payload))
      if (screenshotFile) {
        formData.append('screenshot', screenshotFile)
      }

      const response = await fetch('/api/matches', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo guardar la partida')
      }

      setSuccessMessage(`Partida guardada correctamente${result.matchId ? ` (${result.matchId})` : ''}.`)
      setStep(3)
      setForm(createInitialFormState())
      if (screenshotUrl) {
        URL.revokeObjectURL(screenshotUrl)
      }
      setScreenshotFile(null)
      setScreenshotUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la partida')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepContent = useMemo(() => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/70 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Subí una captura de la partida</h3>
                <p className="text-sm text-muted-foreground">
                  La captura es solo de referencia visual. Completarás los datos manualmente en el siguiente paso.
                </p>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/70 px-6 py-10 text-center transition hover:border-primary hover:bg-primary/5">
            <Upload className="mb-3 h-8 w-8 text-primary" />
            <span className="text-sm font-semibold text-foreground">Haz click o arrastra una imagen</span>
            <span className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              PNG, JPG o WEBP
            </span>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleScreenshotUpload} />
          </label>

          {screenshotUrl ? (
            <div className="space-y-3 rounded-xl border border-border bg-card/70 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Vista previa</p>
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <img src={screenshotUrl} alt="Captura de referencia" className="w-full rounded-lg object-contain" />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      )
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          {screenshotUrl ? (
            <div className="space-y-2 rounded-xl border border-border bg-card/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Captura de referencia</p>
              <img src={screenshotUrl} alt="Captura de referencia" className="max-h-[280px] w-full rounded-xl border border-border object-contain" />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Mapa</span>
              <select
                value={form.map}
                onChange={(event) => setForm((prev) => ({ ...prev, map: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              >
                <option value="">— Seleccionar mapa —</option>
                {['Mirage', 'Inferno', 'Overpass', 'Nuke', 'Vertigo', 'Ancient', 'Anubis', 'Dust 2', 'Train', 'Cache'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Fecha</span>
              <input
                type="date"
                value={form.played_at}
                onChange={(event) => setForm((prev) => ({ ...prev, played_at: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Nombre Equipo 1</span>
              <input
                value={form.team_a_name}
                onChange={(event) => setForm((prev) => ({ ...prev, team_a_name: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                placeholder="Equipo Tomi"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Nombre Equipo 2</span>
              <input
                value={form.team_b_name}
                onChange={(event) => setForm((prev) => ({ ...prev, team_b_name: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                placeholder="Equipo Dami"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Score {teamAName}</span>
              <input
                type="number"
                min="0"
                value={form.score_ct}
                onChange={(event) => setForm((prev) => ({ ...prev, score_ct: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Score {teamBName}</span>
              <input
                type="number"
                min="0"
                value={form.score_t}
                onChange={(event) => setForm((prev) => ({ ...prev, score_t: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Ganador</span>
            <select
              value={form.winner_team}
              onChange={(event) => setForm((prev) => ({ ...prev, winner_team: event.target.value as Team }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
            >
              <option value="CT">{teamAName}</option>
              <option value="T">{teamBName}</option>
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Total de rondas</span>
              <input
                type="number"
                min="0"
                value={form.total_rounds}
                onChange={(event) => setForm((prev) => ({ ...prev, total_rounds: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                placeholder="16"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Video URL</span>
              <input
                value={form.video_url}
                onChange={(event) => setForm((prev) => ({ ...prev, video_url: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                placeholder="https://..."
              />
            </label>
          </div>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Notas</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="min-h-[90px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              placeholder="Detalles de la partida"
            />
          </label>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{teamAName}</h3>
            </div>
            <div className="space-y-3">
              {form.players.filter((row) => row.team === 'CT').map((row) => (
                <div key={row.id} className="grid gap-2 rounded-xl border border-border bg-background/70 p-3 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr]">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Jugador</label>
                    <select
                      value={row.player_id}
                      onChange={(event) => updatePlayerRow(row.id, 'player_id', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    >
                      <option value="">— seleccionar —</option>
                      {players
                        .filter((p) => !selectedPlayerIds.includes(p.id) || p.id === row.player_id)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Kills</span>
                    <input
                      type="number"
                      min="0"
                      value={row.kills}
                      onChange={(event) => updatePlayerRow(row.id, 'kills', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Deaths</span>
                    <input
                      type="number"
                      min="0"
                      value={row.deaths}
                      onChange={(event) => updatePlayerRow(row.id, 'deaths', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Assists</span>
                    <input
                      type="number"
                      min="0"
                      value={row.assists}
                      onChange={(event) => updatePlayerRow(row.id, 'assists', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Damage</span>
                    <input
                      type="number"
                      min="0"
                      value={row.damage}
                      onChange={(event) => updatePlayerRow(row.id, 'damage', event.target.value)}
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
                      onChange={(event) => updatePlayerRow(row.id, 'hsPct', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{teamBName}</h3>
            </div>
            <div className="space-y-3">
              {form.players.filter((row) => row.team === 'T').map((row) => (
                <div key={row.id} className="grid gap-2 rounded-xl border border-border bg-background/70 p-3 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr]">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Jugador</label>
                    <select
                      value={row.player_id}
                      onChange={(event) => updatePlayerRow(row.id, 'player_id', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    >
                      <option value="">— seleccionar —</option>
                      {players
                        .filter((p) => !selectedPlayerIds.includes(p.id) || p.id === row.player_id)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Kills</span>
                    <input
                      type="number"
                      min="0"
                      value={row.kills}
                      onChange={(event) => updatePlayerRow(row.id, 'kills', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Deaths</span>
                    <input
                      type="number"
                      min="0"
                      value={row.deaths}
                      onChange={(event) => updatePlayerRow(row.id, 'deaths', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Assists</span>
                    <input
                      type="number"
                      min="0"
                      value={row.assists}
                      onChange={(event) => updatePlayerRow(row.id, 'assists', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Damage</span>
                    <input
                      type="number"
                      min="0"
                      value={row.damage}
                      onChange={(event) => updatePlayerRow(row.id, 'damage', event.target.value)}
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
                      onChange={(event) => updatePlayerRow(row.id, 'hsPct', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card/70 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Resumen</h3>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Mapa:</span> {form.map || 'Sin info'}
            </p>
            <p>
              <span className="font-semibold text-foreground">Score:</span> {teamAName} {form.score_ct} - {form.score_t} {teamBName}
            </p>
            <p>
              <span className="font-semibold text-foreground">Ganador:</span> {form.winner_team === 'CT' ? teamAName : teamBName}
            </p>
            <p>
              <span className="font-semibold text-foreground">Rondas:</span> {form.total_rounds || 'Sin info'}
            </p>
            <p>
              <span className="font-semibold text-foreground">Jugadores:</span> {form.players.length} asignados
            </p>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {successMessage ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        ) : null}
      </div>
    )
  }, [error, form, players, step, successMessage, teamAName, teamBName])

  return (
    <>
      <Button variant="default" onClick={handleOpen}>
        Nueva partida
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-0 sm:p-4">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center">
            <div className="relative flex min-h-screen flex-col rounded-none border-0 bg-background/95 p-4 shadow-2xl sm:min-h-[80vh] sm:rounded-2xl sm:border sm:border-border">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Nueva partida</p>
                  <h2 className="text-xl font-semibold text-foreground">Registrar match de CS2</h2>
                </div>
                <button onClick={handleClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-full max-w-sm space-y-4">
                    <div className="space-y-2 text-center">
                      <h3 className="text-lg font-medium text-foreground">Acceso restringido</h3>
                      <p className="text-sm text-muted-foreground">Ingresa la clave de administrador para continuar.</p>
                    </div>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (adminPassword === 'alzhannah2026') {
                          setIsAuthenticated(true)
                          setAuthError(null)
                        } else {
                          setAuthError('Clave de administrador incorrecta.')
                        }
                      }}
                      className="space-y-4"
                    >
                      <input
                        type="password"
                        autoFocus
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value)
                          setAuthError(null)
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg tracking-widest text-foreground outline-none ring-0 focus:border-primary"
                        placeholder="••••••••"
                      />
                      {authError && <p className="text-center text-sm text-destructive">{authError}</p>}
                      <Button type="submit" className="w-full">Desbloquear</Button>
                    </form>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {STEP_LABELS.map((label, index) => {
                      const active = index + 1 === step
                      const complete = index + 1 < step
                      return (
                        <div key={label} className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${active ? 'bg-primary text-primary-foreground' : complete ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {label}
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 flex-1">{stepContent}</div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div className="text-sm text-muted-foreground">
                      {isLoadingPlayers ? 'Cargando jugadores…' : 'Los jugadores se traen desde la base de datos.'}
                    </div>
                    <div className="flex gap-2">
                      {step > 1 ? (
                        <Button variant="outline" onClick={() => setStep((prev) => prev - 1)}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Volver
                        </Button>
                      ) : null}
                      {step < 3 ? (
                        <Button onClick={() => setStep((prev) => prev + 1)}>
                          Siguiente
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button onClick={handleSubmit} disabled={!canSave || isSubmitting}>
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Guardar partida
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
