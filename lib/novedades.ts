/**
 * Novedades del sitio: cada cambio grande suma una entrada ARRIBA de la lista.
 *
 * Al entrar a la home, cada visitante ve una sola vez las novedades que todavía
 * no vio (se recuerda en su navegador por `id`): una por pop-up, y al cerrar
 * una se abre la siguiente. Las de más de
 * NOVEDADES_MAX_AGE_DAYS días ya no aparecen solas, pero se pueden volver a
 * abrir desde "Novedades" en el pie de página.
 *
 * Para la ilustración hay dos opciones:
 * - `{ kind: 'demo', name }`: una demo animada de components/novedades (agregarla
 *   a DEMOS en whats-new-modal.tsx).
 * - `{ kind: 'image', src, alt }`: una captura en /public/novedades.
 */

export type NovedadIcon = 'faceit' | 'flame' | 'swords' | 'scale' | 'chart' | 'coins' | 'wallet' | 'trophy' | 'sparkles'

export type NovedadDemo = 'team-generator' | 'apuestas'

export type Novedad = {
  /** Único y estable: si cambia, todos la vuelven a ver. */
  id: string
  /** Fecha de publicación (YYYY-MM-DD). */
  date: string
  /** Sección del sitio a la que pertenece. */
  tag: string
  title: string
  summary: string
  highlights: { icon: NovedadIcon; text: string }[]
  cta: { label: string; href: string }
  visual?: { kind: 'demo'; name: NovedadDemo } | { kind: 'image'; src: string; alt: string }
}

export const NOVEDADES_MAX_AGE_DAYS = 30

export const NOVEDADES: Novedad[] = [
  {
    id: '2026-10-01-apuestas',
    date: '2026-10-01',
    tag: 'Apuestas',
    title: 'Llegaron las apuestas',
    summary:
      'Con los equipos armados en el generador abrís las apuestas: quedan congelados con sus chances y cada uno entra al pozo o desafía a un rival. Para entrar, pedile tu PIN a la banca.',
    highlights: [
      { icon: 'coins', text: 'Pozo por equipos: ponés en el tuyo y los que le pegan se reparten todo.' },
      { icon: 'swords', text: 'Duelos 1v1 con otro de la partida: quién gana o quién juega mejor.' },
      { icon: 'scale', text: 'Cuotas justas con las chances del generador: en los duelos, el favorito pone más.' },
      { icon: 'wallet', text: 'Pagás con Mercado Pago, y si la apuesta se anula la plata vuelve sola.' },
      { icon: 'trophy', text: 'Al cargar la partida se liquida sola y la banca te pasa el premio a tu alias.' },
    ],
    cta: { label: 'Ver las apuestas', href: '/apuestas' },
    visual: { kind: 'demo', name: 'apuestas' },
  },
  {
    id: '2026-10-01-generador-equipos',
    date: '2026-10-01',
    tag: 'Generador de equipos',
    title: 'Equipos más parejos que nunca',
    summary:
      'El generador ahora cruza el nivel de FACEIT de cada uno con su rendimiento en el 10v10 y cómo viene en las últimas partidas. Prueba las 126 combinaciones posibles y se queda con la más pareja.',
    highlights: [
      { icon: 'faceit', text: 'Nivel de FACEIT al lado de cada jugador, y vos elegís cuánto pesa.' },
      { icon: 'flame', text: 'Al que viene ganando lo junta con el que viene perdiendo.' },
      { icon: 'swords', text: 'Duelos por posición: % de que cada uno rinda más que su rival directo.' },
      { icon: 'scale', text: 'Chance de ganar de cada equipo y por qué quedó balanceado.' },
    ],
    cta: { label: 'Ir al generador', href: '/creacion-de-equipos' },
    visual: { kind: 'demo', name: 'team-generator' },
  },
]
