import { cn } from '@/lib/utils'

type RevealProps = React.ComponentProps<'div'> & {
  delay?: number
  /**
   * Para contenido visible al cargar: entra con una animación CSS, que corre
   * apenas se pinta la página (sin esperar a que hidrate React).
   */
  immediate?: boolean
}

/**
 * Entrada suave para lo que se ve al cargar. Lo que está más abajo aparece sin
 * animación: animar al scrollear competía con el propio scroll y lo trababa.
 */
export function Reveal({ delay = 0, immediate = false, className, style, ...props }: RevealProps) {
  if (!immediate) return <div className={className} style={style} {...props} />

  return <div className={cn('enter', className)} style={{ animationDelay: `${delay}s`, ...style }} {...props} />
}

type StaggerProps = React.ComponentProps<'div'> & { stagger?: number; immediate?: boolean }

/** Contenedor que escalona por CSS la entrada de sus hijos (sólo con `immediate`). */
export function Stagger({ stagger: _stagger, immediate = false, className, ...props }: StaggerProps) {
  return <div className={cn(immediate && 'enter-stagger', className)} {...props} />
}

export function StaggerItem(props: React.ComponentProps<'div'>) {
  return <div {...props} />
}
