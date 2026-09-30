'use client'

import { motion, type HTMLMotionProps, type Variants } from 'motion/react'
import { cn } from '@/lib/utils'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

type RevealProps = HTMLMotionProps<'div'> & {
  delay?: number
  y?: number
  /**
   * Para contenido visible al cargar: usa una animación CSS, que corre apenas se
   * pinta la página. Con Motion quedaría invisible hasta que hidrate React, y en
   * un celular con red lenta eso son segundos de pantalla vacía.
   */
  immediate?: boolean
}

/** Aparece con un fade + desplazamiento cuando entra en pantalla. */
export function Reveal({ delay = 0, y = 16, immediate = false, children, ...props }: RevealProps) {
  if (immediate) {
    return (
      <div id={props.id} className={cn('enter', props.className as string | undefined)} style={{ animationDelay: `${delay}s` }}>
        {children as React.ReactNode}
      </div>
    )
  }

  const target = { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: EASE_OUT } }
  return (
    <motion.div initial={{ opacity: 0, y }} whileInView={target} viewport={{ once: true, margin: '-40px' }} {...props}>
      {children}
    </motion.div>
  )
}

const containerVariants: Variants = {
  hidden: {},
  show: (stagger: number = 0.06) => ({ transition: { staggerChildren: stagger } }),
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
}

type StaggerProps = HTMLMotionProps<'div'> & { stagger?: number; immediate?: boolean }

/** Contenedor que escalona la entrada de sus `StaggerItem`. */
export function Stagger({ stagger = 0.06, immediate = false, children, ...props }: StaggerProps) {
  if (immediate) {
    // Igual que Reveal: sin depender de la hidratación. Los hijos se escalonan por CSS.
    return <motion.div className={cn('enter-stagger', props.className as string | undefined)}>{children}</motion.div>
  }

  return (
    <motion.div
      variants={containerVariants}
      custom={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={itemVariants} {...props}>
      {children}
    </motion.div>
  )
}
