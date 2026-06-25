'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Crown, Loader2, ShieldCheck, Skull, Vote } from 'lucide-react'

type PlayerOption = {
  id: string
  name: string
  nelsonPoints: number
}

type VoteState = {
  active: boolean
  startedAt: string | null
  startedBy: string | null
  voteId: string | null
  voters: Record<string, string>
  voteCounts: Record<string, number>
  winnerPlayerId: string | null
  winnerName: string | null
  closedAt: string | null
}

type NelsonVotePanelProps = {
  initialPlayers: PlayerOption[]
  initialVoteState: VoteState
  initialAdminPasswordConfigured: boolean
}

function getVoterKey() {
  if (typeof window === 'undefined') return ''
  const existing = window.localStorage.getItem('nelson-voter-key')
  if (existing) return existing

  const generated = `voter-${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem('nelson-voter-key', generated)
  return generated
}

export function NelsonVotePanel({ initialPlayers, initialVoteState, initialAdminPasswordConfigured }: NelsonVotePanelProps) {
  const [players, setPlayers] = useState(initialPlayers)
  const [voteState, setVoteState] = useState(initialVoteState)
  const [adminPasswordConfigured, setAdminPasswordConfigured] = useState(initialAdminPasswordConfigured)
  const [password, setPassword] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [voterKey] = useState(getVoterKey)

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/nelson')
      const data = await response.json()
      setPlayers(data.players ?? [])
      setVoteState(data.voteState ?? initialVoteState)
      setAdminPasswordConfigured(Boolean(data.adminPasswordConfigured))
    }

    load()
  }, [initialVoteState])

  const canVote = useMemo(() => {
    return voteState.active && !voteState.voters[voterKey] && players.length > 0
  }, [players.length, voteState.active, voteState.voters, voterKey])

  const handleStartVote = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/nelson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar la votación')
      setVoteState(result.voteState)
      setMessage('Votación iniciada correctamente')
      setPassword('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar la votación')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVote = async () => {
    if (!selectedPlayerId) {
      setMessage('Selecciona un jugador para votar')
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/nelson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', voterKey, voteForPlayerId: selectedPlayerId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar el voto')
      setVoteState(result.voteState)
      setMessage('Tu voto fue registrado')
      setSelectedPlayerId('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar el voto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinishVote = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/nelson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo finalizar la votación')
      setVoteState(result.voteState)
      setMessage(`Votación finalizada. Ganador: ${result.winner?.name ?? 'Sin datos'}`)
      setPassword('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo finalizar la votación')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Nelson Vote</p>
          <h3 className="text-base font-semibold text-foreground">Votación del Nelson de la fecha</h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Vote className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted-foreground">
        {voteState.active ? (
          <div className="flex items-center gap-2 text-emerald-500">
            <ShieldCheck className="h-4 w-4" />
            <span>Votación activa ahora mismo</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Skull className="h-4 w-4" />
            <span>No hay una votación activa</span>
          </div>
        )}

        {voteState.winnerName ? (
          <div className="flex items-center gap-2 text-primary">
            <Crown className="h-4 w-4" />
            <span>Último ganador: {voteState.winnerName}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {adminPasswordConfigured ? (
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Contraseña admin</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              placeholder="Contraseña"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">
            La contraseña admin no está configurada. Define NELSON_ADMIN_PASSWORD en el entorno para habilitar el inicio/cierre.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleStartVote}
            disabled={isLoading || !adminPasswordConfigured}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
            Iniciar votación
          </button>
          <button
            type="button"
            onClick={handleFinishVote}
            disabled={isLoading || !adminPasswordConfigured}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
            Finalizar votación
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Votar al Nelson de la fecha</h4>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">1 voto por persona</span>
        </div>

        <div className="space-y-2">
          {players.map((player) => (
            <label key={player.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="nelson-vote"
                  value={player.id}
                  checked={selectedPlayerId === player.id}
                  onChange={() => setSelectedPlayerId(player.id)}
                  disabled={!canVote}
                />
                <span>{player.name}</span>
              </div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{player.nelsonPoints} pts</span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleVote}
          disabled={isLoading || !canVote || !selectedPlayerId}
          className="mt-3 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
          Enviar voto
        </button>
      </div>

      {message ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      ) : null}
    </section>
  )
}
