'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Dices } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { Insight } from '@/lib/insights'

interface CuriositiesBannerProps {
  initialInsights?: Insight[]
}

export function CuriositiesBanner({ initialInsights }: CuriositiesBannerProps) {
  const [insights, setInsights] = useState<Insight[]>(initialInsights || [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(initialInsights ? false : true)

  useEffect(() => {
    if (initialInsights && initialInsights.length > 0) {
      setInsights(initialInsights)
      setLoading(false)
      return
    }

    let isMounted = true
    async function loadInsights() {
      try {
        const res = await fetch('/api/insights')
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data.insights && data.insights.length > 0) {
            setInsights(data.insights)
          }
        }
      } catch (err) {
        console.error('Failed to load insights:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadInsights()
    return () => {
      isMounted = false
    }
  }, [initialInsights])

  const changeIndex = useCallback(
    (newIndex: number) => {
      if (insights.length === 0) return
      setCurrentIndex((newIndex + insights.length) % insights.length)
    },
    [insights.length]
  )

  const nextInsight = useCallback(() => {
    changeIndex(currentIndex + 1)
  }, [changeIndex, currentIndex])

  const prevInsight = useCallback(() => {
    changeIndex(currentIndex - 1)
  }, [changeIndex, currentIndex])

  const randomInsight = useCallback(() => {
    if (insights.length <= 1) return
    let randomIndex = Math.floor(Math.random() * insights.length)
    if (randomIndex === currentIndex) {
      randomIndex = (currentIndex + 1) % insights.length
    }
    changeIndex(randomIndex)
  }, [changeIndex, currentIndex, insights.length])

  // Auto slide effect
  useEffect(() => {
    if (isPaused || insights.length <= 1) return
    const timer = setInterval(() => {
      nextInsight()
    }, 7500)
    return () => clearInterval(timer)
  }, [isPaused, insights.length, nextInsight])

  if (loading || insights.length === 0) {
    return null
  }

  const current = insights[currentIndex]

  return (
    <div
      className="relative z-40 w-full border-b border-border/50 bg-gradient-to-r from-[#950c42]/10 via-background to-emerald-500/10 backdrop-blur-md transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top micro glowing line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#950c42] via-amber-500/50 to-emerald-500" />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm">
        {/* Left Badge */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand border border-primary/20 shadow-sm">
            <span className="animate-pulse">{current.icon || '💡'}</span>
            <span className="hidden sm:inline">Dato curioso</span>
            <span className="sm:hidden">Dato</span>
          </span>
          {current.scope && (
            <span className="hidden rounded-full border border-amber-300/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90 sm:inline">
              {current.scope}
            </span>
          )}
        </div>

        {/* Center Content */}
        <div className="flex flex-1 items-center justify-center overflow-hidden text-center min-h-[24px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="line-clamp-2 font-normal leading-tight text-foreground/90 sm:line-clamp-1"
              dangerouslySetInnerHTML={{ __html: current.highlightedText || current.text }}
            />
          </AnimatePresence>
        </div>

        {/* Right Controls */}
        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden md:inline-block text-[10px] text-muted-foreground mr-1 font-mono">
            {currentIndex + 1}/{insights.length}
          </span>

          <button
            onClick={randomInsight}
            title="Otra curiosidad aleatoria (🎲)"
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-amber-400 transition-colors"
            aria-label="Dato aleatorio"
          >
            <Dices className="h-3.5 w-3.5" />
            <span className="hidden lg:inline text-[11px]">Azar</span>
          </button>

          <div className="flex items-center border-l border-border/40 pl-1 ml-0.5">
            <button
              onClick={prevInsight}
              title="Anterior"
              className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={nextInsight}
              title="Siguiente"
              className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
