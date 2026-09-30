'use client'

import { MotionConfig } from 'motion/react'

/** Respeta "reducir movimiento" del sistema operativo en todas las animaciones. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
