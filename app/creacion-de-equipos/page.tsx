import { getAllPlayerStats } from '@/lib/api'
import { TeamGenerator } from '@/components/TeamGenerator/TeamGenerator'

export const revalidate = 60

export default async function TeamGeneratorPage() {
  const stats = await getAllPlayerStats()
  const stats20 = await getAllPlayerStats({ lastNMatchesPerPlayer: 20 })

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Generador de Equipos
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Seleccioná a los 10 jugadores de hoy para balancear los equipos según su rendimiento histórico o reciente.
        </p>
      </div>

      <TeamGenerator players={stats} recentPlayers={stats20} />
    </main>
  )
}
