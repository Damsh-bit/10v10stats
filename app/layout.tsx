import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono, Oswald } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/navbar'
import { MapBackdrop } from '@/components/layout/map-backdrop'
import { RecommendationsWidget } from '@/components/shared/recommendations-widget'
import { CuriositiesBanner } from '@/components/shared/curiosities-banner'
import { MotionProvider } from '@/components/motion/motion-provider'
import { ProgressIndicator } from '@/components/amicro/progress-indicator'
import { getCurrentSeason, getSeasons } from '@/lib/seasons'
import { getApuestasConfig } from '@/lib/apuestas/config'
import { SpeedInsights } from "@vercel/speed-insights/next"
import pkg from '../package.json'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: '10v10 STATS — Season 2',
  description:
    '10v10 STATS — ladder, récords y estadísticas de las partidas 10v10 de CS2. Arrancó la Season 2.',
  generator: 'v0.app',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#01385f',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const seasons = await getSeasons()
  const currentSeason = getCurrentSeason(seasons)

  return (
    <html
      lang="es"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${oswald.variable} bg-background`}
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <MotionProvider>
          <ProgressIndicator color="bg-brand" height={2} />
          <MapBackdrop />
          <Navbar seasonNumber={currentSeason.id} apuestas={getApuestasConfig().visibles} />
          <CuriositiesBanner />
          <div className="flex-1">{children}</div>
          <footer className="flex flex-col items-center justify-center gap-2 border-t border-border bg-background/80 py-8 text-sm text-muted-foreground backdrop-blur-md">
            <p className="flex items-center justify-center gap-1.5">
              Desarrollado con <span className="text-rose-500">❤️</span> por
              <span className="font-heading font-bold uppercase tracking-widest text-brand">
                Papi y Tutu
              </span>
            </p>
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest opacity-50">
              <Link href="/temporadas" className="transition-colors hover:text-foreground">
                {currentSeason.name.toUpperCase()}
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/novedades" className="uppercase transition-colors hover:text-foreground">
                Novedades
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/cartel" className="uppercase transition-colors hover:text-foreground">
                El cartel
              </Link>
              <span aria-hidden="true">·</span>
              <span title="Versión de la aplicación">v{pkg.version}</span>
            </p>
          </footer>
          <RecommendationsWidget />
        </MotionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <SpeedInsights />
      </body>
    </html>
  )
}
