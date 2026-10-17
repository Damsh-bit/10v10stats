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
  | 'zap'

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

export type NovedadDemo = 'team-generator' | 'apuestas' | 'mvp' | 'cartel' | 'modo-liviano' | 'perfil' | 'xplay'

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
    // Id nuevo: la primera versión anunciaba el sitio a todo lo ancho, que se volvió atrás.
    id: '2026-10-17-zonas-segun-jugadores',
    date: '2026-10-17',
    tag: 'Estadísticas',
    title: 'Las zonas de la ladder se ajustan a cuántos somos',
    summary:
      'Ahora que somos menos, las zonas de la tabla se arman según cuántos hay en la ladder, así ninguna queda vacía ni la de abajo es más grande que la de arriba.',
    highlights: [
      { icon: 'crown', text: 'Hoy somos 10: del 1 al 3 top globales (oro, plata y bronce) y del 4 al 7 empujan pero la tienen corta.' },
      { icon: 'shield', text: 'El 8 y el 9 en peligro de descenso, y el último solo en la vergüenza del servidor.' },
      { icon: 'list', text: 'Si la tabla vuelve a crecer, se acomodan solas: con 12 o más son dos en la vergüenza, y con 15 vuelve la zona de promoción.' },
    ],
    cta: { label: 'Ver la ladder', href: '/' },
  },
  {
    id: '2026-10-17-temporada-sin-depresivos',
    date: '2026-10-17',
    tag: 'Temporadas',
    title: 'Comienza una nueva temporada sin depresivos',
    summary:
      'Arriba de todo en la home hay un banner nuevo para festejar que arrancamos la temporada sin Tiky y Foco. Con fotos y todo.',
    highlights: [
      { icon: 'sparkles', text: 'Ahora 100% libre de bajón: se terminó el "para qué juego si siempre pierdo".' },
    ],
    cta: { label: 'Ver el banner', href: '/' },
  },
  {
    id: '2026-10-17-homenaje-qepd',
    date: '2026-10-17',
    tag: 'Estadísticas',
    title: 'Homenaje QEPD: Tiky y Foco',
    summary:
      'Tiky y Foco ya no juegan más: salieron de la ladder y en la home tienen su apartado de homenaje, en blanco y negro, con las cifras de toda su carrera.',
    highlights: [
      { icon: 'heart', text: 'Se fueron como vivieron: muriendo primero. Que en paz descansen.' },
      { icon: 'history', text: 'Sus partidas siguen contando en los récords y en sus perfiles, y en la Season 1 siguen en la tabla final.' },
    ],
    cta: { label: 'Ir al homenaje', href: '/' },
  },
  {
    id: '2026-10-15-ronda-bisagra',
    date: '2026-10-15',
    tag: 'Partidas',
    title: 'La ronda bisagra',
    summary:
      'En las rondas de cada partida ahora ves cómo iban las chances de ganar de cada equipo, ronda por ronda, y cuál fue la ronda que dio vuelta la partida.',
    highlights: [
      { icon: 'zap', text: 'La ronda bisagra queda marcada con un rayo: desde ahí el que ganó ya no soltó el favoritismo.' },
      { icon: 'chart', text: 'Las chances salen del marcador y de lo que compró cada equipo (un full contra un eco casi siempre gana).' },
      { icon: 'list', text: 'Tocá cualquier ronda del gráfico para ver cómo cambiaron las chances y qué pasó.' },
    ],
    cta: { label: 'Ver las partidas', href: '/matches' },
  },
  {
    id: '2026-10-15-xplay',
    date: '2026-10-15',
    tag: 'Partidas',
    title: 'Las partidas ahora vienen de Xplay',
    summary:
      'Cada partida se carga con el link de Xplay y trae todo: la tabla completa, ronda por ronda, cada kill y el replay 2D. Y en tu perfil, tus duelos contra cada uno.',
    highlights: [
      { icon: 'swords', text: 'Duelos: cuántas veces mató cada uno a cada rival. En tu perfil, tu víctima favorita, tu verdugo y contra quién perdés más.' },
      { icon: 'list', text: 'Ronda por ronda: quién la ganó y cómo, qué compró cada equipo y quién mató a quién.' },
      { icon: 'chart', text: 'Tabla completa: rating, ADR, KAST, HS% real, aperturas, clutches, granadas y hasta gallinas.' },
      { icon: 'target', text: 'Replay 2D de cada partida y la demo para bajar. Las de la Season 2 ya están cargadas.' },
    ],
    cta: { label: 'Ver las partidas', href: '/matches' },
    popup: true,
    visual: { kind: 'demo', name: 'xplay' },
  },
  {
    // Id nuevo: la primera versión decía que el KDA se recuperaba al volver.
    id: '2026-10-13-ladder-strikes-2',
    date: '2026-10-13',
    tag: 'Reglas',
    title: 'Strikes: si faltás, bajás',
    summary:
      'Regla nueva en la ladder: si faltás 3 días de partidas seguidos, empezás a perder KDA. Así nadie se queda arriba (o sube) sin jugar.',
    highlights: [
      { icon: 'history', text: 'Cada día de partidas que faltás seguido es un strike. Al lado de tu nombre ves cuántos llevás.' },
      { icon: 'chart', text: 'Desde el 3.er strike, cada día que faltás te saca KDA, y cada vez más: 0.05, después 0.10, después 0.15…' },
      { icon: 'zap', text: 'Si volvés, los strikes vuelven a 0, pero lo que perdiste no vuelve: te lo tenés que ganar jugando.' },
      { icon: 'shield', text: 'Tu KDA real no cambia: el perfil y el generador de equipos lo usan tal cual.' },
    ],
    cta: { label: 'Ver la ladder', href: '/' },
    popup: true,
  },
  {
    id: '2026-10-13-ladder-explicacion',
    date: '2026-10-13',
    tag: 'Estadísticas',
    title: '¿Por qué está arriba tuyo?',
    summary:
      'Tocá "por KDA" arriba de la ladder y se abre cómo se calcula el KDA. Elegí a dos jugadores y te dice por qué uno está arriba del otro.',
    highlights: [
      { icon: 'chart', text: 'KDA = (kills + asistencias) ÷ muertes, sumando todo lo de la temporada.' },
      { icon: 'swords', text: 'Te dice si el de arriba hace más kills, muere menos o las dos cosas.' },
      { icon: 'target', text: 'Y cuántas kills o asistencias te faltan para pasarlo.' },
    ],
    cta: { label: 'Ver la ladder', href: '/' },
  },
  {
    id: '2026-10-08-cartel-varios',
    date: '2026-10-08',
    tag: 'Cartel',
    title: 'El cartel ahora se le puede dedicar a varios',
    summary:
      'Ya no hace falta elegir a uno solo: en "¿Para quién?" marcá a todos los que quieras bardear y salen todas sus caras en el cartel.',
    highlights: [
      { icon: 'target', text: 'Tocá a cada jugador para sumarlo o sacarlo de la dedicatoria.' },
      { icon: 'image', text: 'Si no subís foto, el cartel arma un collage con las caras de todos.' },
      { icon: 'list', text: 'En "Los más bardeados" a cada uno le cuenta el cartel.' },
    ],
    cta: { label: 'Ver el cartel', href: '/cartel' },
  },
  {
    id: '2026-10-07-perfil-jugador',
    date: '2026-10-07',
    tag: 'Perfiles',
    title: 'Perfiles mucho más completos',
    summary:
      'El perfil de cada jugador ahora tiene pestañas con todo: forma reciente, curiosidades, mapas, compañeros y rivales, mejores marcas y FACEIT. Y le podés dejar un me gusta o una recomendación anónima.',
    highlights: [
      { icon: 'user', text: 'Todo se puede ver por temporada o de toda la carrera.' },
      { icon: 'sparkles', text: 'Curiosidades: su día y su mapa favorito, con quién gana más, su némesis y su estilo de juego.' },
      { icon: 'swords', text: 'Compañeros y rivales: con quién le va mejor en el equipo y a quién le tiene tomada la mano.' },
      { icon: 'heart', text: 'Me gusta y recomendaciones anónimas. Si una se zarpa, con 3 reportes se oculta sola.' },
    ],
    cta: { label: 'Elegí un jugador', href: '/' },
    popup: true,
    visual: { kind: 'demo', name: 'perfil' },
  },
  {
    id: '2026-10-07-sitio-fluido',
    date: '2026-10-07',
    tag: 'Sitio',
    title: 'El sitio anda más fluido',
    summary:
      'Sacamos las animaciones que más pesaban y el scroll quedó mucho más suave. Y si tu PC igual sufre, ahora podés apagar todas las animaciones con un botón.',
    highlights: [
      { icon: 'zap', text: 'Botón del rayito arriba de todo: apagalo y el sitio queda en modo liviano, sin animaciones.' },
      { icon: 'chart', text: 'El fondo de mapas ya no se mueve con el scroll y las tablas aparecen al toque.' },
      { icon: 'sparkles', text: 'Se acuerda de tu elección la próxima vez que entres.' },
    ],
    popup: true,
    visual: { kind: 'demo', name: 'modo-liviano' },
  },
  {
    id: '2026-10-03-zonas-ladder',
    date: '2026-10-03',
    tag: 'Estadísticas',
    title: 'La ladder ahora tiene zonas',
    summary: 'Como en una liga: según tu puesto en la temporada quedás en una zona, cada una con su color.',
    highlights: [
      { icon: 'crown', text: 'Del 1 al 3: Top globales, en dorado.' },
      { icon: 'medal', text: 'El 4: en promoción a top globales.' },
      { icon: 'scale', text: 'Del 5 al 9: empujan pero la tienen corta.' },
      { icon: 'shield', text: 'El 10: en peligro de descenso.' },
      { icon: 'target', text: 'Del 11 para abajo: la vergüenza del servidor.' },
    ],
    cta: { label: 'Ver la ladder', href: '/' },
  },
  {
    id: '2026-10-03-top-donadores',
    date: '2026-10-03',
    tag: 'Cartel',
    title: 'Top donadores en el inicio',
    summary: 'Abajo del cartel ahora están los que más plata pusieron, con medalla para los tres primeros.',
    cta: { label: 'Ver el ranking', href: '/cartel' },
  },
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
