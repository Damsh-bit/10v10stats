"use client"

import { useEffect, useRef, useState } from 'react'

type Props = {
  value: number | string
  duration?: number
  direction?: 'up' | 'down'
  decimals?: number
  suffix?: string
  className?: string
}

function parseNumber(v: number | string) {
  if (typeof v === 'number') return v
  const n = Number(String(v).replace(/[^0-9.-]+/g, ''))
  return Number.isFinite(n) ? n : null
}

export default function AnimatedNumber({ value, duration = 900, direction = 'up', decimals = 0, suffix = '', className = '' }: Props) {
  const target = parseNumber(value)
  const [display, setDisplay] = useState<string>(() => (target === null ? String(value) : (decimals ? target.toFixed(decimals) : String(Math.round(target)))) )
  const ref = useRef<HTMLSpanElement | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (target === null) return
    setDisplay(decimals ? target.toFixed(decimals) : String(Math.round(target)))
  }, [value, decimals, target])

  useEffect(() => {
    if (target === null) return
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = direction === 'down' ? Math.max(target * 1.5, target + 50) : 0
          const end = target
          const startTime = performance.now()

          const ease = (t: number) => 1 - Math.pow(1 - t, 3)

          const frame = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(1, elapsed / duration)
            const v = start + (end - start) * ease(t)
            const formatted = decimals ? v.toFixed(decimals) : String(Math.round(v))
            setDisplay(formatted)
            if (t < 1) requestAnimationFrame(frame)
          }

          requestAnimationFrame(frame)
        }
      })
    }, { threshold: 0.15 })

    io.observe(el)
    return () => io.disconnect()
  }, [target, duration, direction, decimals])

  if (target === null) return <span className={className} ref={ref}>{String(value)}</span>

  return (
    <span className={className} ref={ref}>{display}{suffix}</span>
  )
}
