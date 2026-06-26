'use client'

import { useState } from 'react'
import { Pencil, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type PlayerOption = {
  id: string
  name: string
  photoUrl?: string
}

export function EditPlayerModal({ player }: { player: PlayerOption }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(player.name)
  const [photoUrl, setPhotoUrl] = useState(player.photoUrl || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('password', password)
      formData.append('photoUrl', photoUrl)
      if (photoFile) {
        formData.append('photoFile', photoFile)
      }

      const response = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Ocurrió un error')
      }

      setSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-white"
        title="Editar jugador"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-xl font-bold uppercase tracking-tight text-foreground">Editar Jugador</h2>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 rounded-full bg-green-500/20 p-3 text-green-500">
              <Pencil className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">¡Perfil actualizado!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-sm">
              <label className="font-semibold text-muted-foreground">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none ring-0 focus:border-primary"
                required
              />
            </div>
            <div className="space-y-2 text-sm">
              <label className="font-semibold text-muted-foreground">URL de Imagen</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none ring-0 focus:border-primary"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2 text-sm">
              <label className="font-semibold text-muted-foreground">O subir desde tu PC</label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setPhotoFile(file)
                    // Opcional: limpiar la URL si se sube archivo
                    setPhotoUrl('')
                  }
                }}
                className="w-full text-foreground file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
            </div>
            <div className="space-y-2 text-sm">
              <label className="font-semibold text-muted-foreground">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none ring-0 focus:border-primary"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Cambios'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
