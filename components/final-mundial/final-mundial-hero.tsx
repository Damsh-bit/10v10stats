'use client'

import { useEffect, useState } from 'react'

export function FinalMundialHero() {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 via-card to-card px-4 py-10 text-center shadow-[0_0_40px_-10px_rgba(250,204,21,0.35)] sm:py-14">
      <div className="cs-grid pointer-events-none absolute inset-0 opacity-20" />

      {!revealed ? (
        <div className="relative flex flex-col items-center gap-4 animate-pulse">
          <div className="h-4 w-40 rounded-full bg-yellow-500/20" />
          <div className="h-10 w-72 max-w-full rounded-lg bg-yellow-500/25" />
          <div className="h-10 w-56 max-w-full rounded-lg bg-yellow-500/25" />
          <div className="mt-2 h-3 w-80 max-w-full rounded-full bg-yellow-500/15" />
          <div className="h-3 w-64 max-w-full rounded-full bg-yellow-500/15" />
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-3">
          <span
            className="fade-in-up font-heading text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-400 opacity-0"
            style={{ animationDelay: '0ms' }}
          >
            🏆 Super Final del Mundo
          </span>
          <h1
            className="fade-in-up text-gold-glow font-heading text-3xl font-black uppercase tracking-wide text-yellow-300 opacity-0 sm:text-5xl"
            style={{ animationDelay: '150ms' }}
          >
            Próximamente
          </h1>
          <p
            className="fade-in-up text-gold-glow font-heading text-2xl font-black uppercase tracking-wide text-yellow-300 opacity-0 sm:text-4xl"
            style={{ animationDelay: '300ms' }}
          >
            29 de Agosto
          </p>
          <p
            className="fade-in-up mt-1 max-w-md text-sm font-medium text-yellow-100/80 opacity-0 sm:text-base"
            style={{ animationDelay: '450ms' }}
          >
            Un antes y un después para la página de estadísticas de ALZ
          </p>
        </div>
      )}
    </section>
  )
}
