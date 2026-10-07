"use client"

import { useEffect, useRef } from 'react'
import { isMotionOff } from '@/components/motion/motion-preference'

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

/** Cuenta hasta el valor cuando entra en pantalla. Pensado para cifras sueltas, no para tablas. */
export default function AnimatedNumber({ value, duration = 900, direction = 'up', decimals = 0, suffix = '', className = '' }: Props) {
  const target = parseNumber(value)
  const ref = useRef<HTMLSpanElement | null>(null)
  const format = (v: number) => (decimals ? v.toFixed(decimals) : String(Math.round(v))) + suffix
  const text = target === null ? String(value) : format(target)

  useEffect(() => {
    const el = ref.current
    if (target === null || target === 0 || !el) return
    if (isMotionOff() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      io.disconnect()

      const start = direction === 'down' ? Math.max(target * 1.5, target + 50) : 0
      const startTime = performance.now()
      const ease = (t: number) => 1 - Math.pow(1 - t, 3)

      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration)
        // Directo al DOM: antes era un setState por frame y React re-renderizaba en pleno scroll.
        el.textContent = format(start + (target - start) * ease(t))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.15 })

    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
      el.textContent = text
    }
    // `format` y `text` se derivan de estas mismas props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, direction, decimals, suffix])

  return <span className={className} ref={ref}>{text}</span>
}
