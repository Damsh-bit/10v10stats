/**
 * Transición de entrada en cada navegación (template se remonta por ruta).
 * Es CSS a propósito: no depende de que cargue el JavaScript para mostrarse.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
