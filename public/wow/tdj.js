/* Tiempo de Juego — panel web (sin dependencias).
 * Lo usan tiempo-de-juego.vercel.app y alzstats.pro/wow:
 *   TDJ.iniciar(elemento, { fuente: "/api/datos", datos: [...filas iniciales opcionales] })
 * "?demo" en la URL muestra datos inventados.
 */
(function () {
  "use strict";

  /* ───────── Constantes ───────── */
  const COLOR_CLASE = { WARRIOR: "#C69B6D", PALADIN: "#F48CBA", HUNTER: "#AAD372", ROGUE: "#FFF468", PRIEST: "#FFFFFF",
    DEATHKNIGHT: "#C41E3A", SHAMAN: "#0070DD", MAGE: "#3FC7EB", WARLOCK: "#8788EE", MONK: "#00FF98", DRUID: "#FF7C0A",
    DEMONHUNTER: "#A330C9", EVOKER: "#33937F" };
  const COLOR_RESERVA = ["#3FC7EB", "#FF7C0A", "#AAD372", "#F48CBA", "#8788EE", "#FFF468"];
  const CLASES = { WARRIOR: "Guerrero", PALADIN: "Paladín", HUNTER: "Cazador", ROGUE: "Pícaro", PRIEST: "Sacerdote",
    SHAMAN: "Chamán", MAGE: "Mago", WARLOCK: "Brujo", DRUID: "Druida", DEATHKNIGHT: "Caballero de la Muerte",
    MONK: "Monje", DEMONHUNTER: "Cazador de demonios", EVOKER: "Evocador" };
  const LIMITE_SEMANAL = 42 * 3600;
  const VIVO_MS = 5 * 60e3; // un dato en vivo de hace menos de 5 min = "jugando ahora"
  const PERIODOS = [{ dias: 7, boton: "Semana", texto: "la semana" }, { dias: 30, boton: "Mes", texto: "el mes" },
    { dias: 90, boton: "3 meses", texto: "los últimos 3 meses" }];

  const fmtH = (seg) => {
    seg = Math.max(0, Math.round(seg || 0));
    const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60);
    return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
  };
  const fmtOro = (cobre) => {
    const o = Math.floor((cobre || 0) / 10000), p = Math.floor(((cobre || 0) % 10000) / 100);
    return o ? `${o.toLocaleString("es-AR")}o ${p}p` : `${p}p`;
  };
  const fmtNum = (n) => Math.round(n || 0).toLocaleString("es-AR");

  // Que mostrar en el grafico grande, dia por dia
  const METRICAS = [
    { id: "horas", nombre: "Horas", valor: (f) => f.segundos, tip: fmtH, eje: (v) => `${v / 3600}h`, pasoBase: 3600 },
    { id: "misiones", nombre: "Misiones", valor: (f) => f.misiones, tip: fmtNum, eje: fmtNum },
    { id: "muertes", nombre: "Muertes", valor: (f) => f.muertes, tip: fmtNum, eje: fmtNum },
    { id: "kills", nombre: "Enemigos", valor: (f) => f.kills, tip: fmtNum, eje: fmtNum },
    { id: "oro_ganado", nombre: "Oro ganado", valor: (f) => f.oro_ganado, tip: fmtOro, eje: (v) => `${fmtNum(v / 10000)}o`, pasoBase: 10000 },
    { id: "oro_gastado", nombre: "Oro gastado", valor: (f) => f.oro_gastado, tip: fmtOro, eje: (v) => `${fmtNum(v / 10000)}o`, pasoBase: 10000 },
    { id: "xp", nombre: "Experiencia", valor: (f) => f.xp, tip: (v) => `${fmtNum(v)} XP`, eje: (v) => (v >= 1000 ? `${fmtNum(v / 1000)}k` : fmtNum(v)) },
    { id: "nivel", nombre: "Nivel", acumulado: true, tip: (v) => `Nivel ${v}`, eje: fmtNum },
  ];

  /* ───────── Fechas: el dia arranca a las 6 AM y la semana el lunes ───────── */
  const pad = (n) => String(n).padStart(2, "0");
  const claveDia = (d = new Date()) => {
    const x = new Date(d.getTime() - 6 * 3600e3);
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  };
  const fecha = (clave) => new Date(clave + "T12:00:00");
  const sumarDias = (clave, n) => { const d = fecha(clave); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const semanaDe = (clave) => sumarDias(clave, -((fecha(clave).getDay() + 6) % 7));
  const diasHacia = (n) => { const hoy = claveDia(), out = []; for (let i = n - 1; i >= 0; i--) out.push(sumarDias(hoy, -i)); return out; };
  const fechaCorta = (c) => { const [, m, d] = c.split("-"); return `${+d}/${+m}`; };
  const fechaLarga = (c) => fecha(c).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const aclarar = (hex, k = 0.45) => {
    const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(v + (255 - v) * k);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };

  /* ───────── Logros (se calculan con los datos de cada uno) ───────── */
  const ORO = 10000;
  const LOGROS = [
    { id: "disciplina", icono: "🛡️", nombre: "Disciplina de hierro", desc: "Cerrar una semana sin pasarse del límite (jugando al menos 10 h)" },
    { id: "racha", icono: "🔥", nombre: "Racha de 7", desc: "Jugar 7 días seguidos" },
    { id: "maraton", icono: "⏳", nombre: "Maratón", desc: "Jugar 8 horas en un día" },
    { id: "misionero", icono: "📜", nombre: "Misionero", desc: "Completar 20 misiones en un día" },
    { id: "carnicero", icono: "⚔️", nombre: "Carnicero", desc: "Derrotar 300 enemigos en un día" },
    { id: "inmortal", icono: "✨", nombre: "Inmortal", desc: "Jugar 3 horas en un día sin morir" },
    { id: "kamikaze", icono: "💀", nombre: "Kamikaze", desc: "Morir 10 veces en un día" },
    { id: "bolsillo", icono: "💰", nombre: "Bolsillo lleno", desc: "Ganar 100 de oro en un día" },
    { id: "derrochador", icono: "🛒", nombre: "Derrochador", desc: "Gastar 100 de oro en un día" },
    { id: "subidon", icono: "⭐", nombre: "Subidón", desc: "Subir 3 niveles en un día" },
    { id: "centenario", icono: "🏆", nombre: "Centenario", desc: "Sumar 100 horas de juego" },
    { id: "maximo", icono: "👑", nombre: "Nivel máximo", desc: "Llegar a nivel 60" },
  ];

  function calcularLogros(filas, personas) {
    const hoy = claveDia(), semanaActual = semanaDe(hoy);
    const out = {}; // id -> [{ persona, dia }]
    LOGROS.forEach((l) => (out[l.id] = []));
    for (const p of personas) {
      const mias = filas.filter((f) => f.persona === p).sort((a, b) => a.dia.localeCompare(b.dia));
      const logro = {};
      const marcar = (id, dia) => { if (!logro[id]) logro[id] = dia; };
      let total = 0, racha = 0, diaAnterior = null, nivelAnterior = 0;
      const semanas = {};
      for (const f of mias) {
        const v2 = (f.limite_semanal || 0) > 0;
        total += f.segundos || 0;
        if (f.segundos >= 8 * 3600) marcar("maraton", f.dia);
        if (f.misiones >= 20) marcar("misionero", f.dia);
        if (f.kills >= 300) marcar("carnicero", f.dia);
        if (v2 && f.segundos >= 3 * 3600 && !f.muertes) marcar("inmortal", f.dia);
        if (f.muertes >= 10) marcar("kamikaze", f.dia);
        if (f.oro_ganado >= 100 * ORO) marcar("bolsillo", f.dia);
        if (f.oro_gastado >= 100 * ORO) marcar("derrochador", f.dia);
        if (nivelAnterior > 0 && f.nivel - nivelAnterior >= 3) marcar("subidon", f.dia);
        if (f.nivel >= 60) marcar("maximo", f.dia);
        if (total >= 100 * 3600) marcar("centenario", f.dia);
        if (f.segundos > 0) {
          racha = diaAnterior && sumarDias(diaAnterior, 1) === f.dia ? racha + 1 : 1;
          diaAnterior = f.dia;
          if (racha >= 7) marcar("racha", f.dia);
        }
        if (f.nivel) nivelAnterior = Math.max(nivelAnterior, f.nivel);
        const s = semanaDe(f.dia);
        semanas[s] = semanas[s] || { seg: 0, lim: 0 };
        semanas[s].seg += f.segundos || 0;
        semanas[s].lim = Math.max(semanas[s].lim, f.limite_semanal || 0);
      }
      for (const [s, w] of Object.entries(semanas)) {
        if (s < semanaActual && w.lim > 0 && w.seg >= 10 * 3600 && w.seg <= w.lim) marcar("disciplina", sumarDias(s, 6));
      }
      for (const [id, dia] of Object.entries(logro)) out[id].push({ persona: p, dia });
    }
    return out;
  }

  /* ───────── Datos de ejemplo (?demo) ───────── */
  function datosEjemplo() {
    const gente = [["Thalindra", "SHAMAN", "Truenazo", 5.6, 14], ["Borgrim", "MAGE", "Escarcha", 7.2, 18],
      ["Kaelen", "PRIEST", "Luzbella", 4.4, 13], ["Mirelle", "WARRIOR", "Rompehuesos", 3.6, 11]];
    const out = [], acum = {}, hoy = claveDia();
    diasHacia(90).forEach((dia, i) => gente.forEach(([persona, clase, personaje, prom, nv0], k) => {
      const r = Math.sin(i * 1.7 + k * 3.1) * 0.5 + Math.cos(i * 0.6 + k) * 0.5;
      if (r < -0.75) return;
      const h = Math.max(0.2, prom + r * 2.4), seg = Math.round(h * 3600);
      acum[persona] = (acum[persona] || 0) + h;
      const ruido = (s) => 0.6 + 0.8 * Math.abs(Math.sin(i * s + k));
      out.push({ persona, dia, segundos: seg, nivel: Math.min(60, nv0 + Math.floor(acum[persona] / 14)), personaje, clase,
        limite_semanal: LIMITE_SEMANAL, misiones: Math.round(h * 2.6 * ruido(1.3)), muertes: Math.round(h * 0.5 * ruido(2.1)),
        kills: Math.round(h * 38 * ruido(0.7)), oro_ganado: Math.round(h * 14 * ORO * ruido(1.1)),
        oro_gastado: Math.round(h * 9 * ORO * ruido(1.9)), xp: Math.round(h * 9000 * ruido(0.9)),
        actualizado: null, en_vivo: dia === hoy && k === 1 ? new Date().toISOString() : null,
        visto: dia === hoy && k !== 1 ? new Date(Date.now() - [40, 0, 200, 1560][k] * 60e3).toISOString() : null });
    }));
    return out;
  }

  /* ───────── Grafico de lineas con tooltip ───────── */
  function pasoLindo(maxV, base) {
    const crudo = maxV / 4 / (base || 1);
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(crudo, 1e-9))));
    const n = [1, 2, 5, 10].find((m) => m * mag >= crudo) * mag;
    return Math.max(1, Math.ceil(n)) * (base || 1);
  }

  function dibujarGrafico(el, dias, series, m) {
    el.innerHTML = "";
    const W = Math.max(260, el.clientWidth), H = Math.max(120, el.clientHeight || 240);
    const mg = { l: 46, r: 12, t: 12, b: 22 }, iw = W - mg.l - mg.r, ih = H - mg.t - mg.b;
    const ref = m.ref || 0;
    let maxV = Math.max(ref, ...series.flatMap((s) => s.valores.filter((v) => v != null)), 1);
    const paso = m.id === "horas" ? Math.ceil(maxV / 4 / 3600) * 3600 : pasoLindo(maxV, m.pasoBase);
    maxV = paso * 4;
    const x = (i) => mg.l + (dias.length === 1 ? iw / 2 : (i * iw) / (dias.length - 1));
    const y = (v) => mg.t + ih - (v / maxV) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(m.nombre)} por día" font-family="Arial Narrow, Arial, sans-serif">`;
    s += `<defs><filter id="tdj-brillo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    for (let k = 0; k <= 4; k++) {
      const yy = y(paso * k);
      s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${yy}" y2="${yy}" stroke="${k ? "rgba(255,209,0,.08)" : "rgba(201,160,74,.45)"}"/>`;
      s += `<text x="${mg.l - 7}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#a8946c">${m.eje(paso * k)}</text>`;
    }
    const cada = Math.ceil(dias.length / Math.max(1, Math.floor(iw / 50)));
    dias.forEach((d, i) => {
      if (i % cada === 0 || i === dias.length - 1)
        s += `<text x="${x(i)}" y="${H - 5}" text-anchor="${i === dias.length - 1 ? "end" : i === 0 ? "start" : "middle"}" font-size="11" fill="#a8946c">${fechaCorta(d)}</text>`;
    });
    if (ref) {
      s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${y(ref)}" y2="${y(ref)}" stroke="#e23a2a" stroke-width="1.2" stroke-dasharray="5 4"/>`;
      s += `<text x="${mg.l + 6}" y="${y(ref) - 6}" font-size="11.5" font-weight="700" fill="#ff6b5b" stroke="#120d09" stroke-width="3" paint-order="stroke">${esc(m.refTxt)}</text>`;
    }
    series.forEach((se) => {
      let d = "", abierto = false;
      se.valores.forEach((v, i) => {
        if (v == null) { abierto = false; return; }
        d += `${abierto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; abierto = true;
      });
      s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" filter="url(#tdj-brillo)"/>`;
      const ui = se.valores.length - 1;
      if (se.valores[ui] != null) s += `<circle cx="${x(ui)}" cy="${y(se.valores[ui])}" r="4.5" fill="${se.color}" stroke="#000" stroke-width="1.5"/>`;
    });
    s += `<g data-hover style="display:none"><line data-cruz y1="${mg.t}" y2="${mg.t + ih}" stroke="rgba(255,209,0,.45)"/>`;
    series.forEach((se, k) => (s += `<circle data-hp="${k}" r="4.5" fill="${se.color}" stroke="#000" stroke-width="1.5"/>`));
    s += `</g><rect x="${mg.l}" y="0" width="${iw}" height="${H}" fill="transparent"/></svg><div class="tip"></div>`;
    el.innerHTML = s;

    const svg = el.querySelector("svg"), g = el.querySelector("[data-hover]"), cruz = el.querySelector("[data-cruz]"), tip = el.querySelector(".tip");
    const mover = (ev) => {
      const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(dias.length - 1, Math.round(((px - mg.l) / iw) * (dias.length - 1))));
      g.style.display = ""; cruz.setAttribute("x1", x(i)); cruz.setAttribute("x2", x(i));
      series.forEach((se, k) => {
        const c = el.querySelector(`[data-hp="${k}"]`), v = se.valores[i];
        c.style.display = v == null ? "none" : ""; if (v != null) { c.setAttribute("cx", x(i)); c.setAttribute("cy", y(v)); }
      });
      const orden = series.map((se) => ({ se, v: se.valores[i] })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
      tip.innerHTML = `<div class="f">${fechaLarga(dias[i])}</div>` + orden.map(({ se, v }) =>
        `<div class="r"><span style="color:${se.color}">${esc(se.nombre)}</span><b>${v == null ? "—" : m.tip(v)}</b></div>`).join("");
      tip.style.display = "block";
      const left = (x(i) / W) * r.width, tw = tip.offsetWidth;
      tip.style.left = Math.min(r.width - tw, Math.max(0, left + (left > r.width / 2 ? -tw - 14 : 14))) + "px";
      tip.style.top = "6px";
    };
    svg.addEventListener("pointermove", mover);
    svg.addEventListener("pointerdown", mover);
    svg.addEventListener("pointerleave", () => { g.style.display = "none"; tip.style.display = "none"; });

    // Las lineas "se dibujan" cuando cambiaste lo que mirabas (no en cada refresco)
    if (m.animar && !sinMovimiento()) {
      el.querySelectorAll("path[filter]").forEach((p, k) => {
        const largo = Math.ceil(p.getTotalLength());
        p.style.setProperty("--largo", largo);
        p.style.strokeDasharray = `${largo}`;
        p.style.animation = `tdj-dibujar 0.9s cubic-bezier(.25,.8,.25,1) ${k * 0.08}s backwards`;
      });
    }
  }

  // Modo liviano de alzstats o "reducir movimiento" del sistema: sin animaciones
  function sinMovimiento() {
    return document.documentElement.dataset.motion === "off" ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // Cuenta un numero hacia arriba (solo en la primera carga)
  function contar(el, hasta, formato) {
    if (sinMovimiento() || !hasta) { el.textContent = formato(hasta); return; }
    const t0 = performance.now(), dur = 900;
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = formato(hasta * e);
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
    setTimeout(() => (el.textContent = formato(hasta)), dur + 150);
  }

  /* Mientras alguien juega, el subidor manda una estimacion de hoy (segundos_vivo).
     Si es reciente y mayor que lo guardado, se muestra esa (con "~"). */
  function normalizar(filas) {
    return filas.map((f) => {
      const vivo = f.en_vivo && Date.now() - Date.parse(f.en_vivo) < VIVO_MS && (f.segundos_vivo || 0) > (f.segundos || 0);
      return vivo ? { ...f, segundos: f.segundos_vivo, estimado: true } : f;
    });
  }

  /* ───────── Panel ───────── */
  const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];
  const NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const NIVEL_MAX = 60;

  function iniciar(app, opciones = {}) {
    const st = { filas: normalizar(opciones.datos || []), periodo: PERIODOS[0], metrica: METRICAS[0], vista: "cronica",
      demo: new URLSearchParams(location.search).has("demo"), primera: true };
    if (st.demo) st.filas = datosEjemplo();

    app.innerHTML = `
      <header class="cab">
        <div class="marca"><h1>Tiempo de Juego</h1><span class="fecha" data-fecha></span></div>
        <span class="chip" data-aviso hidden></span>
        <div class="filtros" role="group" aria-label="Período" data-periodos></div>
      </header>
      <section class="marco carrera" aria-label="La carrera al nivel ${NIVEL_MAX}">
        <div class="carrera-cab"><h2>La carrera al ${NIVEL_MAX}</h2><span class="sub" data-brecha></span></div>
        <div class="pista" data-pista></div>
      </section>
      <section class="tarjetas" data-tarjetas aria-label="Esta semana"></section>
      <div class="cuerpo">
        <section class="marco">
          <div class="cab-panel"><div class="pestanas" role="tablist" aria-label="Qué mostrar" data-metricas></div><div class="leyenda" data-leyenda></div></div>
          <div class="grafico" data-grafico></div>
        </section>
        <section class="marco lateral">
          <div class="cab-panel"><div class="pestanas" role="tablist" aria-label="Panel" data-vistas></div><span class="sub" data-sublateral></span></div>
          <div class="contenido-lateral" data-lateral></div>
        </section>
      </div>
      <footer class="pie" data-pie></footer>`;
    const $ = (sel) => app.querySelector(`[data-${sel}]`);

    // Que el panel ocupe justo lo que queda de pantalla (en alzstats, debajo del menu)
    const ajustarAlto = () => {
      const top = app.getBoundingClientRect().top + window.scrollY;
      app.style.setProperty("--alto-tdj", `${Math.max(600, window.innerHeight - top)}px`);
    };

    const personas = () => [...new Set(st.filas.map((f) => f.persona))].sort((a, b) => a.localeCompare(b, "es"));
    const ultima = (p) => { let u = {}; for (const f of st.filas) if (f.persona === p) u = f; return u; };
    const nivelHasta = (p, hasta) => { let nv = 0; for (const f of st.filas) if (f.persona === p && (!hasta || f.dia <= hasta)) nv = Math.max(nv, f.nivel || 0); return nv; };
    const limSem = (p) => { let l = 0; for (const f of st.filas) if (f.persona === p && f.limite_semanal) l = f.limite_semanal; return l || LIMITE_SEMANAL; };
    const enVivo = (p) => st.filas.some((f) => f.persona === p && f.en_vivo && Date.now() - Date.parse(f.en_vivo) < VIVO_MS);
    const segDe = (p, dia) => { const f = st.filas.find((x) => x.persona === p && x.dia === dia); return f ? f.segundos || 0 : 0; };
    // Ultima vez que se lo vio jugando: el ultimo dato en vivo o el cierre del juego
    const vistoPor = (p) => st.filas.reduce((a, f) => {
      if (f.persona !== p) return a;
      const t = f.visto || f.en_vivo || (f.fuente === "propio" ? f.actualizado : null);
      return t && t > a ? t : a;
    }, "");
    const haceCuanto = (iso) => {
      const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60e3));
      if (min < 1) return "recién";
      if (min < 60) return `hace ${min} min`;
      const h = Math.round(min / 60);
      if (h < 24) return `hace ${h} h`;
      const d = new Date(iso);
      if (h < 48) return `ayer ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
      return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "numeric" });
    };
    // Dias seguidos jugando hasta hoy (o hasta ayer, si hoy todavia no jugo)
    const racha = (p) => {
      let d = claveDia(), n = 0;
      if (!segDe(p, d)) d = sumarDias(d, -1);
      while (segDe(p, d) > 0) { n++; d = sumarDias(d, -1); }
      return n;
    };
    let colores = {};
    const calcularColores = () => {
      colores = {}; const usados = new Set(); let r = 0;
      for (const p of personas()) {
        let c = COLOR_CLASE[ultima(p).clase];
        if (!c || usados.has(c)) { do { c = COLOR_RESERVA[r++ % COLOR_RESERVA.length]; } while (usados.has(c) && r < 20); }
        usados.add(c); colores[p] = c;
      }
    };

    function pintarCabecera() {
      const h = fechaLarga(claveDia());
      $("fecha").textContent = h.charAt(0).toUpperCase() + h.slice(1);
      const aviso = $("aviso");
      aviso.hidden = !(st.demo || !st.filas.length);
      aviso.textContent = st.demo ? "Datos de ejemplo" : "Todavía nadie subió datos";
      $("periodos").innerHTML = PERIODOS.map((p) => `<button type="button" class="boton" data-p="${p.dias}" aria-pressed="${p === st.periodo}">${p.boton}</button>`).join("");
      $("metricas").innerHTML = METRICAS.map((m) => `<button type="button" role="tab" class="pestana" data-m="${m.id}" aria-selected="${m === st.metrica}">${m.nombre}</button>`).join("");
      $("vistas").innerHTML = [["cronica", "Crónica"], ["totales", "Totales"], ["logros", "Logros"]].map(([id, n]) => `<button type="button" role="tab" class="pestana" data-v="${id}" aria-selected="${st.vista === id}">${n}</button>`).join("");
    }

    /* La carrera al 60: cada uno en la pista segun su nivel */
    function pintarCarrera() {
      const gente = personas().map((p) => ({ p, nv: nivelHasta(p), vivo: enVivo(p) })).sort((a, b) => b.nv - a.nv);
      const pista = $("pista");
      if (!gente.length) { pista.innerHTML = ""; $("brecha").textContent = ""; return; }
      const pos = (nv) => Math.max(0, Math.min(1, (nv - 1) / (NIVEL_MAX - 1)));
      // Si dos quedarian encimados (segun el ancho real de la pista), uno va arriba y otro abajo.
      // En el celular solo se ven los retratos, asi que necesitan menos lugar.
      const ancho = Math.max(1, pista.clientWidth), chico = window.innerWidth <= 560;
      const umbral = (chico ? 32 : 104) / ancho;
      const carriles = [];
      gente.forEach((g) => {
        let c = 0;
        while (carriles[c] && carriles[c].some((x) => Math.abs(pos(x) - pos(g.nv)) < umbral)) c++;
        (carriles[c] = carriles[c] || []).push(g.nv);
        g.carril = c % 2 === 0 ? -1 * Math.ceil(c / 2) : Math.ceil(c / 2);
      });
      const arriba = Math.max(0, ...gente.map((g) => -g.carril)), abajo = Math.max(0, ...gente.map((g) => g.carril));
      pista.style.setProperty("--arriba", arriba);
      pista.style.height = `${58 + Math.max(0, arriba - 1) * 22 + Math.max(0, abajo - 1) * 22}px`;
      const marcas = [10, 20, 30, 40, 50, 60].map((n) => `<span class="marca-nivel" style="left:${pos(n) * 100}%">${n}</span>`).join("");
      pista.innerHTML = `<div class="camino"><div class="camino-lleno" style="width:${pos(gente[0].nv) * 100}%"></div>${marcas}</div>` +
        gente.map((g) => {
          const c = colores[g.p];
          return `<div class="corredor${g.vivo ? " vivo" : ""}${pos(g.nv) > 0.8 ? " fin" : ""}" data-x="${pos(g.nv) * 100}" style="--c:${c};--c-claro:${aclarar(c)};--carril:${g.carril}" title="${esc(g.p)}: nivel ${g.nv}">
            <span class="corredor-retrato">${esc((g.p[0] || "?").toUpperCase())}</span><span class="corredor-nombre">${esc(g.p)} <b>${g.nv}</b></span></div>`;
        }).join("");
      const primero = gente[0], ultimo = gente[gente.length - 1], brecha = primero.nv - ultimo.nv;
      $("brecha").innerHTML = gente.length < 2 ? "" : brecha === 0 ? "Van todos parejos" :
        `<b style="color:${colores[primero.p]}">${esc(primero.p)}</b> va adelante · ${brecha} ${brecha === 1 ? "nivel" : "niveles"} de diferencia con <b style="color:${colores[ultimo.p]}">${esc(ultimo.p)}</b>`;
      // Animacion de largada: salen de 0 y corren hasta su nivel (solo la primera vez)
      const corredores = pista.querySelectorAll(".corredor"), lleno = pista.querySelector(".camino-lleno");
      corredores.forEach((el, i) => {
        el.style.left = `${el.dataset.x}%`;
        if (st.primera) { el.classList.add("largada"); el.style.animationDelay = `${0.15 + i * 0.12}s`; }
      });
      if (st.primera) lleno.classList.add("largada");
    }

    function pintarTarjetas() {
      const hoy = claveDia(), semana = semanaDe(hoy), diasSem = [0, 1, 2, 3, 4, 5, 6].map((i) => sumarDias(semana, i));
      const idxHoy = diasSem.indexOf(hoy);
      $("tarjetas").innerHTML = personas().map((p) => {
        const u = ultima(p), f = st.filas.find((x) => x.persona === p && x.dia === hoy) || {};
        const lim = limSem(p), porDia = diasSem.map((d) => segDe(p, d)), sem = porDia.reduce((a, b) => a + b, 0);
        const quedan = lim - sem, pct = Math.min(1, sem / lim), c = colores[p];
        let fondo, estado;
        if (quedan <= 0) { fondo = "linear-gradient(180deg,#e23a2a,#8e0b0b)"; estado = `☠ <b>+${fmtH(-quedan)}</b> pasado`; }
        else if (quedan <= 5 * 3600) { fondo = "linear-gradient(180deg,#f2c94c,#b07a06)"; estado = `⚠ quedan <b>${fmtH(quedan)}</b>`; }
        else { fondo = "linear-gradient(180deg,#3fd23f,#127a12)"; estado = `✔ quedan <b>${fmtH(quedan)}</b>`; }
        const vivo = enVivo(p), visto = vistoPor(p), rac = racha(p);
        const diasJugados = idxHoy + 1, prom = sem / diasJugados;
        // Proyeccion: a este ritmo, ¿cuando llega al limite?
        let proyeccion = "";
        if (quedan > 0 && prom > 0) {
          const faltan = Math.ceil(quedan / prom);
          proyeccion = idxHoy + faltan <= 6
            ? `A este ritmo llega al límite el ${NOMBRE_DIA[fecha(sumarDias(hoy, faltan)).getDay()]}`
            : "A este ritmo no llega al límite";
        } else if (quedan <= 0) proyeccion = "Ya usó toda la semana";
        const maxDia = Math.max(...porDia, 3600);
        const tira = porDia.map((s, i) => `<span class="dia-sem${i === idxHoy ? " hoy" : ""}${i > idxHoy ? " futuro" : ""}" title="${NOMBRE_DIA[fecha(diasSem[i]).getDay()]}: ${fmtH(s)}">
            <i style="height:${Math.max(s ? 12 : 0, (s / maxDia) * 100)}%"></i><em>${DIAS_SEMANA[i]}</em></span>`).join("");
        const meta = [u.personaje, CLASES[u.clase]].filter(Boolean).map(esc).join(", ");
        return `<article class="marco unidad" style="--c:${c};--c-claro:${aclarar(c)}">
          <div class="unidad-cab">
            <div class="retrato${vivo ? " vivo" : ""}">${esc((p[0] || "?").toUpperCase())}<span class="nivel" title="Nivel">${nivelHasta(p)}</span></div>
            <div class="info">
              <div class="fila-nombre"><div class="nombre">${esc(p)}</div><div class="estado">${estado}</div></div>
              <div class="meta">${vivo ? `<span class="en-vivo">● jugando ahora</span>` : (visto ? `<span class="visto" title="${esc(new Date(visto).toLocaleString("es-AR"))}">visto ${haceCuanto(visto)}</span>` : "")}${meta || "&nbsp;"}</div>
            </div>
          </div>
          <div class="barra" role="progressbar" aria-label="Tiempo jugado esta semana" aria-valuenow="${Math.round(pct * 100)}" aria-valuemin="0" aria-valuemax="100">
            <div class="lleno" data-ancho="${pct * 100}" style="width:${pct * 100}%;background:${fondo}"></div>
            <div class="texto">Semana <span data-cuenta="${sem}">${fmtH(sem)}</span> / ${fmtH(lim)}</div>
          </div>
          <div class="unidad-cuerpo">
            <div class="tira" aria-label="Horas por día de esta semana">${tira}</div>
            <dl class="datos">
              <div><dt>Hoy</dt><dd>${f.estimado ? "~" : ""}${fmtH(f.segundos)}${f.estimado ? `<small> en vivo</small>` : ""}</dd></div>
              <div><dt>Promedio</dt><dd>${fmtH(prom)}<small>/día</small></dd></div>
              <div><dt>Racha</dt><dd>${rac} ${rac === 1 ? "día" : "días"}</dd></div>
            </dl>
          </div>
          <div class="proyeccion">${esc(proyeccion)}</div>
          <div class="stats-hoy" title="Hoy: misiones, muertes, enemigos y oro ganado">
            <span>📜 ${fmtNum(f.misiones)}</span><span>💀 ${fmtNum(f.muertes)}</span><span>⚔️ ${fmtNum(f.kills)}</span><span>🪙 ${fmtOro(f.oro_ganado)}</span>
          </div>
        </article>`;
      }).join("") || `<p class="vacio">Todavía no hay aventureros: aparecen cuando alguien con el addon cierra el juego o hace /reload.</p>`;

      // Primera carga: las barras se llenan y las horas cuentan hacia arriba
      if (st.primera && !sinMovimiento()) {
        $("tarjetas").querySelectorAll(".lleno[data-ancho]").forEach((el) => el.classList.add("largada"));
        $("tarjetas").querySelectorAll("[data-cuenta]").forEach((el) => contar(el, +el.dataset.cuenta, fmtH));
      }
    }

    function pintarGrafico(animar) {
      const dias = diasHacia(st.periodo.dias), gente = personas(), m = st.metrica;
      const mapa = {}; st.filas.forEach((f) => (mapa[f.persona + "|" + f.dia] = f));
      const series = gente.map((p) => ({ nombre: p, color: colores[p],
        valores: dias.map((d) => (m.acumulado ? nivelHasta(p, d) || null : (mapa[p + "|" + d] ? m.valor(mapa[p + "|" + d]) || 0 : 0))) }));
      const ritmo = gente.length ? Math.round(Math.max(...gente.map(limSem)) / 7) : 0;
      const opciones = m.id === "horas" ? { ...m, ref: ritmo, refTxt: `Ritmo de ${fmtH(ritmo * 7)} por semana` } : { ...m };
      opciones.animar = animar === true;
      dibujarGrafico($("grafico"), dias, series, opciones);
      $("leyenda").innerHTML = gente.map((p) => `<span style="color:${colores[p]}"><span class="punto" style="background:${colores[p]}"></span>${esc(p)}</span>`).join("");
    }

    /* Cronica: lo que fue pasando, de lo mas nuevo a lo mas viejo */
    function cronica() {
      const gente = personas(), eventos = [];
      for (const p of gente) {
        if (enVivo(p)) {
          const hoy = st.filas.find((f) => f.persona === p && f.dia === claveDia());
          eventos.push({ cuando: new Date().toISOString(), p, icono: "🟢", texto: `está jugando ahora${hoy ? ` (${fmtH(hoy.segundos)} hoy)` : ""}`, vivo: true });
        }
        const mias = st.filas.filter((f) => f.persona === p).sort((a, b) => a.dia.localeCompare(b.dia));
        let nivelAnt = 0;
        const semanas = {};
        for (const f of mias) {
          if (nivelAnt && f.nivel > nivelAnt) eventos.push({ cuando: f.dia, p, icono: "⭐", texto: f.nivel - nivelAnt > 1 ? `subió ${f.nivel - nivelAnt} niveles y llegó al ${f.nivel}` : `llegó a nivel ${f.nivel}` });
          if (f.nivel) nivelAnt = Math.max(nivelAnt, f.nivel);
          if (f.segundos >= 6 * 3600) eventos.push({ cuando: f.dia, p, icono: "⏳", texto: `jugó ${fmtH(f.segundos)} en un día` });
          if (f.muertes >= 8) eventos.push({ cuando: f.dia, p, icono: "💀", texto: `murió ${f.muertes} veces` });
          const s = semanaDe(f.dia), antes = semanas[s] || 0, lim = f.limite_semanal || LIMITE_SEMANAL;
          semanas[s] = antes + (f.segundos || 0);
          if (antes < lim && semanas[s] >= lim) eventos.push({ cuando: f.dia, p, icono: "☠", texto: `se pasó del límite semanal`, malo: true });
        }
      }
      const logros = calcularLogros(st.filas, gente);
      for (const l of LOGROS) for (const q of logros[l.id]) eventos.push({ cuando: q.dia, p: q.persona, icono: l.icono, texto: `desbloqueó «${l.nombre}»` });
      return eventos.sort((a, b) => (b.vivo ? 1 : 0) - (a.vivo ? 1 : 0) || b.cuando.localeCompare(a.cuando)).slice(0, 40);
    }

    function pintarLateral() {
      const gente = personas();
      const lateral = $("lateral");
      lateral.classList.remove("aparece"); lateral.getBoundingClientRect(); lateral.classList.add("aparece");
      if (st.vista === "cronica") {
        const ev = cronica();
        $("sublateral").textContent = "lo último de la hermandad";
        let diaAnt = "";
        lateral.innerHTML = ev.length ? `<ol class="cronica">${ev.map((e) => {
          const dia = e.vivo ? "Ahora" : (() => { const d = e.cuando.slice(0, 10), h = claveDia(); return d === h ? "Hoy" : d === sumarDias(h, -1) ? "Ayer" : fechaLarga(d); })();
          const sep = dia !== diaAnt ? `<li class="cronica-dia">${esc(dia)}</li>` : "";
          diaAnt = dia;
          return `${sep}<li class="cronica-item${e.malo ? " malo" : ""}${e.vivo ? " ahora" : ""}"><span class="cronica-icono" aria-hidden="true">${e.icono}</span><span><b style="color:${colores[e.p]}">${esc(e.p)}</b> ${esc(e.texto)}</span></li>`;
        }).join("")}</ol>` : `<p class="vacio">Acá van a aparecer las subidas de nivel, los logros y quién se pasó del límite.</p>`;
        return;
      }
      if (st.vista === "logros") {
        const logros = calcularLogros(st.filas, gente);
        const hechos = LOGROS.filter((l) => logros[l.id].length).length;
        $("sublateral").textContent = `${hechos} de ${LOGROS.length} desbloqueados`;
        lateral.innerHTML = `<div class="logros">${LOGROS.map((l) => {
          const quienes = logros[l.id].sort((a, b) => a.dia.localeCompare(b.dia));
          return `<div class="logro${quienes.length ? "" : " bloqueado"}" title="${esc(l.desc)}">
            <div class="logro-icono" aria-hidden="true">${l.icono}</div>
            <div class="logro-texto"><div class="logro-nombre">${esc(l.nombre)}</div><div class="logro-desc">${esc(l.desc)}</div>
              <div class="logro-quien">${quienes.length ? quienes.map((q) => `<span style="color:${colores[q.persona]}" title="Desde el ${fechaCorta(q.dia)}">${esc(q.persona)}</span>`).join(" ") : "Nadie todavía"}</div></div>
          </div>`;
        }).join("")}</div>`;
        return;
      }
      const dias = new Set(diasHacia(st.periodo.dias));
      const filasT = gente.map((p) => {
        const mias = st.filas.filter((f) => f.persona === p && dias.has(f.dia));
        const suma = (k) => mias.reduce((a, f) => a + (f[k] || 0), 0);
        const primero = [...dias][0], nvIni = nivelHasta(p, primero) || (mias[0] || {}).nivel || 0, nvFin = nivelHasta(p);
        return { p, seg: suma("segundos"), mis: suma("misiones"), mue: suma("muertes"), kil: suma("kills"),
          og: suma("oro_ganado"), os: suma("oro_gastado"), nvFin, sube: nvFin - nvIni };
      }).sort((a, b) => b.seg - a.seg);
      const maxSeg = Math.max(1, ...filasT.map((t) => t.seg));
      $("sublateral").textContent = `de ${st.periodo.texto}`;
      lateral.innerHTML = `<table class="tabla"><thead><tr><th>Aventurero</th><th class="n">Horas</th><th class="n" title="Misiones">📜</th><th class="n" title="Muertes">💀</th><th class="n" title="Enemigos">⚔️</th><th class="n" title="Oro ganado">🪙 +</th><th class="n" title="Oro gastado">🪙 −</th><th class="n">Nv</th></tr></thead><tbody>${
        filasT.map((t) => `<tr style="--c:${colores[t.p]};--p:${(t.seg / maxSeg) * 100}%"><td class="quien">${esc(t.p)}</td><td class="n">${fmtH(t.seg)}</td><td class="n">${fmtNum(t.mis)}</td><td class="n">${fmtNum(t.mue)}</td><td class="n">${fmtNum(t.kil)}</td><td class="n">${fmtOro(t.og)}</td><td class="n">${fmtOro(t.os)}</td><td class="n">${t.nvFin}${t.sube > 0 ? ` <span class="sube">+${t.sube}</span>` : ""}</td></tr>`).join("")
      }</tbody></table>${gente.length ? recordsHtml(dias) : ""}`;
    }

    function recordsHtml(dias) {
      const delPeriodo = st.filas.filter((f) => dias.has(f.dia));
      const mejor = (k) => delPeriodo.reduce((a, f) => ((f[k] || 0) > ((a && a[k]) || 0) ? f : a), null);
      const items = [["segundos", "Más horas en un día", fmtH], ["misiones", "Más misiones en un día", fmtNum],
        ["kills", "Más enemigos en un día", fmtNum], ["muertes", "Más muertes en un día", fmtNum], ["oro_ganado", "Más oro en un día", fmtOro]]
        .map(([k, t, f]) => { const r = mejor(k); return r ? `<li><span>${t}</span><b style="color:${colores[r.persona]}">${esc(r.persona)}</b><em>${f(r[k])}, ${fechaCorta(r.dia)}</em></li>` : ""; }).join("");
      return items ? `<h3 class="sub-titulo">Récords</h3><ul class="records">${items}</ul>` : "";
    }

    function pintarPie() {
      const ult = st.filas.reduce((a, f) => [f.actualizado, f.en_vivo].reduce((b, t) => (t && t > b ? t : b), a), "");
      $("pie").textContent = (ult ? `Última actualización: ${new Date(ult).toLocaleString("es-AR")}. ` : "") +
        "Mientras juegan, el tiempo de hoy se actualiza cada minuto; el dato exacto llega al cerrar el juego.";
    }

    function pintarTodo() {
      calcularColores(); pintarCabecera(); pintarCarrera(); pintarTarjetas(); pintarLateral(); pintarPie();
      ajustarAlto();
      const animar = st.primera;
      requestAnimationFrame(() => pintarGrafico(animar));
      st.primera = false;
    }

    app.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.p) { st.periodo = PERIODOS.find((p) => p.dias === +b.dataset.p); pintarCabecera(); pintarLateral(); pintarGrafico(true); }
      if (b.dataset.m) { st.metrica = METRICAS.find((m) => m.id === b.dataset.m); pintarCabecera(); pintarGrafico(true); }
      if (b.dataset.v) { st.vista = b.dataset.v; pintarCabecera(); pintarLateral(); }
    });
    let espera;
    window.addEventListener("resize", () => { clearTimeout(espera); espera = setTimeout(() => { ajustarAlto(); pintarGrafico(); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => pintarGrafico());

    async function refrescar() {
      if (st.demo || !opciones.fuente || document.hidden) return;
      try {
        const r = await fetch(opciones.fuente, { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const desde = diasHacia(120)[0];
        st.filas = normalizar((await r.json()).filter((f) => f.dia >= desde));
        pintarTodo();
      } catch (e) {
        if (!st.filas.length) $("fecha").textContent = "No se pudieron cargar los registros (" + e.message + ").";
      }
    }
    pintarTodo();
    if (!opciones.datos || !opciones.datos.length) refrescar();
    setInterval(refrescar, 60e3);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refrescar(); });
  }

  window.TDJ = { iniciar };
})();
