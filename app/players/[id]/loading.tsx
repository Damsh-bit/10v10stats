import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Cargando perfil del jugador...
      </div>
    </main>
  )
}
