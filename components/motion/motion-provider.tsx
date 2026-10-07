'use client'

import { useSyncExternalStore } from 'react'
import { MotionConfig, MotionGlobalConfig } from 'motion/react'
import { MOTION_CHANGE_EVENT, MOTION_STORAGE_KEY, isMotionOff } from './motion-preference'

// Antes del primer render: si el script del <head> ya marcó el modo liviano,
// las animaciones de Motion saltan directo al estado final.
MotionGlobalConfig.skipAnimations = isMotionOff()

function subscribe(onChange: () => void) {
  window.addEventListener(MOTION_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(MOTION_CHANGE_EVENT, onChange)
}

/** true = animaciones prendidas. */
export function useMotionEnabled() {
  return useSyncExternalStore(subscribe, () => !isMotionOff(), () => true)
}

export function setMotionEnabled(enabled: boolean) {
  if (enabled) delete document.documentElement.dataset.motion
  else document.documentElement.dataset.motion = 'off'
  MotionGlobalConfig.skipAnimations = !enabled
  try {
    if (enabled) localStorage.removeItem(MOTION_STORAGE_KEY)
    else localStorage.setItem(MOTION_STORAGE_KEY, 'off')
  } catch {
    // sin storage: vale sólo para esta visita
  }
  window.dispatchEvent(new Event(MOTION_CHANGE_EVENT))
}

/** Respeta "reducir movimiento" del sistema operativo y el modo liviano del sitio. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const enabled = useMotionEnabled()
  return <MotionConfig reducedMotion={enabled ? 'user' : 'always'}>{children}</MotionConfig>
}
