'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Portal, useBodyScrollLock } from '@/components/ui/portal'
import { esClaveAdmin } from '@/lib/clave-admin'
import { cn } from '@/lib/utils'
import { ImportarXplay } from './importar-xplay'

/** Botón y modal para sumarle (o actualizarle) el link de Xplay a una partida ya cargada. */
export function VincularXplayModal({
  matchId,
  label = 'Cargar link de Xplay',
  className,
}: {
  matchId: string
  label?: string
  className?: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [clave, setClave] = useState('')
  const [autorizado, setAutorizado] = useState(false)
  const [errorClave, setErrorClave] = useState<string | null>(null)
  const [guardada, setGuardada] = useState(false)
  useBodyScrollLock(abierto)

  const cerrar = () => {
    setAbierto(false)
    if (guardada) router.refresh()
    setGuardada(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/60 hover:bg-accent/40',
          className,
        )}
      >
        <Link2 className="h-4 w-4 text-brand" aria-hidden="true" />
        {label}
      </button>

      {abierto ? (
        <Portal>
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 sm:p-4" role="dialog" aria-modal="true" aria-label="Cargar link de Xplay">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center">
              <div className="relative flex min-h-screen flex-col bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:border sm:border-border">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">Xplay</p>
                    <h2 className="text-xl font-semibold text-foreground">Completar la partida con Xplay</h2>
                  </div>
                  <button onClick={cerrar} aria-label="Cerrar" className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5">
                  {autorizado ? (
                    <ImportarXplay clave={clave} matchId={matchId} onGuardada={() => setGuardada(true)} />
                  ) : (
                    <form
                      className="mx-auto flex max-w-sm flex-col gap-3 py-8"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (esClaveAdmin(clave)) {
                          setAutorizado(true)
                          setErrorClave(null)
                        } else {
                          setErrorClave('Clave de administrador incorrecta.')
                        }
                      }}
                    >
                      <p className="text-center text-sm text-muted-foreground">Ingresá la clave de administrador para continuar.</p>
                      <input
                        type="password"
                        autoFocus
                        value={clave}
                        onChange={(event) => {
                          setClave(event.target.value)
                          setErrorClave(null)
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg tracking-widest text-foreground outline-none focus:border-primary"
                        placeholder="••••••••"
                      />
                      {errorClave ? <p className="text-center text-sm text-destructive">{errorClave}</p> : null}
                      <Button type="submit">Desbloquear</Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  )
}
