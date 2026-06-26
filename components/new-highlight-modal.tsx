'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PlayerOption = {
  id: string
  name: string
}

type FormState = {
  player_id: string
  type: string
  description: string
  round_number: string
}

const INPUT_CLASS =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary'

const MAX_VIDEO_BYTES = 10 * 1024 * 1024 * 1024
const MAX_VIDEO_LABEL = '10 GB'
const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov'

function createInitialFormState(): FormState {
  return {
    player_id: '',
    type: 'OTHER',
    description: '',
    round_number: '',
  }
}

export function NewHighlightModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FormState>(createInitialFormState)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
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

        const playersData = (await response.json()) as PlayerOption[]
        setPlayers(playersData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los jugadores')
      } finally {
        setIsLoadingPlayers(false)
      }
    }

    loadPlayers()
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
    }
  }, [videoPreviewUrl])

  const canSubmit = form.player_id.trim().length > 0 && videoFile !== null

  const clearVideoPreview = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setVideoError(null)
  }

  const handleOpen = () => {
    setIsOpen(true)
    setError(null)
    setVideoError(null)
    setSuccessMessage(null)
    setForm(createInitialFormState())
    clearVideoPreview()
  }

  const handleClose = () => {
    setIsOpen(false)
    setError(null)
    setVideoError(null)
    setSuccessMessage(null)
    setForm(createInitialFormState())
    clearVideoPreview()
  }

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_VIDEO_BYTES) {
      setVideoFile(null)
      setVideoPreviewUrl(null)
      setVideoError(`El video no puede superar los ${MAX_VIDEO_LABEL}.`)
      setError(null)
      event.target.value = ''
      return
    }

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }

    setVideoFile(file)
    setVideoPreviewUrl(URL.createObjectURL(file))
    setVideoError(null)
    setError(null)
    event.target.value = ''
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit || !videoFile) {
      setError('Selecciona un jugador y sube un video antes de guardar.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const payload = new FormData()
      payload.append('player_id', form.player_id)
      payload.append('video', videoFile)
      payload.append('type', form.type)
      payload.append('description', form.description.trim())
      if (form.round_number !== '') {
        payload.append('round_number', form.round_number)
      }

      const response = await fetch('/api/highlights', {
        method: 'POST',
        body: payload,
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo guardar el highlight')
      }

      setSuccessMessage('Highlight guardado correctamente.')
      router.refresh()

      setTimeout(() => {
        handleClose()
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el highlight')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="default" onClick={handleOpen}>
        Nuevo highlight
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-0 sm:p-4"
          role="presentation"
          onClick={handleClose}
        >
          <div
            className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center"
            role="presentation"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="relative flex min-h-screen flex-col rounded-none border-0 bg-background/95 p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:border sm:border-border"
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-highlight-title"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
                    Nuevo highlight
                  </p>
                  <h2 id="new-highlight-title" className="text-xl font-semibold text-foreground">
                    Registrar clip de jugador
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Jugador</span>
                  <select
                    value={form.player_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, player_id: event.target.value }))}
                    className={INPUT_CLASS}
                    disabled={isLoadingPlayers || isSubmitting}
                    required
                  >
                    <option value="">— seleccionar —</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Video del highlight</span>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/70 px-6 py-8 text-center transition hover:border-primary hover:bg-primary/5">
                    <Upload className="mb-3 h-8 w-8 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Haz click o arrastra un video
                    </span>
                    <span className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      MP4, WEBM o MOV · máx. 10 GB
                    </span>
                    <input
                      type="file"
                      accept={ACCEPTED_VIDEO_TYPES}
                      className="sr-only"
                      onChange={handleVideoUpload}
                      disabled={isSubmitting}
                    />
                  </label>

                  {videoError ? <p className="text-sm text-destructive">{videoError}</p> : null}

                  {videoFile ? (
                    <div className="space-y-3 rounded-xl border border-border bg-card/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-foreground">{videoFile.name}</p>
                        <button
                          type="button"
                          onClick={clearVideoPreview}
                          className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Quitar video"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {videoPreviewUrl ? (
                        <video
                          key={videoPreviewUrl}
                          src={videoPreviewUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="aspect-video w-full rounded-lg bg-black object-contain"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <input
                      type="text"
                      value={form.type}
                      onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="Ej. ACE, CLUTCH, ENTRY_FRAG"
                      disabled={isSubmitting}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Ronda</span>
                    <input
                      type="number"
                      min="0"
                      value={form.round_number}
                      onChange={(event) => setForm((prev) => ({ ...prev, round_number: event.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="Opcional"
                      disabled={isSubmitting}
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Descripción</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                    placeholder="Detalle opcional del clip"
                    disabled={isSubmitting}
                  />
                </label>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {successMessage ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    {successMessage}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    {isLoadingPlayers
                      ? 'Cargando jugadores…'
                      : `${players.length} jugador${players.length === 1 ? '' : 'es'} disponibles`}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={!canSubmit || isSubmitting || isLoadingPlayers}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Guardar highlight
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
