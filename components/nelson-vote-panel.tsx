'use client'

import { useEffect, useState, useMemo } from 'react'
import { CheckCircle2, Crown, Loader2, ShieldCheck, Skull, Vote, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'

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

export function NelsonVotePanel({ initialPlayers, initialVoteState }: NelsonVotePanelProps) {
  const router = useRouter()
  const [players, setPlayers] = useState(initialPlayers)
  const [voteState, setVoteState] = useState(initialVoteState)
  
  const [authError, setAuthError] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  const [winnerPopup, setWinnerPopup] = useState<{ show: boolean; name: string } | null>(null)

  // Iniciar Prompt
  const [showStartPrompt, setShowStartPrompt] = useState(false)
  const [startPassword, setStartPassword] = useState('')

  // Votar Modal
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [voterId, setVoterId] = useState('')
  const [voteForId, setVoteForId] = useState('')

  // Finalizar Prompt
  const [showFinishPrompt, setShowFinishPrompt] = useState(false)
  const [finishPassword, setFinishPassword] = useState('')

  const [deviceAlreadyVoted, setDeviceAlreadyVoted] = useState(false)

  useEffect(() => {
    if (voteState.voteId) {
      setDeviceAlreadyVoted(localStorage.getItem(`nelson_voted_${voteState.voteId}`) === 'true')
    } else {
      setDeviceAlreadyVoted(false)
    }
  }, [voteState.voteId])

  const voteResults = useMemo(() => {
    if (!voteState.voteCounts) return []
    
    return players
      .map(p => ({
        name: p.name,
        votes: voteState.voteCounts[p.id] || 0
      }))
      .filter(p => p.votes > 0)
      .sort((a, b) => b.votes - a.votes)
  }, [players, voteState.voteCounts])

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/nelson', { cache: 'no-store' })
      const data = await response.json()
      setPlayers(data.players ?? [])
      setVoteState(data.voteState ?? initialVoteState)
    }
    load()
  }, [initialVoteState])

  const handleStartVote = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/nelson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', password: startPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar la votación')
      setVoteState(result.voteState)
      setMessage('Votación iniciada correctamente')
      setShowStartPrompt(false)
      setStartPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Error al iniciar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voterId || !voteForId) {
      setMessage('Selecciona ambos jugadores')
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/nelson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', voterPlayerId: voterId, voteForPlayerId: voteForId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar el voto')
      
      setVoteState(result.voteState)
      setMessage('Voto registrado correctamente')
      setShowVoteModal(false)
      setVoterId('')
      setVoteForId('')
      
      if (result.voteState.voteId) {
        localStorage.setItem(`nelson_voted_${result.voteState.voteId}`, 'true')
        setDeviceAlreadyVoted(true)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar el voto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinishVote = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/nelson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', password: finishPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo finalizar la votación')
      
      setVoteState(result.voteState)
      setMessage(`Votación finalizada. Ganador: ${result.winner?.name ?? 'Nadie'}`)
      setShowFinishPrompt(false)
      setFinishPassword('')

      if (result.winner) {
        setWinnerPopup({ show: true, name: result.winner.name })
        
        // Trigger confetti
        const duration = 3000
        const end = Date.now() + duration
        
        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#8B4513', '#A0522D', '#D2691E']
          })
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#8B4513', '#A0522D', '#D2691E']
          })
          
          if (Date.now() < end) {
            requestAnimationFrame(frame)
          }
        }
        frame()

        setTimeout(() => {
          setWinnerPopup(null)
          router.refresh()
        }, 5000)
      } else {
        router.refresh()
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Error al finalizar')
    } finally {
      setIsLoading(false)
    }
  }

  const openVoteModal = () => {
    setMessage(null)
    setVoterId('')
    setVoteForId('')
    setShowVoteModal(true)
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Nelson Vote</p>
          <h3 className="text-base font-semibold text-foreground">Votación de la fecha</h3>
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-primary">
              <Crown className="h-4 w-4" />
              <span>Último ganador: {voteState.winnerName}</span>
            </div>
            {voteState.closedAt && (
              <div className="text-[11px] text-muted-foreground ml-6">
                Votado el {new Date(voteState.closedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        ) : null}

        {!voteState.active && voteResults.length > 0 ? (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">Resultados finales</p>
            <div className="grid gap-1.5">
              {voteResults.map((result, idx) => (
                <div key={result.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{idx + 1}. {result.name}</span>
                  <span className="font-medium text-foreground">{result.votes} voto{result.votes !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {!voteState.active ? (
          !showStartPrompt ? (
            <Button
              variant="outline"
              onClick={() => {
                setAuthError(null)
                setShowStartPrompt(true)
              }}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
              Iniciar Votación
            </Button>
          ) : (
            <form onSubmit={handleStartVote} className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="password"
                autoFocus
                placeholder="Clave admin"
                value={startPassword}
                onChange={(e) => {
                  setStartPassword(e.target.value)
                  setAuthError(null)
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary sm:w-48 sm:flex-none"
              />
              <div className="flex w-full gap-2 sm:w-auto">
                <Button type="submit" size="sm" className="flex-1 sm:flex-none" disabled={isLoading || !startPassword}>
                  Iniciar
                </Button>
                <Button type="button" variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setShowStartPrompt(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )
        ) : (
              <>
                <Button
                  onClick={openVoteModal}
                  disabled={isLoading || deviceAlreadyVoted}
                  className="w-full sm:w-auto"
                >
                  {deviceAlreadyVoted ? 'Ya votaste' : 'Votar'}
                </Button>
                
                {!showFinishPrompt ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAuthError(null)
                      setShowFinishPrompt(true)
                    }}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Finalizar Votación
                  </Button>
                ) : (
                  <form onSubmit={handleFinishVote} className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="password"
                      autoFocus
                      placeholder="Clave para finalizar"
                      value={finishPassword}
                      onChange={(e) => {
                        setFinishPassword(e.target.value)
                        setAuthError(null)
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary sm:w-48 sm:flex-none"
                    />
                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button type="submit" size="sm" className="flex-1 sm:flex-none" disabled={isLoading || !finishPassword}>
                        Confirmar
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setShowFinishPrompt(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>

      {authError && (showFinishPrompt || showStartPrompt) && <p className="mt-2 text-xs text-destructive">{authError}</p>}
      
      {message ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      ) : null}

      {/* Votar Modal */}
      {showVoteModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-foreground">Registrar Voto</h3>
              <button onClick={() => setShowVoteModal(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVote} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">¿Quién vota?</label>
                <select
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                  required
                >
                  <option value="">— Seleccionar —</option>
                  {players.map((p) => {
                    const alreadyVoted = !!voteState.voters[p.id]
                    return (
                      <option key={p.id} value={p.id} disabled={alreadyVoted}>
                        {p.name} {alreadyVoted ? '(Ya votó)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">¿A quién vota para Nelson?</label>
                <select
                  value={voteForId}
                  onChange={(e) => setVoteForId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                  required
                >
                  <option value="">— Seleccionar —</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {message && <p className="text-sm text-destructive">{message}</p>}

              <Button type="submit" className="w-full" disabled={isLoading || !voterId || !voteForId}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar Voto
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Pop-up Ganador */}
      {winnerPopup?.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-500">
          <div className="animate-in zoom-in-50 fade-in duration-500 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="text-9xl animate-bounce">
              💩
            </div>
            <div className="rounded-xl border border-border bg-card/90 px-8 py-6 shadow-2xl backdrop-blur-md">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">El nuevo Nelson es</h2>
              <p className="mt-2 text-4xl font-bold text-foreground drop-shadow-md">
                {winnerPopup.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
