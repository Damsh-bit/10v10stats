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
        actualizado: null, en_vivo: dia === hoy && k === 1 ? new Date().toISOString() : null });
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
  }

  /* ───────── Panel ───────── */
  function iniciar(app, opciones = {}) {
    const st = { filas: opciones.datos || [], periodo: PERIODOS[0], metrica: METRICAS[0], vista: "totales",
      demo: new URLSearchParams(location.search).has("demo") };
    if (st.demo) st.filas = datosEjemplo();

    app.innerHTML = `
      <header class="cab">
        <div class="marca"><h1>Tiempo de Juego</h1><span class="fecha" data-fecha></span></div>
        <span class="chip" data-aviso hidden></span>
        <div class="filtros" role="group" aria-label="Período" data-periodos></div>
      </header>
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
      app.style.setProperty("--alto-tdj", `${Math.max(540, window.innerHeight - top)}px`);
    };

    const personas = () => [...new Set(st.filas.map((f) => f.persona))].sort((a, b) => a.localeCompare(b, "es"));
    const ultima = (p) => { let u = {}; for (const f of st.filas) if (f.persona === p) u = f; return u; };
    const nivelHasta = (p, hasta) => { let nv = 0; for (const f of st.filas) if (f.persona === p && (!hasta || f.dia <= hasta)) nv = Math.max(nv, f.nivel || 0); return nv; };
    const limSem = (p) => { let l = 0; for (const f of st.filas) if (f.persona === p && f.limite_semanal) l = f.limite_semanal; return l || LIMITE_SEMANAL; };
    const enVivo = (p) => st.filas.some((f) => f.persona === p && f.en_vivo && Date.now() - Date.parse(f.en_vivo) < VIVO_MS);
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
      $("vistas").innerHTML = [["totales", "Totales"], ["logros", "Logros"]].map(([id, n]) => `<button type="button" role="tab" class="pestana" data-v="${id}" aria-selected="${st.vista === id}">${n}</button>`).join("");
    }

    function pintarTarjetas() {
      const hoy = claveDia(), semana = semanaDe(hoy);
      $("tarjetas").innerHTML = personas().map((p) => {
        const u = ultima(p), f = st.filas.find((x) => x.persona === p && x.dia === hoy) || {};
        const lim = limSem(p), sem = st.filas.filter((x) => x.persona === p && semanaDe(x.dia) === semana).reduce((a, x) => a + (x.segundos || 0), 0);
        const quedan = lim - sem, pct = Math.min(1, sem / lim), c = colores[p];
        let fondo, estado;
        if (quedan <= 0) { fondo = "linear-gradient(180deg,#e23a2a,#8e0b0b)"; estado = `☠ <b>+${fmtH(-quedan)}</b> pasado`; }
        else if (quedan <= 5 * 3600) { fondo = "linear-gradient(180deg,#f2c94c,#b07a06)"; estado = `⚠ quedan <b>${fmtH(quedan)}</b>`; }
        else { fondo = "linear-gradient(180deg,#3fd23f,#127a12)"; estado = `✔ quedan <b>${fmtH(quedan)}</b>`; }
        const vivo = enVivo(p);
        const meta = [u.personaje, CLASES[u.clase]].filter(Boolean).map(esc).join(" · ");
        return `<article class="marco unidad">
          <div class="retrato${vivo ? " vivo" : ""}" style="--c:${c};--c-claro:${aclarar(c)}">${esc((p[0] || "?").toUpperCase())}<span class="nivel" title="Nivel">${nivelHasta(p)}</span></div>
          <div class="info">
            <div class="fila-nombre"><div class="nombre" style="color:${c}">${esc(p)}</div><div class="estado">${estado}</div></div>
            <div class="meta">${vivo ? `<span class="en-vivo">● jugando ahora</span>` : ""}${meta || "&nbsp;"}</div>
            <div class="barra" role="progressbar" aria-label="Tiempo jugado esta semana" aria-valuenow="${Math.round(pct * 100)}" aria-valuemin="0" aria-valuemax="100">
              <div class="lleno" style="width:${pct * 100}%;background:${fondo}"></div>
              <div class="texto">Semana ${fmtH(sem)} / ${fmtH(lim)}</div>
            </div>
            <div class="barra fina" title="Hoy">
              <div class="lleno" style="width:${Math.min(1, (f.segundos || 0) / (lim / 7)) * 100}%;background:linear-gradient(180deg,#4f8ff0,#1442a0)"></div>
              <div class="texto">Hoy ${fmtH(f.segundos)}</div>
            </div>
            <div class="stats-hoy" title="Hoy: misiones, muertes, enemigos y oro ganado">
              <span>📜 ${fmtNum(f.misiones)}</span><span>💀 ${fmtNum(f.muertes)}</span><span>⚔️ ${fmtNum(f.kills)}</span><span>🪙 ${fmtOro(f.oro_ganado)}</span>
            </div>
          </div>
        </article>`;
      }).join("") || `<p class="vacio">Todavía no hay aventureros registrados.</p>`;
    }

    function pintarGrafico() {
      const dias = diasHacia(st.periodo.dias), gente = personas(), m = st.metrica;
      const mapa = {}; st.filas.forEach((f) => (mapa[f.persona + "|" + f.dia] = f));
      const series = gente.map((p) => ({ nombre: p, color: colores[p],
        valores: dias.map((d) => (m.acumulado ? nivelHasta(p, d) || null : (mapa[p + "|" + d] ? m.valor(mapa[p + "|" + d]) || 0 : 0))) }));
      const ritmo = gente.length ? Math.round(Math.max(...gente.map(limSem)) / 7) : 0;
      dibujarGrafico($("grafico"), dias, series, m.id === "horas" ? { ...m, ref: ritmo, refTxt: `Ritmo de ${fmtH(ritmo * 7)} por semana` } : m);
      $("leyenda").innerHTML = gente.map((p) => `<span style="color:${colores[p]}"><span class="punto" style="background:${colores[p]}"></span>${esc(p)}</span>`).join("");
    }

    function pintarLateral() {
      const gente = personas();
      if (st.vista === "logros") {
        const logros = calcularLogros(st.filas, gente);
        const hechos = LOGROS.filter((l) => logros[l.id].length).length;
        $("sublateral").textContent = `${hechos} de ${LOGROS.length} desbloqueados`;
        $("lateral").innerHTML = `<div class="logros">${LOGROS.map((l) => {
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
      $("sublateral").textContent = `de ${st.periodo.texto}`;
      $("lateral").innerHTML = `<table class="tabla"><thead><tr><th>Aventurero</th><th class="n">Horas</th><th class="n" title="Misiones">📜</th><th class="n" title="Muertes">💀</th><th class="n" title="Enemigos">⚔️</th><th class="n" title="Oro ganado">🪙 +</th><th class="n" title="Oro gastado">🪙 −</th><th class="n">Nv</th></tr></thead><tbody>${
        filasT.map((t) => `<tr><td style="color:${colores[t.p]};text-shadow:0 1px 0 #000">${esc(t.p)}</td><td class="n">${fmtH(t.seg)}</td><td class="n">${fmtNum(t.mis)}</td><td class="n">${fmtNum(t.mue)}</td><td class="n">${fmtNum(t.kil)}</td><td class="n">${fmtOro(t.og)}</td><td class="n">${fmtOro(t.os)}</td><td class="n">${t.nvFin}${t.sube > 0 ? ` <span class="sube">+${t.sube}</span>` : ""}</td></tr>`).join("")
      }</tbody></table>${gente.length ? recordsHtml(dias) : ""}`;
    }

    function recordsHtml(dias) {
      const delPeriodo = st.filas.filter((f) => dias.has(f.dia));
      const mejor = (k) => delPeriodo.reduce((a, f) => ((f[k] || 0) > ((a && a[k]) || 0) ? f : a), null);
      const items = [["segundos", "Más horas en un día", fmtH], ["misiones", "Más misiones en un día", fmtNum],
        ["kills", "Más enemigos en un día", fmtNum], ["muertes", "Más muertes en un día", fmtNum], ["oro_ganado", "Más oro en un día", fmtOro]]
        .map(([k, t, f]) => { const r = mejor(k); return r ? `<li><span>${t}</span><b style="color:${colores[r.persona]}">${esc(r.persona)}</b><em>${f(r[k])} · ${fechaCorta(r.dia)}</em></li>` : ""; }).join("");
      return items ? `<h3 class="sub-titulo">Récords</h3><ul class="records">${items}</ul>` : "";
    }

    function pintarPie() {
      const ult = st.filas.reduce((a, f) => [f.actualizado, f.en_vivo].reduce((b, t) => (t && t > b ? t : b), a), "");
      const jugando = personas().filter(enVivo);
      $("pie").innerHTML = (jugando.length ? `<span class="en-vivo">● ${jugando.map(esc).join(", ")} ${jugando.length > 1 ? "están" : "está"} jugando ahora</span> · ` : "") +
        (ult ? `Última actualización: ${new Date(ult).toLocaleString("es-AR")} · ` : "") + "Mientras juegan los datos llegan cada ~2 minutos.";
    }

    function pintarTodo() {
      calcularColores(); pintarCabecera(); pintarTarjetas(); pintarLateral(); pintarPie();
      ajustarAlto(); requestAnimationFrame(pintarGrafico);
    }

    app.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.p) { st.periodo = PERIODOS.find((p) => p.dias === +b.dataset.p); pintarCabecera(); pintarLateral(); pintarGrafico(); }
      if (b.dataset.m) { st.metrica = METRICAS.find((m) => m.id === b.dataset.m); pintarCabecera(); pintarGrafico(); }
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
        st.filas = (await r.json()).filter((f) => f.dia >= desde);
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
