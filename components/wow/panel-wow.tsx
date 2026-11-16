'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DiaWow } from '@/lib/wow'
import s from './wow.module.css'

/* ───────── Datos y formato ───────── */

// Colores de clase (los mismos que usa el juego para los nombres)
const COLOR_CLASE: Record<string, string> = {
  WARRIOR: '#C69B6D', PALADIN: '#F48CBA', HUNTER: '#AAD372', ROGUE: '#FFF468', PRIEST: '#FFFFFF',
  DEATHKNIGHT: '#C41E3A', SHAMAN: '#0070DD', MAGE: '#3FC7EB', WARLOCK: '#8788EE', MONK: '#00FF98',
  DRUID: '#FF7C0A', DEMONHUNTER: '#A330C9', EVOKER: '#33937F',
}
const COLOR_RESERVA = ['#3FC7EB', '#FF7C0A', '#AAD372', '#F48CBA', '#8788EE', '#FFF468']
const CLASES: Record<string, string> = {
  WARRIOR: 'Guerrero', PALADIN: 'Paladín', HUNTER: 'Cazador', ROGUE: 'Pícaro', PRIEST: 'Sacerdote',
  SHAMAN: 'Chamán', MAGE: 'Mago', WARLOCK: 'Brujo', DRUID: 'Druida', DEATHKNIGHT: 'Caballero de la Muerte',
  MONK: 'Monje', DEMONHUNTER: 'Cazador de demonios', EVOKER: 'Evocador',
}
const LIMITE_POR_DEFECTO = 6 * 3600
const PERIODOS = [
  { dias: 7, boton: 'Semana', texto: 'la semana' },
  { dias: 30, boton: 'Mes', texto: 'el mes' },
  { dias: 90, boton: '3 meses', texto: 'los últimos 3 meses' },
] as const

function fmtH(seg: number) {
  seg = Math.max(0, Math.round(seg || 0))
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
/** El "día" del addon empieza a las 6 AM. */
function claveDia(d = new Date()) {
  const x = new Date(d.getTime() - 6 * 3600e3)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
function diasHacia(n: number) {
  const out: string[] = []
  const hoy = new Date(claveDia() + 'T12:00:00')
  for (let i = n - 1; i >= 0; i--) out.push(claveDia(new Date(hoy.getTime() - i * 864e5 + 6 * 3600e3)))
  return out
}
const fechaCorta = (d: string) => {
  const [, m, dd] = d.split('-')
  return `${+dd}/${+m}`
}
const fechaLarga = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
const esc = (t: unknown) =>
  String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
function aclarar(hex: string, k = 0.45) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(v + (255 - v) * k)
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
}

/** Datos inventados, sólo para ver cómo queda con /wow?demo. */
function datosEjemplo(): DiaWow[] {
  const gente: [string, string, string, number, number][] = [
    ['Thalindra', 'SHAMAN', 'Truenazo', 5.2, 14], ['Borgrim', 'MAGE', 'Escarcha', 7.5, 18],
    ['Kaelen', 'PRIEST', 'Luzbella', 4.6, 13], ['Mirelle', 'WARRIOR', 'Rompehuesos', 3.8, 11],
  ]
  const out: (DiaWow & { nv0: number })[] = []
  diasHacia(90).forEach((dia, i) =>
    gente.forEach(([persona, clase, personaje, prom, nv0], k) => {
      const r = Math.sin(i * 1.7 + k * 3.1) * 0.5 + Math.cos(i * 0.6 + k) * 0.5
      if (r < -0.75) return
      out.push({ persona, dia, segundos: Math.max(0, Math.round((prom + r * 2.2) * 3600)), nivel: 0,
        personaje, clase, limite: LIMITE_POR_DEFECTO, actualizado: null, nv0 })
    }),
  )
  const acum: Record<string, number> = {}
  out.sort((a, b) => a.dia.localeCompare(b.dia)).forEach((f) => {
    acum[f.persona] = (acum[f.persona] || 0) + f.segundos / 3600
    f.nivel = Math.min(60, f.nv0 + Math.floor(acum[f.persona] / 14))
  })
  return out
}

/* ───────── Gráfico de líneas con tooltip (ocupa todo el alto disponible) ───────── */

type Serie = { nombre: string; color: string; valores: (number | null)[] }
type OpcionesGrafico = {
  fmtY: (v: number) => string | number
  fmtTip: (v: number) => string
  refY?: number
  refTxt?: string
  enteros?: boolean
}

function dibujarGrafico(el: HTMLDivElement, id: string, dias: string[], series: Serie[], o: OpcionesGrafico) {
  el.innerHTML = ''
  const W = Math.max(260, el.clientWidth)
  const H = Math.max(110, el.clientHeight || 240)
  const m = { l: 40, r: 12, t: 12, b: 22 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  let maxV = Math.max(o.refY || 0, ...series.flatMap((se) => se.valores.filter((v): v is number => v != null)), 1)
  const paso = o.enteros ? Math.max(1, Math.ceil(maxV / 4)) : Math.ceil(maxV / 4 / 3600) * 3600 || 3600
  maxV = paso * 4
  const x = (i: number) => m.l + (dias.length === 1 ? iw / 2 : (i * iw) / (dias.length - 1))
  const y = (v: number) => m.t + ih - (v / maxV) * ih
  const tinta = '#a8946c'
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Gráfico" font-family="Arial Narrow, Arial, sans-serif">`
  svg += `<defs><filter id="brillo-${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
  for (let k = 0; k <= 4; k++) {
    const yy = y(paso * k)
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}" stroke="${k ? 'rgba(255,209,0,.08)' : 'rgba(201,160,74,.45)'}" stroke-width="1"/>`
    svg += `<text x="${m.l - 7}" y="${yy + 4}" text-anchor="end" font-size="11" fill="${tinta}">${o.fmtY(paso * k)}</text>`
  }
  const cadaX = Math.ceil(dias.length / Math.max(1, Math.floor(iw / 50)))
  dias.forEach((d, i) => {
    if (i % cadaX === 0 || i === dias.length - 1) {
      const anchor = i === dias.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'
      svg += `<text x="${x(i)}" y="${H - 5}" text-anchor="${anchor}" font-size="11" fill="${tinta}">${fechaCorta(d)}</text>`
    }
  })
  if (o.refY) {
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(o.refY)}" y2="${y(o.refY)}" stroke="#e23a2a" stroke-width="1.2" stroke-dasharray="5 4"/>`
    svg += `<text x="${m.l + 6}" y="${y(o.refY) - 6}" font-size="11.5" font-weight="700" fill="#ff6b5b" stroke="#120d09" stroke-width="3" paint-order="stroke">${esc(o.refTxt)}</text>`
  }
  series.forEach((se) => {
    let d = ''
    let abierto = false
    se.valores.forEach((v, i) => {
      if (v == null) { abierto = false; return }
      d += `${abierto ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
      abierto = true
    })
    svg += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" filter="url(#brillo-${id})"/>`
    const ui = se.valores.length - 1
    const ultimo = se.valores[ui]
    if (ultimo != null) svg += `<circle cx="${x(ui)}" cy="${y(ultimo)}" r="4.5" fill="${se.color}" stroke="#000" stroke-width="1.5"/>`
  })
  svg += `<g data-hover style="display:none"><line data-cruz y1="${m.t}" y2="${m.t + ih}" stroke="rgba(255,209,0,.45)" stroke-width="1"/>`
  series.forEach((se, k) => (svg += `<circle data-hp="${k}" r="4.5" fill="${se.color}" stroke="#000" stroke-width="1.5"/>`))
  svg += `</g><rect x="${m.l}" y="0" width="${iw}" height="${H}" fill="transparent"/></svg><div class="${s.tip}"></div>`
  el.innerHTML = svg

  const nodo = el.querySelector('svg')!
  const g = el.querySelector<SVGGElement>('[data-hover]')!
  const cruz = el.querySelector<SVGLineElement>('[data-cruz]')!
  const tip = el.querySelector<HTMLDivElement>(`.${s.tip}`)!
  const mover = (ev: PointerEvent) => {
    const r = nodo.getBoundingClientRect()
    const px = (ev.clientX - r.left) * (W / r.width)
    const i = Math.max(0, Math.min(dias.length - 1, Math.round(((px - m.l) / iw) * (dias.length - 1))))
    g.style.display = ''
    cruz.setAttribute('x1', String(x(i)))
    cruz.setAttribute('x2', String(x(i)))
    series.forEach((se, k) => {
      const c = el.querySelector<SVGCircleElement>(`[data-hp="${k}"]`)!
      const v = se.valores[i]
      c.style.display = v == null ? 'none' : ''
      if (v != null) { c.setAttribute('cx', String(x(i))); c.setAttribute('cy', String(y(v))) }
    })
    const orden = series.map((se) => ({ se, v: se.valores[i] })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1))
    tip.innerHTML = `<div class="f">${fechaLarga(dias[i])}</div>` + orden
      .map(({ se, v }) => `<div class="r"><span style="color:${se.color}">${esc(se.nombre)}</span><b>${v == null ? '—' : o.fmtTip(v)}</b></div>`)
      .join('')
    tip.style.display = 'block'
    const left = (x(i) / W) * r.width
    const tw = tip.offsetWidth
    tip.style.left = Math.min(r.width - tw, Math.max(0, left + (left > r.width / 2 ? -tw - 14 : 14))) + 'px'
    tip.style.top = '6px'
  }
  nodo.addEventListener('pointermove', mover)
  nodo.addEventListener('pointerdown', mover)
  nodo.addEventListener('pointerleave', () => { g.style.display = 'none'; tip.style.display = 'none' })
}

function Grafico({ id, dias, series, opciones }: { id: string; dias: string[]; series: Serie[]; opciones: OpcionesGrafico }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let espera: ReturnType<typeof setTimeout>
    const dibujar = () => dibujarGrafico(el, id, dias, series, opciones)
    dibujar()
    const obs = new ResizeObserver(() => { clearTimeout(espera); espera = setTimeout(dibujar, 100) })
    obs.observe(el)
    return () => { obs.disconnect(); clearTimeout(espera) }
  }, [id, dias, series, opciones])
  return <div ref={ref} className={s.grafico} />
}

/* ───────── Panel ───────── */

export function PanelWow({ filas: filasServidor }: { filas: DiaWow[] }) {
  const raizRef = useRef<HTMLDivElement>(null)
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>(PERIODOS[0])
  const [demo, setDemo] = useState(false)
  const [hoy, setHoy] = useState<string | null>(null)

  // La fecha y el modo demo dependen del navegador: se resuelven al montar.
  useEffect(() => {
    setHoy(claveDia())
    setDemo(new URLSearchParams(window.location.search).has('demo'))
  }, [])

  // Que el panel ocupe justo lo que queda de pantalla debajo del menú.
  useLayoutEffect(() => {
    const el = raizRef.current
    if (!el) return
    const ajustar = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      el.style.setProperty('--alto-wow', `${Math.max(520, window.innerHeight - top)}px`)
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [])

  const filas = useMemo(() => (demo ? datosEjemplo() : filasServidor), [demo, filasServidor])
  const personas = useMemo(() => [...new Set(filas.map((f) => f.persona))].sort((a, b) => a.localeCompare(b, 'es')), [filas])

  const ultimaFila = useMemo(() => {
    const u: Record<string, DiaWow> = {}
    for (const f of filas) u[f.persona] = f
    return u
  }, [filas])

  const nivelHasta = (p: string, hasta?: string) => {
    let nv = 0
    for (const f of filas) if (f.persona === p && (!hasta || f.dia <= hasta)) nv = Math.max(nv, f.nivel || 0)
    return nv
  }

  // Cada uno toma el color de su clase; si dos comparten clase, el segundo usa uno de reserva.
  const colores = useMemo(() => {
    const out: Record<string, string> = {}
    const usados = new Set<string>()
    let r = 0
    for (const p of personas) {
      let c = COLOR_CLASE[ultimaFila[p]?.clase ?? '']
      if (!c || usados.has(c)) {
        do { c = COLOR_RESERVA[r++ % COLOR_RESERVA.length] } while (usados.has(c) && r < 20)
      }
      usados.add(c)
      out[p] = c
    }
    return out
  }, [personas, ultimaFila])

  const mapa = useMemo(() => {
    const m: Record<string, DiaWow> = {}
    for (const f of filas) m[`${f.persona}|${f.dia}`] = f
    return m
  }, [filas])

  const limite = filas.find((f) => f.limite)?.limite || LIMITE_POR_DEFECTO
  const dias = useMemo(() => (hoy ? diasHacia(periodo.dias) : []), [hoy, periodo])

  const seriesHoras = useMemo<Serie[]>(
    () => personas.map((p) => ({ nombre: p, color: colores[p], valores: dias.map((d) => mapa[`${p}|${d}`]?.segundos ?? 0) })),
    [personas, colores, dias, mapa],
  )
  const seriesNivel = useMemo<Serie[]>(
    () => personas.map((p) => ({ nombre: p, color: colores[p], valores: dias.map((d) => nivelHasta(p, d) || null) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personas, colores, dias, filas],
  )
  const opcionesHoras = useMemo<OpcionesGrafico>(
    () => ({ fmtY: (v) => `${v / 3600}h`, fmtTip: fmtH, refY: limite, refTxt: `Límite ${fmtH(limite)}` }),
    [limite],
  )
  const opcionesNivel = useMemo<OpcionesGrafico>(() => ({ fmtY: (v) => v, fmtTip: (v) => `Nivel ${v}`, enteros: true }), [])

  const totales = personas
    .map((p) => {
      const mias = dias.map((d) => mapa[`${p}|${d}`]).filter(Boolean)
      const total = mias.reduce((a, f) => a + f.segundos, 0)
      const pasados = mias.filter((f) => f.segundos > (f.limite || limite)).length
      const nvIni = (dias[0] && nivelHasta(p, dias[0])) || mias[0]?.nivel || 0
      const nvFin = nivelHasta(p)
      return { p, total, prom: dias.length ? total / dias.length : 0, pasados, sube: nvFin - nvIni, nvFin }
    })
    .sort((a, b) => b.total - a.total)

  const ultimaActualizacion = filas.reduce((a, f) => (f.actualizado && f.actualizado > a ? f.actualizado : a), '')
  const fechaHoy = hoy ? fechaLarga(hoy) : ''

  const leyenda = (
    <div className={s.leyenda}>
      {personas.map((p) => (
        <span key={p} style={{ color: colores[p] }}>
          <span className={s.punto} style={{ background: colores[p] }} />
          {p}
        </span>
      ))}
    </div>
  )

  return (
    <div className={s.raiz}>
      <main ref={raizRef} className={s.app}>
        <header className={s.cab}>
          <div className={s.marca}>
            <h1 className={s.titulo}>Tiempo de Juego</h1>
            <span className={s.fecha}>{fechaHoy && fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)}</span>
          </div>
          {demo && <span className={s.chip}>Datos de ejemplo</span>}
          {!demo && filas.length === 0 && <span className={s.chip}>Todavía nadie subió datos</span>}
          <div className={s.filtros} role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button key={p.dias} type="button" className={s.boton} aria-pressed={p.dias === periodo.dias} onClick={() => setPeriodo(p)}>
                {p.boton}
              </button>
            ))}
          </div>
        </header>

        <section className={s.tarjetas} aria-label="Hoy">
          {hoy && personas.length === 0 && <p className={s.vacio}>Todavía no hay aventureros registrados.</p>}
          {hoy && personas.map((p) => {
            const f = mapa[`${p}|${hoy}`]
            const ult = ultimaFila[p]
            const seg = f?.segundos ?? 0
            const lim = f?.limite || ult?.limite || LIMITE_POR_DEFECTO
            const quedan = lim - seg
            const segSem = diasHacia(7).reduce((a, d) => a + (mapa[`${p}|${d}`]?.segundos ?? 0), 0)
            const pct = Math.min(1, seg / lim)
            let fondo: string
            let estado: React.ReactNode
            if (quedan <= 0) { fondo = 'linear-gradient(180deg,#e23a2a,#8e0b0b)'; estado = <>☠ <b>+{fmtH(-quedan)}</b> pasado</> }
            else if (quedan <= 3600) { fondo = 'linear-gradient(180deg,#f2c94c,#b07a06)'; estado = <>⚠ quedan <b>{fmtH(quedan)}</b></> }
            else { fondo = 'linear-gradient(180deg,#3fd23f,#127a12)'; estado = <>✔ quedan <b>{fmtH(quedan)}</b></> }
            const c = colores[p]
            const meta = [ult?.personaje, CLASES[ult?.clase ?? '']].filter(Boolean).join(' · ')
            return (
              <article key={p} className={`${s.marco} ${s.unidad}`}>
                <div className={s.retrato} style={{ '--c': c, '--c-claro': aclarar(c) } as React.CSSProperties}>
                  {(p[0] || '?').toUpperCase()}
                  <span className={s.nivel} title="Nivel">{nivelHasta(p)}</span>
                </div>
                <div className={s.info}>
                  <div className={s.filaNombre}>
                    <div className={s.nombre} style={{ color: c }}>{p}</div>
                    <div className={s.estado}>{estado}</div>
                  </div>
                  <div className={s.meta}>{meta || ' '}</div>
                  <div className={s.barra} role="progressbar" aria-label="Tiempo jugado hoy" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className={s.lleno} style={{ width: `${pct * 100}%`, background: fondo }} />
                    <div className={s.textoBarra}>Hoy {fmtH(seg)} / {fmtH(lim)}</div>
                  </div>
                  <div className={`${s.barra} ${s.fina}`} title="Esta semana">
                    <div className={s.lleno} style={{ width: `${Math.min(1, segSem / (lim * 7)) * 100}%`, background: 'linear-gradient(180deg,#4f8ff0,#1442a0)' }} />
                    <div className={s.textoBarra}>Semana {fmtH(segSem)}</div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <div className={s.cuerpo}>
          <section className={s.marco}>
            <div className={s.cabPanel}>
              <h2 className={s.h2}>Horas por día · {periodo.texto}</h2>
              {leyenda}
            </div>
            <Grafico id="horas" dias={dias} series={seriesHoras} opciones={opcionesHoras} />
          </section>
          <div className={s.lateral}>
            <section className={s.marco}>
              <div className={s.cabPanel}>
                <h2 className={s.h2}>Nivel</h2>
                {leyenda}
              </div>
              <Grafico id="nivel" dias={dias} series={seriesNivel} opciones={opcionesNivel} />
            </section>
            <section className={s.marco}>
              <div className={s.cabPanel}><h2 className={s.h2}>Totales de {periodo.texto}</h2></div>
              <table className={s.tabla}>
                <thead>
                  <tr><th>Aventurero</th><th className={s.n}>Total</th><th className={s.n}>Prom/día</th><th className={s.n}>Días pasado</th><th className={s.n}>Nivel</th></tr>
                </thead>
                <tbody>
                  {totales.map((t) => (
                    <tr key={t.p}>
                      <td style={{ color: colores[t.p], textShadow: '0 1px 0 #000' }}>{t.p}</td>
                      <td className={s.n}>{fmtH(t.total)}</td>
                      <td className={s.n}>{fmtH(t.prom)}</td>
                      <td className={s.n}>{t.pasados}</td>
                      <td className={s.n}>{t.nvFin}{t.sube > 0 && <> <span className={s.sube}>+{t.sube}</span></>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>

        <footer className={s.pie}>
          {ultimaActualizacion && `Última actualización: ${new Date(ultimaActualizacion).toLocaleString('es-AR')} · `}
          Los datos llegan cuando cada uno cierra el juego.
        </footer>
      </main>
    </div>
  )
}
