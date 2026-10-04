/**
 * Novedades del sitio: cada cambio grande suma una entrada ARRIBA de la lista.
 * Se escriben para los pibes, no para programadores: qué cambia para ellos,
 * sin nombres de archivos ni términos técnicos.
 *
 * Todas aparecen en /novedades (la pestaña de arriba), agrupadas por día. Un
 * puntito en la navbar avisa cuando hay alguna que el visitante todavía no
 * leyó (se recuerda en su navegador por `id`).
 *
 * Las que tienen `popup: true` además salen como pop-up al entrar a la home,
 * una sola vez por visitante: una por pop-up, y al cerrar una se abre la
 * siguiente. Las de más de NOVEDADES_MAX_AGE_DAYS días ya no aparecen solas.
 * Reservarlo para lo realmente grande, que no se vuelva molesto.
 *
 * Para la ilustración del pop-up hay dos opciones:
 * - `{ kind: 'demo', name }`: una demo animada de components/novedades (agregarla
 *   a DEMOS en whats-new-modal.tsx).
 * - `{ kind: 'image', src, alt }`: una captura en /public/novedades.
 */

import { NOVEDAD_CARTEL_ID } from '@/lib/cartel/tipos'

export type NovedadIcon =
  | 'faceit'
  | 'flame'
  | 'swords'
  | 'scale'
  | 'chart'
  | 'coins'
  | 'wallet'
  | 'trophy'
  | 'sparkles'
  | 'crown'
  | 'history'
  | 'phone'
  | 'wrench'
  | 'image'
  | 'user'
  | 'list'
  | 'medal'
  | 'megaphone'
  | 'shield'
  | 'target'
  | 'heart'

export type NovedadTag =
  | 'Reglas'
  | 'Partidas'
  | 'Estadísticas'
  | 'Temporadas'
  | 'Perfiles'
  | 'FACEIT'
  | 'Generador de equipos'
  | 'Apuestas'
  | 'Cartel'
  | 'Diseño'
  | 'Celular'
  | 'Arreglos'
  | 'Sitio'

export type NovedadDemo = 'team-generator' | 'apuestas' | 'mvp' | 'cartel'

export type Novedad = {
  /** Único y estable: si cambia, todos la vuelven a ver. */
  id: string
  /** Fecha de publicación (YYYY-MM-DD). */
  date: string
  /** Sección del sitio a la que pertenece. */
  tag: NovedadTag
  title: string
  summary: string
  highlights?: { icon: NovedadIcon; text: string }[]
  cta?: { label: string; href: string }
  /** También sale como pop-up en la home. */
  popup?: boolean
  visual?: { kind: 'demo'; name: NovedadDemo } | { kind: 'image'; src: string; alt: string }
}

export const NOVEDADES_MAX_AGE_DAYS = 30

export const NOVEDADES: Novedad[] = [
  {
    id: NOVEDAD_CARTEL_ID,
    date: '2026-10-03',
    tag: 'Cartel',
    title: 'El Cartel: comprate la home',
    summary:
      'Arriba de todo en el inicio hay un cartel. Donás con Mercado Pago y ponés lo que quieras: un mensaje, una foto y a quién va dirigido. Queda ahí hasta que alguien ponga más plata que vos.',
    highlights: [
      { icon: 'target', text: 'Tu mensaje, una foto o GIF y a quién se lo dedicás (sale su cara). Firmás con tu nombre o anónimo.' },
      { icon: 'flame', text: 'Arranca en $10 y cada uno tiene que superar al anterior: el que pone más, te lo saca.' },
      { icon: 'shield', text: 'Si ponés de más, el próximo tiene que superar eso. Cuanto más ponés, más dura tu cartel.' },
      { icon: 'history', text: 'Todos los carteles quedan en el historial: quién lo puso, cuánto y cuánto aguantó arriba.' },
      { icon: 'heart', text: 'La plata es una donación para bancar la página. Si alguien te gana de mano mientras pagás, te la devolvemos.' },
    ],
    cta: { label: 'Ver el cartel', href: '/cartel' },
    popup: true,
    visual: { kind: 'demo', name: 'cartel' },
  },
  {
    id: '2026-10-03-mvp-equipo-ganador',
    date: '2026-10-03',
    tag: 'Reglas',
    title: 'El MVP sale del equipo que ganó',
    summary:
      'Regla nueva: desde la Season 2, el MVP de cada mapa sólo puede ser alguien del equipo ganador. Si perdiste, no sos MVP aunque hayas hecho más daño que todos.',
    highlights: [
      { icon: 'crown', text: 'El MVP es el que mejor jugó del equipo que ganó el mapa (kills, asistencias, muertes y daño).' },
      { icon: 'scale', text: 'Si el mapa termina empatado no hay ganador, y compiten los diez como antes.' },
      { icon: 'history', text: 'Se recalcularon todas las partidas de la Season 2: cambió el MVP en 4 mapas.' },
      { icon: 'trophy', text: 'La Season 1 queda tal cual terminó.' },
    ],
    cta: { label: 'Ver las partidas', href: '/matches' },
    popup: true,
    visual: { kind: 'demo', name: 'mvp' },
  },
  {
    id: '2026-10-03-pestana-novedades',
    date: '2026-10-03',
    tag: 'Sitio',
    title: 'Nueva pestaña: Novedades',
    summary:
      'Esta misma página. Acá va a quedar anotado cada cambio grande del sitio, explicado fácil y con lo más nuevo arriba.',
    highlights: [
      { icon: 'megaphone', text: 'Cuando hay algo que todavía no leíste, aparece un puntito en "Novedades", arriba de todo.' },
      { icon: 'sparkles', text: 'Las más grandes también salen una vez como pop-up al entrar al sitio.' },
    ],
  },
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
    popup: true,
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
    popup: true,
    visual: { kind: 'demo', name: 'team-generator' },
  },
  {
    id: '2026-10-01-faceit',
    date: '2026-10-01',
    tag: 'FACEIT',
    title: 'FACEIT llegó al 10v10',
    summary:
      'Una sección nueva con el FACEIT de todo el grupo: quién tiene más elo, quién viene mejor y cómo le fue a cada uno partida a partida.',
    highlights: [
      { icon: 'chart', text: 'Ranking del grupo por elo, por cómo viene cada uno o por quién juega más.' },
      { icon: 'faceit', text: 'El nivel de cada uno y cuánto le falta para subir al siguiente.' },
      { icon: 'swords', text: 'Gráfico del elo de todos y las partidas que jugaron juntos.' },
      { icon: 'user', text: 'En cada perfil hay una parte de FACEIT, y en el inicio una tablita con el ranking.' },
      { icon: 'history', text: 'El historial queda guardado: si FACEIT anda caído, se ve lo último que había.' },
    ],
    cta: { label: 'Ver FACEIT', href: '/faceit' },
  },
  {
    id: '2026-10-01-fondo-mapas',
    date: '2026-10-01',
    tag: 'Diseño',
    title: 'El sitio se viste de CS2',
    summary:
      'De fondo ahora van pasando los mapas de CS2 (Dust 2, Mirage, Inferno, Ancient, Nuke y más), con un movimiento suave que acompaña el scroll y el mouse.',
    highlights: [
      { icon: 'image', text: 'Nueve mapas que se van turnando con un fundido.' },
      { icon: 'list', text: 'También se sumaron las fotitos de Cache, Train y Vertigo en las partidas.' },
      { icon: 'phone', text: 'Si tenés activado "reducir movimiento" en el celu o la compu, el fondo se queda quieto.' },
    ],
  },
  {
    id: '2026-10-01-menuda-mierda',
    date: '2026-10-01',
    tag: 'Perfiles',
    title: 'Badge nuevo: 💩 Menuda mierda',
    summary: 'Hay un badge nuevo en los perfiles. Por ahora tiene un solo dueño: Tiky.',
  },
  {
    id: '2026-09-30-season-2',
    date: '2026-09-30',
    tag: 'Temporadas',
    title: 'Arrancó la Season 2',
    summary:
      'Todos arrancan de cero. La Season 1 quedó guardada tal cual terminó, con su campeón, la tabla final y los récords.',
    highlights: [
      { icon: 'sparkles', text: 'Ranking, récords, Nelsons y Fakasos nuevos para la Season 2.' },
      { icon: 'trophy', text: 'En "Temporadas" está el archivo de la Season 1: podio, campeón, tabla final, Nelson y Fakasos.' },
      { icon: 'list', text: 'Las partidas y el Hall of Fame se pueden filtrar por temporada.' },
    ],
    cta: { label: 'Ver las temporadas', href: '/temporadas' },
  },
  {
    id: '2026-09-30-inicio-renovado',
    date: '2026-09-30',
    tag: 'Estadísticas',
    title: 'Inicio renovado',
    summary: 'La página principal tiene un ranking nuevo y más cosas para chusmear.',
    highlights: [
      { icon: 'medal', text: 'Medallas para el top 3, barra de KDA y una flechita que muestra si subiste o bajaste.' },
      { icon: 'swords', text: 'Duelos por el puesto: quién está a punto de pasar a quién.' },
      { icon: 'trophy', text: 'Récords de la temporada (y los de la Season 1, para batirlos).' },
      { icon: 'sparkles', text: 'Animaciones en todo el sitio.' },
    ],
    cta: { label: 'Ir al inicio', href: '/' },
  },
  {
    id: '2026-09-30-perfil-por-temporada',
    date: '2026-09-30',
    tag: 'Perfiles',
    title: 'Tu perfil, temporada por temporada',
    summary:
      'En el perfil de cada jugador hay pestañas para ver la Season 2, la Season 1 o toda la carrera, y una tabla que compara una temporada con la otra.',
  },
  {
    id: '2026-09-30-ranking-primera-partida',
    date: '2026-09-30',
    tag: 'Reglas',
    title: 'Contás en el ranking desde la primera partida',
    summary:
      'No hay partidas de clasificación: apenas jugás tu primera partida de la temporada ya aparecés en el ranking.',
  },
  {
    id: '2026-09-30-taka-bieler',
    date: '2026-09-30',
    tag: 'Perfiles',
    title: 'Bienvenido, Taka Bieler',
    summary:
      '"Sergio Vergara" ahora es Taka Bieler y juega desde la Season 2. Sus 3 partidas de invitado de la Season 1 aparecen como "Invitado" y no cuentan para nada, así la Season 1 queda igual.',
  },
  {
    id: '2026-09-30-celular',
    date: '2026-09-30',
    tag: 'Celular',
    title: 'Mejor en el celu',
    summary: 'Varias pantallas se acomodan mejor en el teléfono.',
    highlights: [
      { icon: 'phone', text: 'Cargar o editar una partida es más cómodo: cada jugador en una fila y con teclado numérico.' },
      { icon: 'list', text: 'Las tablas de las partidas son más compactas y se leen sin hacer zoom.' },
      { icon: 'sparkles', text: 'Las ventanas (cargar partida, votar el Nelson, fotos) siempre quedan arriba de todo.' },
    ],
  },
  {
    id: '2026-09-30-arreglos',
    date: '2026-09-30',
    tag: 'Arreglos',
    title: 'Arreglos varios',
    summary: 'Cosas que andaban mal y ya no.',
    highlights: [
      { icon: 'wrench', text: 'Editar la fecha de una partida la corría 3 horas.' },
      { icon: 'wrench', text: 'El tabulador de la última partida a veces daba vuelta el resultado.' },
      { icon: 'wrench', text: 'Con muchas partidas cargadas, las nuevas podían no aparecer.' },
      { icon: 'wrench', text: 'Una partida recién cargada ahora aparece al toque, sin esperar.' },
    ],
  },
  {
    id: '2026-09-05-ladder-30-partidas',
    date: '2026-09-05',
    tag: 'Estadísticas',
    title: 'El ranking "reciente" mira las últimas 30 partidas',
    summary:
      'Antes miraba los últimos 30 días y, si no jugábamos seguido, quedaba vacío. Ahora usa las últimas 30 partidas jugadas.',
    highlights: [
      { icon: 'image', text: 'Se sacó la sección de videos para no gastar el espacio gratis del sitio.' },
    ],
  },
]

/** Las que salen como pop-up en la home. */
export const NOVEDADES_POPUP = NOVEDADES.filter((n) => n.popup)
