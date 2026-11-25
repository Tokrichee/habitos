'use strict';
/* Núcleo: estado, lógica de hábitos, vista Hoy, detalle, formulario, ajustes y navegación.
   Las demás secciones (progreso, finanzas, negocio, preguntas) se registran en VIEWS y actions. */

const STORE_KEY = 'habitos.v1';
const COLORS = ['#ff6b6b', '#ff9f43', '#feca57', '#2ed596', '#45d4f5', '#5b8cff', '#a77bff', '#ff6fb5'];
const EMOJIS = ['💧', '🏃', '📚', '🧘', '💪', '🥗', '😴', '✍️', '📷', '🎥', '🎨', '💡',
  '🚶', '🍎', '📵', '🙏', '💸', '🧠', '☀️', '🎯', '📲', '💻', '🤝', '🎬'];
const DAY_LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const TIME_ORDER = ['morning', 'afternoon', 'evening', 'any'];

const VIEWS = {};
const actions = {};

/* ================= Utilidades ================= */
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKeyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayKey = () => keyOf(today());
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
const daysBetween = (a, b) => Math.round((b - a) / 864e5);

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pct = f => `${Math.round((f || 0) * 100)}%`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const sum = arr => arr.reduce((a, b) => a + b, 0);

/* ================= Estado ================= */
let state = load();
const ui = { tab: 'hoy', selected: todayKey(), weekOffset: 0, detailId: null, from: 'hoy', calMonth: null, catFilter: 'all' };
let draft = null;

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (_) { /* datos corruptos */ }
  if (!s || !Array.isArray(s.habits)) s = { habits: [], log: {} };
  return migrate(s);
}

function migrate(s) {
  s.version = 2;
  s.log = s.log || {};
  s.profile = { name: '', areas: [], energy: 'morning', howMany: 5, stage: null, specialties: [], onboarded: s.habits.length > 0, ...s.profile };
  s.habits = s.habits.map(h => ({
    category: 'otro', type: h.goal > 1 ? 'count' : 'check', unit: h.goal > 1 ? 'veces' : '', step: 1,
    time: 'any', freq: 'days', perWeek: 3, note: '', libId: null, ...h,
  }));
  s.finance = { currency: 'ARS', savingsGoal: 20, bizGoal: 0, fixed: [], moves: [], ...s.finance };
  s.biz = { favTips: [], challenges: {}, roadmap: {}, ideas: [], tipShift: 0, ...s.biz };
  return s;
}

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* ================= Lógica de hábitos ================= */
const byId = id => state.habits.find(h => h.id === id);
const activeHabits = () => state.habits.filter(h => !h.archived).sort((a, b) => a.order - b.order);
const count = (h, k) => (state.log[h.id] || {})[k] || 0;
const isDone = (h, k) => count(h, k) >= h.goal;
const isWeekly = h => h.freq === 'weekly';
const scheduledOn = (h, d) => isWeekly(h) || h.days.includes(d.getDay());
const existsOn = (h, k) => k >= h.createdAt;
const habitTime = h => TIMES[h.time] ? h.time : 'any';

function setCount(h, k, n) {
  const log = state.log[h.id] || (state.log[h.id] = {});
  if (n <= 0) delete log[k]; else log[k] = n;
  if (n > 0 && k < h.createdAt) h.createdAt = k;
  save();
}

function weekDone(h, monday) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (isDone(h, keyOf(addDays(monday, i)))) n++;
  return n;
}

function streaks(h) {
  const t = today(), tk = keyOf(t);
  let best = 0, run = 0;
  if (isWeekly(h)) {
    const thisMon = mondayOf(t);
    for (let m = mondayOf(parseKey(h.createdAt)); m <= thisMon; m = addDays(m, 7)) {
      if (weekDone(h, m) >= h.perWeek) { run++; if (run > best) best = run; }
      else if (+m !== +thisMon) run = 0;
    }
    return { current: run, best, weekly: true };
  }
  for (let d = parseKey(h.createdAt); d <= t; d = addDays(d, 1)) {
    if (!h.days.includes(d.getDay())) continue;
    const k = keyOf(d);
    if (isDone(h, k)) { run++; if (run > best) best = run; }
    else if (k !== tk) run = 0;
  }
  return { current: run, best, weekly: false };
}
const streakLabel = (n, weekly) => weekly ? plural(n, 'semana', 'semanas') : plural(n, 'día', 'días');

/* Cumplimiento de un hábito entre dos fechas: { exp: esperado, done: logrado } */
function habitRange(h, from, to) {
  const t = today(), tk = keyOf(t);
  if (to > t) to = t;
  let start = parseKey(h.createdAt);
  if (from && from > start) start = new Date(from);
  let exp = 0, done = 0;
  if (start > to) return { exp, done };
  if (!isWeekly(h)) {
    for (let d = new Date(start); d <= to; d = addDays(d, 1)) {
      if (!h.days.includes(d.getDay())) continue;
      const k = keyOf(d), ok = isDone(h, k);
      if (k === tk && !ok) continue;
      exp++; if (ok) done++;
    }
  } else {
    const thisMon = mondayOf(t);
    for (let m = mondayOf(start); m <= to; m = addDays(m, 7)) {
      let active = 0, dd = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDays(m, i);
        if (d < start || d > to) continue;
        active++; if (isDone(h, keyOf(d))) dd++;
      }
      if (+m === +thisMon) { const got = Math.min(dd, h.perWeek); exp += got; done += got; }
      else { const need = h.perWeek * active / 7; exp += need; done += Math.min(dd, need); }
    }
  }
  return { exp, done };
}
const rangeRate = r => r.exp ? r.done / r.exp : null;
function groupRate(habits, from, to) {
  const rs = habits.map(h => habitRange(h, from, to));
  return rangeRate({ exp: sum(rs.map(r => r.exp)), done: sum(rs.map(r => r.done)) });
}

function dayProgress(d, habits = activeHabits()) {
  const k = keyOf(d);
  let done = 0, total = 0;
  for (const h of habits) {
    if (!existsOn(h, k)) continue;
    if (isWeekly(h)) { if (isDone(h, k)) { done++; total++; } continue; }
    if (!h.days.includes(d.getDay())) continue;
    total++; if (isDone(h, k)) done++;
  }
  return { done, total, frac: total ? done / total : 0 };
}

const totalDone = h => Object.keys(state.log[h.id] || {}).filter(k => isDone(h, k)).length;

function freqText(h) {
  if (isWeekly(h)) return h.perWeek === 7 ? 'Todos los días' : `${plural(h.perWeek, 'vez', 'veces')} por semana`;
  if (h.days.length === 7) return 'Todos los días';
  if (h.days.length === 5 && !h.days.includes(0) && !h.days.includes(6)) return 'Lunes a viernes';
  if (h.days.length === 2 && h.days.includes(0) && h.days.includes(6)) return 'Fines de semana';
  return WEEK_ORDER.filter(d => h.days.includes(d)).map(d => DAY_SHORT[d]).join(', ');
}
const goalText = h => h.type === 'count' ? `${h.goal} ${h.unit || 'veces'} por día` : h.type === 'avoid' ? 'Evitar' : '';

/* ================= Piezas de UI ================= */
function ring(frac, color, size = 44, stroke = 4) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, h = size / 2;
  const off = c * (1 - Math.max(0, Math.min(1, frac)));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${stroke}"/>
    ${frac > 0 ? `<circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${h} ${h})"/>` : ''}
  </svg>`;
}

function heatmap(h, weeks) {
  const t = today(), tk = keyOf(t);
  const start = addDays(mondayOf(t), -7 * (weeks - 1));
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i), k = keyOf(d), c = count(h, k);
    let cls = '', style = '';
    if (d > t) cls = 'future';
    else if (c > 0) { cls = 'on'; const f = Math.min(1, c / h.goal); if (f < 1) style = `opacity:${.3 + .6 * f}`; }
    else if (!existsOn(h, k) || !scheduledOn(h, d)) cls = 'off';
    if (k === tk) cls += ' today';
    cells += `<i class="${cls}" style="${style}"></i>`;
  }
  return `<div class="heat" style="--c:${h.color};grid-template-columns:repeat(${weeks},1fr)">${cells}</div>`;
}

const seg = (opts, cur, act) => `<div class="seg">${opts.map(([v, l]) =>
  `<button class="${v === cur ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
const stepper = (val, dec, inc, label = '') => `<div class="stepper">
  <button data-act="${dec}" aria-label="Menos">−</button><b>${val}${label ? ` <small>${esc(label)}</small>` : ''}</b><button data-act="${inc}" aria-label="Más">+</button></div>`;

function bars(items, opts = {}) {
  // items: [{ v: 0..1 | null, label, hi }]
  return `<div class="bars" style="height:${opts.height || 110}px">${items.map(it => `
    <div class="col ${it.hi ? 'hi' : ''}"><div class="track">${it.v == null ? '' : `<div class="fill" style="height:${pct(it.v)}"></div>`}</div>
    <small>${it.label}</small></div>`).join('')}</div>`;
}

function dayTitle(k) {
  const d = parseKey(k), t = today();
  if (k === keyOf(t)) return 'Hoy';
  if (k === keyOf(addDays(t, -1))) return 'Ayer';
  return cap(DAY_LONG[d.getDay()]);
}
const longDate = k => { const d = parseKey(k); return `${DAY_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
function greeting() {
  const h = new Date().getHours(), n = state.profile.name;
  const g = h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  return n ? `${g}, ${esc(n)}` : g;
}

/* ================= Vista: Hoy ================= */
VIEWS.hoy = function renderHoy() {
  const t = today(), tk = keyOf(t), sel = parseKey(ui.selected), k = ui.selected;
  const all = activeHabits();

  const end = addDays(t, -7 * ui.weekOffset);
  let strip = '';
  for (let i = 6; i >= 0; i--) {
    const d = addDays(end, -i), dk = keyOf(d), p = dayProgress(d, all);
    strip += `<button class="day ${dk === k ? 'sel' : ''} ${dk === tk ? 'is-today' : ''}" data-act="pick-day" data-k="${dk}">
      <span class="dl">${DAY_LETTER[d.getDay()]}</span>
      <span class="dn-wrap">${ring(p.frac, 'var(--accent)', 36, 3)}<span class="dn">${d.getDate()}</span></span>
    </button>`;
  }

  let html = `
    ${k === tk ? `<div class="greet">${greeting()}</div>` : ''}
    <div class="top">
      <div><h1>${dayTitle(k)}</h1><div class="date">${longDate(k)}</div></div>
      <button class="icon-btn accent" data-act="new-habit" aria-label="Nuevo hábito">+</button>
    </div>
    <div class="strip">
      <button class="arrow" data-act="week-prev" aria-label="Semana anterior">‹</button>
      <div class="days">${strip}</div>
      <button class="arrow" data-act="week-next" aria-label="Semana siguiente" ${ui.weekOffset === 0 ? 'disabled' : ''}>›</button>
    </div>`;

  if (!all.length) {
    return html + `
      <div class="empty">
        <div class="big">🌱</div>
        <h2>Empezá con un hábito</h2>
        <div>Respondé unas preguntas y te armo una rutina, o elegí vos.</div>
        <div style="margin-top:22px"><button class="btn" data-act="start-onboarding">Responder preguntas</button>
        <button class="btn ghost" data-act="new-habit">Elegir hábitos</button></div>
      </div>`;
  }

  const cats = [...new Set(all.map(h => h.category))];
  if (cats.length > 1) {
    if (ui.catFilter !== 'all' && !cats.includes(ui.catFilter)) ui.catFilter = 'all';
    html += `<div class="filter">${[['all', 'Todos'], ...cats.map(c => [c, `${CATEGORIES[c].emoji} ${CATEGORIES[c].name}`])]
      .map(([v, l]) => `<button class="${ui.catFilter === v ? 'on' : ''}" data-act="cat-filter" data-v="${v}">${l}</button>`).join('')}</div>`;
  }
  const habits = ui.catFilter === 'all' ? all : all.filter(h => h.category === ui.catFilter);

  const visible = habits.filter(h => existsOn(h, k) || count(h, k) > 0 || k >= tk);
  const sched = visible.filter(h => scheduledOn(h, sel));
  const other = visible.filter(h => !scheduledOn(h, sel));
  const p = dayProgress(sel, habits);

  if (sched.length) {
    html += `<div class="summary"><span>${p.done} de ${p.total} hechos</span><div class="bar"><i style="width:${pct(p.frac)}"></i></div><b>${pct(p.frac)}</b></div>`;
    const groups = TIME_ORDER.map(tm => [tm, sched.filter(h => habitTime(h) === tm)]).filter(([, hs]) => hs.length);
    for (const [tm, hs] of groups) {
      if (groups.length > 1) html += `<div class="section-title">${TIMES[tm].emoji} ${TIMES[tm].name}</div>`;
      html += hs.map(h => card(h, k)).join('');
    }
  } else {
    html += `<div class="empty" style="padding:20px 10px"><div>No hay hábitos programados para este día.</div></div>`;
  }
  if (other.length) html += `<div class="section-title">No programados este día</div>` + other.map(h => card(h, k, true)).join('');

  if (k === tk && typeof tipOfDay === 'function') {
    const tip = tipOfDay();
    html += `<button class="tip-mini" data-tab="negocio"><span>💡 Tip del día · ${esc(tip.cat)}</span><b>${esc(tip.title)}</b></button>`;
  }
  return html;
};

function card(h, k, dim = false) {
  const c = count(h, k), done = c >= h.goal, s = streaks(h);
  const parts = [];
  if (h.type === 'count') parts.push(`${c}/${h.goal} ${esc(h.unit)}`);
  if (isWeekly(h)) {
    const wd = weekDone(h, mondayOf(parseKey(k)));
    parts.push(wd >= h.perWeek ? `✓ ${wd}/${h.perWeek} semana` : `${wd}/${h.perWeek} esta semana`);
  }
  if (h.type === 'avoid' && done) parts.push('Evitado');
  parts.push(s.current > 0 ? `🔥 ${streakLabel(s.current, s.weekly)}` : 'Sin racha');
  const icon = done ? '✓' : h.type === 'count' && c > 0 ? c : h.type === 'avoid' ? '🚫' : '';
  return `<div class="card ${done ? 'done' : ''} ${dim && !done ? 'dim' : ''}" style="--c:${h.color}" data-card="${h.id}">
    <button class="card-main" data-act="open-detail" data-id="${h.id}">
      <span class="emoji">${esc(h.emoji)}</span>
      <span class="info"><span class="name">${esc(h.name)}</span><span class="sub">${parts.join(' · ')}</span></span>
    </button>
    <button class="check" data-act="tap" data-id="${h.id}" aria-label="Marcar ${esc(h.name)}">
      ${done ? '' : ring(c / h.goal, h.color, 48, 4)}
      <span class="check-ico ${h.type === 'avoid' && !done ? 'faint' : ''}">${icon}</span>
    </button>
  </div>`;
}

/* ================= Vista: Detalle de hábito ================= */
VIEWS.detail = function renderDetail() {
  const h = byId(ui.detailId);
  if (!h) { ui.tab = ui.from; return VIEWS[ui.tab](); }
  const t = today(), tk = keyOf(t), s = streaks(h);
  if (!ui.calMonth) ui.calMonth = [t.getFullYear(), t.getMonth()];
  const [y, m] = ui.calMonth;
  const first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
  const isCurrentMonth = y === t.getFullYear() && m === t.getMonth();

  let cal = WEEK_ORDER.map(d => `<div class="wd">${DAY_LETTER[d]}</div>`).join('') + '<div></div>'.repeat(lead);
  for (let day = 1; day <= dim; day++) {
    const d = new Date(y, m, day), k = keyOf(d), c = count(h, k), cls = [];
    if (d > t) cls.push('future');
    else if (c >= h.goal) cls.push('done');
    else if (c > 0) cls.push('partial');
    if (!scheduledOn(h, d)) cls.push('off');
    if (k === tk) cls.push('today');
    cal += `<button class="${cls.join(' ')}" data-act="cal-toggle" data-k="${k}">${day}</button>`;
  }

  // Días de la semana en que más lo hacés
  const perWd = [0, 0, 0, 0, 0, 0, 0];
  for (const k of Object.keys(state.log[h.id] || {})) if (isDone(h, k)) perWd[parseKey(k).getDay()]++;
  const maxWd = Math.max(1, ...perWd);
  const wdBars = bars(WEEK_ORDER.map(d => ({ v: perWd[d] / maxWd, label: DAY_LETTER[d] })), { height: 80 });

  // Últimos 6 meses
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const ms = addMonths(t, -i), me = addDays(addMonths(t, -i + 1), -1);
    months.push({ v: rangeRate(habitRange(h, ms, me)), label: MONTH_SHORT[ms.getMonth()], hi: i === 0 });
  }

  const c = count(h, tk);
  const todayPanel = h.type === 'count' ? `
    <div class="panel"><h3>Registro de hoy <small>meta: ${h.goal} ${esc(h.unit)}</small></h3>
      <div class="row-between">${stepper(c, 'detail-dec', 'detail-inc', h.unit)}
      <button class="pill" data-act="detail-full">Completar</button></div></div>` : '';

  return `
    <button class="back" data-act="back">‹ ${ui.from === 'stats' ? 'Progreso' : 'Hoy'}</button>
    <div class="detail-head" style="--c:${h.color}">
      <span class="emoji">${esc(h.emoji)}</span>
      <div><h1>${esc(h.name)}</h1><div class="sub">${[CATEGORIES[h.category].name, freqText(h), goalText(h)].filter(Boolean).join(' · ')}</div></div>
      <button class="icon-btn" data-act="edit-habit" data-id="${h.id}">Editar</button>
    </div>
    ${h.note ? `<div class="note">“${esc(h.note)}”</div>` : ''}
    ${todayPanel}
    <div class="tiles two">
      <div class="tile"><b>🔥 ${s.current}</b><span>Racha actual (${s.weekly ? 'semanas' : 'días'})</span></div>
      <div class="tile"><b>${s.best}</b><span>Mejor racha</span></div>
      <div class="tile"><b>${pct(rangeRate(habitRange(h, addDays(t, -29), t)))}</b><span>Últimos 30 días</span></div>
      <div class="tile"><b>${totalDone(h)}</b><span>Veces completado</span></div>
    </div>
    <div class="panel"><h3>Últimas 20 semanas</h3>${heatmap(h, 20)}</div>
    <div class="panel" style="--accent:${h.color}"><h3>Cumplimiento por mes</h3>${bars(months, { height: 90 })}</div>
    <div class="panel" style="--accent:${h.color}"><h3>Días en que más lo hacés</h3>${wdBars}</div>
    <div class="panel" style="--c:${h.color}">
      <div class="cal-head">
        <button data-act="cal-prev">‹</button><b>${MONTHS[m]} ${y}</b>
        <button data-act="cal-next" ${isCurrentMonth ? 'disabled' : ''}>›</button>
      </div>
      <div class="cal">${cal}</div>
      <div class="hint">Tocá un día para marcarlo o desmarcarlo.</div>
    </div>`;
};

/* ================= Nuevo hábito: biblioteca ================= */
function libraryToDraft(lib) {
  const energy = state.profile.energy || 'morning';
  return {
    id: null, libId: lib.id, name: lib.name, emoji: lib.emoji, color: CATEGORIES[lib.cat].color,
    category: lib.cat, type: lib.type, goal: lib.goal, unit: lib.unit, step: lib.step,
    time: lib.time === 'energy' ? energy : lib.time, freq: lib.freq, days: [...lib.days],
    perWeek: lib.perWeek, note: lib.note,
  };
}
const blankDraft = () => ({
  id: null, libId: null, name: '', emoji: '✨', color: COLORS[6], category: 'otro', type: 'check',
  goal: 1, unit: '', step: 1, time: 'any', freq: 'days', days: [0, 1, 2, 3, 4, 5, 6], perWeek: 3, note: '',
});

function libFreqText(l) {
  const parts = [l.freq === 'weekly' ? `${l.perWeek}× semana` : l.days.length === 7 ? 'Diario' : l.days.length === 5 ? 'Lun a vie' : `${l.days.length} días`];
  if (l.type === 'count') parts.push(`${l.goal} ${l.unit}`);
  if (l.type === 'avoid') parts.push('Evitar');
  return parts.join(' · ');
}

function renderLibrary() {
  const have = new Set(state.habits.filter(h => !h.archived).map(h => h.libId).filter(Boolean));
  const cat = draft.libCat || 'all';
  const cats = Object.keys(CATEGORIES).filter(c => c !== 'otro');
  const list = HABIT_LIBRARY.filter(l => cat === 'all' || l.cat === cat);
  return `
    <div class="sheet-head"><button class="link" data-act="close-sheet">Cerrar</button><h2>Nuevo hábito</h2><span style="width:52px"></span></div>
    <button class="btn" data-act="blank-habit">✏️ Crear desde cero</button>
    <div class="label">O elegí una idea</div>
    <div class="filter in-sheet">${[['all', 'Todas'], ...cats.map(c => [c, `${CATEGORIES[c].emoji} ${CATEGORIES[c].name}`])]
      .map(([v, l]) => `<button class="${cat === v ? 'on' : ''}" data-act="lib-cat" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="list">${list.map(l => `
      <button data-act="lib-pick" data-v="${l.id}" ${have.has(l.id) ? 'disabled' : ''}>
        <span class="emoji sm" style="--c:${CATEGORIES[l.cat].color}">${l.emoji}</span>
        <span class="info"><span class="name">${esc(l.name)}</span><span class="sub">${libFreqText(l)}</span></span>
        <span class="right">${have.has(l.id) ? '✓' : '+'}</span>
      </button>`).join('')}</div>`;
}

/* ================= Formulario de hábito ================= */
function renderForm() {
  const d = draft;
  const isAll = d.days.length === 7, isWeek = d.days.length === 5 && !d.days.includes(0) && !d.days.includes(6);
  return `<div style="--c:${d.color}">
    <div class="sheet-head">
      <button class="link" data-act="close-sheet">Cancelar</button>
      <h2>${d.id ? 'Editar hábito' : 'Nuevo hábito'}</h2>
      <button class="link" data-act="save-habit">Guardar</button>
    </div>
    <div class="preview">
      <span class="emoji">${esc(d.emoji)}</span>
      <input class="text-input" data-bind="name" placeholder="Nombre del hábito" maxlength="40" value="${esc(d.name)}" autocomplete="off">
    </div>

    <div class="label">Tipo</div>
    ${seg(Object.entries(TYPES).map(([v, t]) => [v, t.name]), d.type, 'f-type')}
    <div class="hint">${TYPES[d.type].hint}</div>
    ${d.type === 'count' ? `
      <div class="form-row">
        <div><div class="label">Meta por día</div>${stepper(d.goal, 'goal-dec', 'goal-inc')}</div>
        <div style="flex:1"><div class="label">Unidad</div><input class="text-input" data-bind="unit" placeholder="vasos, minutos…" maxlength="14" value="${esc(d.unit)}"></div>
      </div>
      <div class="label">Cada toque suma</div>${stepper(d.step, 'step-dec', 'step-inc')}` : ''}

    <div class="label">Frecuencia</div>
    ${seg([['days', 'Días fijos'], ['weekly', 'Veces por semana']], d.freq, 'f-freq')}
    <div style="margin-top:10px">
    ${d.freq === 'weekly' ? `${stepper(d.perWeek, 'pw-dec', 'pw-inc', 'por semana')}<div class="hint">Lo hacés cuando quieras; cuenta la meta semanal.</div>` : `
      <div class="presets">
        <button class="${isAll ? 'on' : ''}" data-act="preset" data-v="all">Todos los días</button>
        <button class="${isWeek ? 'on' : ''}" data-act="preset" data-v="week">Lun a vie</button>
        <button data-act="preset" data-v="weekend">Fin de semana</button>
      </div>
      <div class="weekdays">${WEEK_ORDER.map(n => `<button class="${d.days.includes(n) ? 'on' : ''}" data-act="toggle-day" data-v="${n}">${DAY_LETTER[n]}</button>`).join('')}</div>`}
    </div>

    <div class="label">Momento del día</div>
    <div class="chips left">${TIME_ORDER.map(tm => `<button class="chip ${d.time === tm ? 'on' : ''}" data-act="f-time" data-v="${tm}">${TIMES[tm].emoji} ${TIMES[tm].name}</button>`).join('')}</div>

    <div class="label">Área</div>
    <div class="chips left">${Object.entries(CATEGORIES).map(([v, c]) => `<button class="chip ${d.category === v ? 'on' : ''}" data-act="f-cat" data-v="${v}">${c.emoji} ${c.name}</button>`).join('')}</div>

    <div class="label">Ícono</div>
    <div class="emoji-grid">${EMOJIS.map(e => `<button class="${e === d.emoji ? 'sel' : ''}" data-act="pick-emoji" data-v="${e}">${e}</button>`).join('')}</div>
    <input class="text-input" data-bind="customEmoji" data-rerender placeholder="…o escribí cualquier emoji" style="margin-top:8px" autocomplete="off">

    <div class="label">Color</div>
    <div class="colors">${COLORS.map(c => `<button class="swatch ${c === d.color ? 'sel' : ''}" style="background:${c};color:${c}" data-act="pick-color" data-v="${c}" aria-label="Color"></button>`).join('')}</div>

    <div class="label">¿Por qué lo hacés? (opcional)</div>
    <input class="text-input" data-bind="note" placeholder="Tu motivación, para recordarla" maxlength="80" value="${esc(d.note)}">

    <div class="form-actions">
      <button class="btn" data-act="save-habit">${d.id ? 'Guardar cambios' : 'Crear hábito'}</button>
      ${d.id ? `<button class="btn ghost" data-act="archive-habit">Archivar</button>
      <button class="btn danger" data-act="delete-habit">Eliminar hábito</button>` : ''}
    </div></div>`;
}

function firstGrapheme(s) {
  if (!s) return '';
  if (window.Intl && Intl.Segmenter) return [...new Intl.Segmenter().segment(s)][0].segment;
  return [...s][0];
}

function saveDraft() {
  const name = (draft.name || '').trim();
  if (!name) { toast('Ponele un nombre'); return; }
  if (draft.freq === 'days' && !draft.days.length) { toast('Elegí al menos un día'); return; }
  const fields = {
    name, emoji: draft.emoji, color: draft.color, category: draft.category, type: draft.type,
    goal: draft.type === 'count' ? draft.goal : 1, unit: draft.type === 'count' ? (draft.unit || '').trim() : '',
    step: draft.type === 'count' ? draft.step : 1, time: draft.time, freq: draft.freq,
    days: [...draft.days].sort(), perWeek: draft.perWeek, note: (draft.note || '').trim(), libId: draft.libId,
  };
  if (draft.id) Object.assign(byId(draft.id), fields);
  else state.habits.push(newHabit(fields));
  save(); closeSheet(); render();
  toast(draft.id ? 'Cambios guardados' : 'Hábito creado');
}

function newHabit(fields) {
  return {
    id: uid(), createdAt: todayKey(), archived: false,
    order: state.habits.length ? Math.max(...state.habits.map(h => h.order)) + 1 : 0, ...fields,
  };
}

/* ================= Vista: Ajustes ================= */
VIEWS.ajustes = function renderAjustes() {
  const archived = state.habits.filter(h => h.archived), p = state.profile;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `
    <div class="top"><div><h1>Ajustes</h1></div></div>
    <div class="section-title">Perfil</div>
    <div class="list">
      <div>👤 Nombre<input class="inline-input" data-bind-profile="name" value="${esc(p.name)}" placeholder="Tu nombre" maxlength="24"></div>
      <button data-act="start-onboarding">📝 Volver a hacer las preguntas<span class="right">›</span></button>
      <button data-tab="negocio">📷 Negocio: ${p.stage ? esc(BIZ_STAGES[p.stage].name) : 'sin configurar'}<span class="right">›</span></button>
      <button data-act="fin-settings">💰 Finanzas: moneda, ingreso y fijos<span class="right">›</span></button>
    </div>
    ${standalone ? '' : `
    <div class="section-title">Instalar en el iPhone</div>
    <div class="list"><ol class="steps">
      <li>Abrí esta página en <b>Safari</b>.</li>
      <li>Tocá el botón <b>Compartir</b> (cuadrado con flecha).</li>
      <li>Elegí <b>Agregar a pantalla de inicio</b>.</li>
    </ol></div>`}
    <div class="section-title">Copia de seguridad</div>
    <div class="list">
      <button data-act="export">⬆️ Exportar datos<span class="right">.json</span></button>
      <button data-act="import">⬇️ Importar copia</button>
    </div>
    <div class="hint">Todo se guarda solo en este teléfono: hábitos, finanzas e ideas. Exportá una copia de vez en cuando.</div>
    ${archived.length ? `
    <div class="section-title">Hábitos archivados</div>
    <div class="list">${archived.map(h => `<button data-act="unarchive" data-id="${h.id}">${esc(h.emoji)} ${esc(h.name)}<span class="right">Restaurar</span></button>`).join('')}</div>` : ''}
    <div class="section-title">Datos</div>
    <div class="list"><button data-act="wipe"><span class="red">Borrar todos los datos</span></button></div>
    <div class="foot">Hábitos · ${plural(activeHabits().length, 'hábito activo', 'hábitos activos')} · ${plural(state.finance.moves.length, 'movimiento', 'movimientos')}</div>`;
};

/* ================= Sheet / toast ================= */
let sheetRender = null, sheetGen = 0;
function openSheet(renderFn) {
  const root = $('#sheet-root');
  sheetGen++; sheetRender = renderFn;
  root.innerHTML = `<div class="backdrop" data-act="close-sheet"></div><div class="sheet" role="dialog"><div class="grab"></div><div class="sheet-body"></div></div>`;
  refreshSheet();
  void root.offsetWidth;
  root.classList.add('open');
}
function refreshSheet() {
  const body = $('#sheet-root .sheet-body');
  if (!body || !sheetRender) return;
  const sc = body.parentElement.scrollTop;
  body.innerHTML = sheetRender();
  body.parentElement.scrollTop = sc;
}
function switchSheet(renderFn) { sheetRender = renderFn; refreshSheet(); $('#sheet-root .sheet').scrollTop = 0; }
function closeSheet() {
  const root = $('#sheet-root'), gen = sheetGen;
  root.classList.remove('open'); sheetRender = null;
  setTimeout(() => { if (gen === sheetGen) root.innerHTML = ''; }, 320);
}

let toastTimer;
function toast(msg, undo) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button id="toast-undo">Deshacer</button>' : ''}`;
  if (undo) $('#toast-undo').onclick = () => { undo(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 4000 : 2200);
}

/* ================= Render + navegación ================= */
const MAIN_TABS = ['hoy', 'stats', 'finanzas', 'negocio', 'ajustes'];
function render() {
  const tab = ui.tab === 'detail' ? ui.from : ui.tab;
  document.body.classList.toggle('no-tabs', ui.tab === 'onboarding');
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#view').innerHTML = (VIEWS[ui.tab] || VIEWS.hoy)();
}
function goTab(tab) { ui.tab = tab; window.scrollTo(0, 0); render(); }

const haptic = () => { if (navigator.vibrate) navigator.vibrate(8); };

function tapHabit(h, k) {
  const c = count(h, k);
  const next = c >= h.goal ? 0 : Math.min(h.goal, c + (h.step || 1));
  setCount(h, k, next); haptic(); render();
  if (next >= h.goal) {
    const el = document.querySelector(`[data-card="${h.id}"]`);
    if (el) el.classList.add('pop');
    const p = dayProgress(parseKey(k));
    if (p.total && p.done === p.total) toast('¡Día completo! 🎉');
  } else if (next === 0 && c > 0) {
    toast(`${h.name}: desmarcado`, () => { setCount(h, k, c); render(); });
  }
}

Object.assign(actions, {
  'pick-day': el => { ui.selected = el.dataset.k; render(); },
  'week-prev': () => { ui.weekOffset++; ui.selected = keyOf(addDays(today(), -7 * ui.weekOffset)); render(); },
  'week-next': () => { ui.weekOffset = Math.max(0, ui.weekOffset - 1); ui.selected = keyOf(addDays(today(), -7 * ui.weekOffset)); render(); },
  'cat-filter': el => { ui.catFilter = el.dataset.v; render(); },
  'tap': el => tapHabit(byId(el.dataset.id), ui.selected),
  'open-detail': el => {
    if (ui.tab !== 'detail') ui.from = ui.tab;
    ui.detailId = el.dataset.id; ui.calMonth = null; goTab('detail');
  },
  'back': () => goTab(ui.from),
  'cal-prev': () => { let [y, m] = ui.calMonth; if (--m < 0) { m = 11; y--; } ui.calMonth = [y, m]; render(); },
  'cal-next': () => { let [y, m] = ui.calMonth; if (++m > 11) { m = 0; y++; } ui.calMonth = [y, m]; render(); },
  'cal-toggle': el => {
    const h = byId(ui.detailId), k = el.dataset.k;
    if (parseKey(k) > today()) return;
    setCount(h, k, isDone(h, k) ? 0 : h.goal); haptic(); render();
  },
  'detail-inc': () => { const h = byId(ui.detailId), k = todayKey(); setCount(h, k, count(h, k) + (h.step || 1)); render(); },
  'detail-dec': () => { const h = byId(ui.detailId), k = todayKey(); setCount(h, k, Math.max(0, count(h, k) - (h.step || 1))); render(); },
  'detail-full': () => { const h = byId(ui.detailId); setCount(h, todayKey(), h.goal); render(); toast('Completado ✓'); },

  'new-habit': () => { draft = { libCat: 'all' }; openSheet(renderLibrary); },
  'lib-cat': el => { draft.libCat = el.dataset.v; refreshSheet(); },
  'lib-pick': el => { draft = libraryToDraft(HABIT_LIBRARY.find(l => l.id === el.dataset.v)); switchSheet(renderForm); },
  'blank-habit': () => { draft = blankDraft(); switchSheet(renderForm); },
  'edit-habit': el => { const h = byId(el.dataset.id); draft = { ...h, days: [...h.days] }; openSheet(renderForm); },
  'close-sheet': () => closeSheet(),
  'f-type': el => { draft.type = el.dataset.v; if (draft.type === 'count' && draft.goal < 2) { draft.goal = 5; draft.unit = draft.unit || 'veces'; } refreshSheet(); },
  'f-freq': el => { draft.freq = el.dataset.v; refreshSheet(); },
  'f-time': el => { draft.time = el.dataset.v; refreshSheet(); },
  'f-cat': el => { draft.category = el.dataset.v; if (!draft.id && !draft.libId) draft.color = CATEGORIES[draft.category].color; refreshSheet(); },
  'pick-emoji': el => { draft.emoji = el.dataset.v; refreshSheet(); },
  'pick-color': el => { draft.color = el.dataset.v; refreshSheet(); },
  'preset': el => { draft.days = { all: [0, 1, 2, 3, 4, 5, 6], week: [1, 2, 3, 4, 5], weekend: [0, 6] }[el.dataset.v]; refreshSheet(); },
  'toggle-day': el => { const n = +el.dataset.v; draft.days = draft.days.includes(n) ? draft.days.filter(x => x !== n) : [...draft.days, n]; refreshSheet(); },
  'goal-inc': () => { draft.goal = Math.min(999, draft.goal + (draft.goal >= 20 ? 5 : 1)); refreshSheet(); },
  'goal-dec': () => { draft.goal = Math.max(2, draft.goal - (draft.goal > 20 ? 5 : 1)); refreshSheet(); },
  'step-inc': () => { draft.step = Math.min(draft.goal, draft.step + (draft.step >= 5 ? 5 : 1)); refreshSheet(); },
  'step-dec': () => { draft.step = Math.max(1, draft.step - (draft.step > 5 ? 5 : 1)); refreshSheet(); },
  'pw-inc': () => { draft.perWeek = Math.min(7, draft.perWeek + 1); refreshSheet(); },
  'pw-dec': () => { draft.perWeek = Math.max(1, draft.perWeek - 1); refreshSheet(); },
  'save-habit': () => saveDraft(),
  'archive-habit': () => {
    const h = byId(draft.id); h.archived = true; save(); closeSheet();
    if (ui.tab === 'detail') ui.tab = ui.from;
    render(); toast('Hábito archivado', () => { h.archived = false; save(); render(); });
  },
  'delete-habit': () => {
    const h = byId(draft.id);
    if (!confirm(`¿Eliminar "${h.name}" y todo su historial? No se puede deshacer.`)) return;
    state.habits = state.habits.filter(x => x.id !== h.id);
    delete state.log[h.id];
    save(); closeSheet();
    if (ui.tab === 'detail') ui.tab = ui.from;
    render(); toast('Hábito eliminado');
  },

  'unarchive': el => { byId(el.dataset.id).archived = false; save(); render(); toast('Hábito restaurado'); },
  'export': () => exportData(),
  'import': () => $('#import-file').click(),
  'wipe': () => {
    if (!confirm('¿Borrar todos los hábitos, finanzas e ideas? No se puede deshacer.')) return;
    state = migrate({ habits: [], log: {} }); save(); goTab('hoy'); toast('Datos borrados');
  },
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-tab]');
  if (!el || el.disabled) return;
  if (el.dataset.tab) { if (el.closest('#sheet-root')) closeSheet(); goTab(el.dataset.tab); return; }
  if (actions[el.dataset.act]) actions[el.dataset.act](el);
});

/* Campos de texto: data-bind escribe en draft; data-bind-profile en el perfil */
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.bind) {
    if (!draft) return;
    if (el.dataset.bind === 'customEmoji') { const g = firstGrapheme(el.value.trim()); if (g) draft.emoji = g; return; }
    draft[el.dataset.bind] = el.dataset.num != null ? parseAmount(el.value) : el.value;
  }
  if (el.dataset.bindProfile) { state.profile[el.dataset.bindProfile] = el.value.trim(); save(); }
});
document.addEventListener('change', e => { if (e.target.dataset.rerender != null) refreshSheet(); });

/* ================= Copias de seguridad ================= */
async function exportData() {
  const name = `habitos-${todayKey()}.json`;
  const file = new File([JSON.stringify(state, null, 2)], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Copia de Hábitos' }); return; }
    catch (err) { if (err.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('#import-file').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.habits) || typeof data.log !== 'object') throw new Error('formato');
    if (!confirm(`¿Importar ${plural(data.habits.length, 'hábito', 'hábitos')}? Reemplaza los datos actuales.`)) return;
    state = migrate(data); save(); render(); toast('Copia importada');
  } catch (_) { toast('Ese archivo no es una copia válida'); }
});

/* ================= Arranque ================= */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const tk = todayKey();
  if (ui.lastToday && ui.lastToday !== tk && ui.selected === ui.lastToday) { ui.selected = tk; ui.weekOffset = 0; }
  ui.lastToday = tk;
  if (!sheetRender) render();
});

window.addEventListener('DOMContentLoaded', () => {
  ui.lastToday = todayKey();
  if (!state.profile.onboarded) ui.tab = 'onboarding';
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
});
