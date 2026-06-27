import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Oswald } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { RecommendationsWidget } from '@/components/recommendations-widget'
import { SpeedInsights } from "@vercel/speed-insights/next"

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
  title: '10v10 STATS — CS2 Match Tracker',
  description:
    '10v10 STATS — track your CS2 10v10 match stats, leaderboards, the Nelson League and player highlights.',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${oswald.variable} bg-background`}
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-border bg-background py-8 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5">
            Desarrollado con <span className="text-rose-500">❤️</span> por
            <span className="font-heading font-bold uppercase tracking-widest text-primary">
              Papi y Tutu
            </span>
          </p>
        </footer>
        <RecommendationsWidget />
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <SpeedInsights />
      </body>
    </html>
  )
}
