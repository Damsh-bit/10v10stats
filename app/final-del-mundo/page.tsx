import { FinalMundialHero } from '@/components/final-mundial/final-mundial-hero'
import { ExpectationsWall } from '@/components/final-mundial/expectations-wall'

export const revalidate = 60

export const metadata = {
  title: 'Super Final del Mundo — 10v10 Stats',
  description: 'Próximamente, 29 de agosto. Un antes y un después para la página de estadísticas de ALZ.',
}

export default function FinalDelMundoPage() {
  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="page-container py-6 sm:py-8">
        <FinalMundialHero />
        <ExpectationsWall />
      </div>
    </main>
  )
}
