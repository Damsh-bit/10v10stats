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
  raw_name: string
  kills: string
  deaths: string
  assists: string
  damage: string
}

type OcrPlayer = {
  raw_name: string
  team: Team
  kills: number
  deaths: number
  assists: number
  damage: number
}

type OcrPayload = {
  map: string
  score_ct: number
  score_t: number
  winner_team: Team
  players: OcrPlayer[]
}

type FormState = {
  map: string
  score_ct: string
  score_t: string
  winner_team: Team
  played_at: string
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
      raw_name: '',
      kills: '',
      deaths: '',
      assists: '',
      damage: '',
    })
  }

  return {
    map: '',
    score_ct: '',
    score_t: '',
    winner_team: 'CT',
    played_at: getTodayString(),
    players: rows,
  }
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] ?? ''
        resolve(base64)
        return
      }
      reject(new Error('No se pudo leer la imagen'))
    }
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

export function NewMatchModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [form, setForm] = useState<FormState>(createInitialFormState)
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
    if (Number.isFinite(scoreCt) && Number.isFinite(scoreT) && scoreCt !== scoreT) {
      setForm((prev) => ({ ...prev, winner_team: scoreCt > scoreT ? 'CT' : 'T' }))
    }
  }, [form.score_ct, form.score_t])

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
  }

  const handleClose = () => {
    setIsOpen(false)
    setStep(1)
    setError(null)
    setSuccessMessage(null)
    setForm(createInitialFormState())
  }

  const applyOcrResult = (ocr: OcrPayload) => {
    const ctPlayers = ocr.players.filter((player) => player.team === 'CT').slice(0, 5)
    const tPlayers = ocr.players.filter((player) => player.team === 'T').slice(0, 5)

    const nextPlayers: PlayerRow[] = []

    for (let index = 0; index < 5; index += 1) {
      const source = ctPlayers[index]
      nextPlayers.push({
        id: index,
        team: 'CT',
        player_id: '',
        raw_name: source?.raw_name ?? '',
        kills: source ? String(source.kills) : '',
        deaths: source ? String(source.deaths) : '',
        assists: source ? String(source.assists) : '',
        damage: source ? String(source.damage) : '',
      })
    }

    for (let index = 0; index < 5; index += 1) {
      const source = tPlayers[index]
      nextPlayers.push({
        id: index + 5,
        team: 'T',
        player_id: '',
        raw_name: source?.raw_name ?? '',
        kills: source ? String(source.kills) : '',
        deaths: source ? String(source.deaths) : '',
        assists: source ? String(source.assists) : '',
        damage: source ? String(source.damage) : '',
      })
    }

    setForm({
      map: ocr.map || '',
      score_ct: String(ocr.score_ct ?? ''),
      score_t: String(ocr.score_t ?? ''),
      winner_team: ocr.winner_team || 'CT',
      played_at: getTodayString(),
      players: nextPlayers,
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsOcrLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const base64 = await fileToBase64(file)
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type || 'image/png' }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo procesar la imagen')
      }

      applyOcrResult(payload as OcrPayload)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen')
    } finally {
      setIsOcrLoading(false)
      event.target.value = ''
    }
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
        score_ct: Number(form.score_ct),
        score_t: Number(form.score_t),
        winner_team: form.winner_team,
        played_at: form.played_at,
        players: form.players.map((row) => ({
          player_id: row.player_id,
          team: row.team,
          won: row.team === form.winner_team,
          kills: Number(row.kills || 0),
          deaths: Number(row.deaths || 0),
          assists: Number(row.assists || 0),
          damage: Number(row.damage || 0),
        })),
      }

      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo guardar la partida')
      }

      setSuccessMessage(`Partida guardada correctamente${result.matchId ? ` (${result.matchId})` : ''}.`)
      setStep(3)
      setForm(createInitialFormState())
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
                  El OCR extraerá el mapa, score, ganador y los jugadores para precargar el formulario.
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
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleFileUpload} />
          </label>

          {isOcrLoading ? (
            <div className="flex items-center justify-center rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando la imagen con OCR…
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      )
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Mapa</span>
              <input
                value={form.map}
                onChange={(event) => setForm((prev) => ({ ...prev, map: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                placeholder="Inferno"
              />
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
              <span className="text-muted-foreground">Score CT</span>
              <input
                type="number"
                min="0"
                value={form.score_ct}
                onChange={(event) => setForm((prev) => ({ ...prev, score_ct: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Score T</span>
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
              <option value="CT">CT</option>
              <option value="T">T</option>
            </select>
          </label>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Equipo CT</h3>
            </div>
            <div className="space-y-3">
              {form.players.filter((row) => row.team === 'CT').map((row) => (
                <div key={row.id} className="grid gap-2 rounded-xl border border-border bg-background/70 p-3 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr]">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Jugador</label>
                    <select
                      value={row.player_id}
                      onChange={(event) => updatePlayerRow(row.id, 'player_id', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    >
                      <option value="">— seleccionar —</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                    {row.raw_name ? <p className="text-[11px] text-muted-foreground">OCR: {row.raw_name}</p> : null}
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
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Equipo T</h3>
            </div>
            <div className="space-y-3">
              {form.players.filter((row) => row.team === 'T').map((row) => (
                <div key={row.id} className="grid gap-2 rounded-xl border border-border bg-background/70 p-3 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr]">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Jugador</label>
                    <select
                      value={row.player_id}
                      onChange={(event) => updatePlayerRow(row.id, 'player_id', event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    >
                      <option value="">— seleccionar —</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                    {row.raw_name ? <p className="text-[11px] text-muted-foreground">OCR: {row.raw_name}</p> : null}
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
              <span className="font-semibold text-foreground">Score:</span> {form.score_ct} - {form.score_t}
            </p>
            <p>
              <span className="font-semibold text-foreground">Ganador:</span> {form.winner_team}
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
  }, [error, form, isOcrLoading, players, step, successMessage])

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
                    <Button onClick={() => setStep((prev) => prev + 1)} disabled={step === 1 && (isOcrLoading || !form.map && !form.score_ct && !form.score_t)}>
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
