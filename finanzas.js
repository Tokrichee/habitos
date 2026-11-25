'use strict';
/* Finanzas: ingresos, gastos y egresos por mes, ingreso mensual fijo, egresos fijos y ahorro. */

ui.finMonth = monthKeyOf(today());
const FIN = () => state.finance;
const BIZ_CATS = ['Fotografía', 'Video', 'Equipo', 'Software', 'Marketing'];

function money(n) {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: FIN().currency,
      minimumFractionDigits: 0, maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch (_) { return `${FIN().currency} ${n}`; }
}

function parseAmount(s) {
  s = String(s ?? '').replace(/[^\d.,]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');      // 15.000,50
  else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, '');           // 15.000
  const n = parseFloat(s);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

const prevMonthKey = mk => monthKeyOf(addMonths(parseKey(mk), -1));
const monthName = mk => { const d = parseKey(mk); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fixedFor = mk => FIN().fixed.filter(f => f.from <= mk && (!f.to || f.to >= mk));
const activeFixed = () => FIN().fixed.filter(f => !f.to);

function monthFin(mk) {
  const moves = FIN().moves.filter(m => m.date.slice(0, 7) === mk);
  const fixed = fixedFor(mk);
  const items = [...moves, ...fixed];
  const tot = type => sum(items.filter(i => i.type === type).map(i => i.amount));
  const ingresos = tot('ingreso'), gastos = tot('gasto'), egresos = tot('egreso');
  const byCat = {};
  for (const i of items) if (i.type !== 'ingreso') byCat[i.cat] = (byCat[i.cat] || 0) + i.amount;
  const bizIn = sum(items.filter(i => i.scope === 'negocio' && i.type === 'ingreso').map(i => i.amount));
  const bizOut = sum(items.filter(i => i.scope === 'negocio' && i.type !== 'ingreso').map(i => i.amount));
  return { moves, fixed, ingresos, gastos, egresos, salidas: gastos + egresos, balance: ingresos - gastos - egresos, byCat, bizIn, bizOut };
}

/* Los fijos guardan historia: cambiar o borrar uno no altera los meses anteriores */
function endFixed(f) {
  const cur = monthKeyOf(today());
  if (f.from >= cur) FIN().fixed = FIN().fixed.filter(x => x !== f);
  else f.to = prevMonthKey(cur);
}
function addFixed(item) { FIN().fixed.push({ id: uid(), from: monthKeyOf(today()), to: null, ...item }); }
const monthlyIncomeItem = () => activeFixed().find(f => f.main);
function setMonthlyIncome(amount) {
  const cur = monthlyIncomeItem();
  if (cur && cur.amount === amount) return;
  if (cur) endFixed(cur);
  if (amount > 0) addFixed({ main: true, type: 'ingreso', name: 'Ingreso mensual', amount, cat: 'Sueldo', scope: 'personal' });
}

/* ================= Vista ================= */
VIEWS.finanzas = function renderFinanzas() {
  const mk = ui.finMonth, curMk = monthKeyOf(today()), f = monthFin(mk), fin = FIN();
  const configured = fin.fixed.length || fin.moves.length || fin.setupDone;

  let html = `
    <div class="top">
      <div><h1>Finanzas</h1><div class="date">Ingresos, gastos y egresos</div></div>
      <button class="icon-btn accent" data-act="new-move" aria-label="Nuevo movimiento">+</button>
    </div>
    <div class="month-nav">
      <button data-act="fin-prev">‹</button><b>${monthName(mk)}</b>
      <button data-act="fin-next" ${mk >= curMk ? 'disabled' : ''}>›</button>
    </div>`;

  if (!configured) {
    html += `<div class="panel cta"><h3>Configurá tus finanzas</h3>
      <p class="sub">Elegí la moneda, cargá cuánto te ingresa por mes y tus gastos fijos (alquiler, servicios, suscripciones). Después solo anotás lo del día a día.</p>
      <button class="btn" data-act="fin-settings">Configurar</button></div>`;
  }

  html += `
    <div class="balance">
      <span class="sub">Balance del mes</span>
      <b class="${f.balance < 0 ? 'neg' : ''}">${money(f.balance)}</b>
      <div class="flows">
        <div><span>⬆️ Ingresos</span><b class="pos">${money(f.ingresos)}</b></div>
        <div><span>🛒 Gastos</span><b>${money(f.gastos)}</b></div>
        <div><span>🧾 Egresos</span><b>${money(f.egresos)}</b></div>
      </div>
    </div>`;

  if (f.ingresos > 0) {
    const saved = f.balance / f.ingresos, goal = fin.savingsGoal / 100;
    const msg = saved >= goal ? '¡Vas cumpliendo tu meta de ahorro! 🎉'
      : saved > 0 ? `Te faltan ${money(Math.ceil(goal * f.ingresos - f.balance))} para llegar a la meta.`
      : 'Este mes estás gastando más de lo que entra.';
    html += `<div class="panel"><h3>Ahorro <small>meta ${fin.savingsGoal}%</small></h3>
      <div class="hbar"><span>${pct(Math.max(0, saved))} de tus ingresos</span><div class="bar goal" style="--goal:${pct(goal)}"><i style="width:${pct(Math.max(0, Math.min(1, saved)))};background:${saved >= goal ? 'var(--green)' : saved > 0 ? 'var(--accent)' : 'var(--danger)'}"></i></div></div>
      <p class="sub" style="margin:8px 0 0">${msg}</p></div>`;
  }

  if (f.bizIn || f.bizOut) {
    html += `<button class="panel biz-mini" data-tab="negocio">
      <h3>📷 Tu negocio este mes <small>ver ›</small></h3>
      <div class="flows small"><div><span>Facturado</span><b class="pos">${money(f.bizIn)}</b></div>
      <div><span>Gastado</span><b>${money(f.bizOut)}</b></div>
      <div><span>Ganancia</span><b class="${f.bizIn - f.bizOut < 0 ? 'neg' : ''}">${money(f.bizIn - f.bizOut)}</b></div></div></button>`;
  }

  const cats = Object.entries(f.byCat).sort((a, b) => b[1] - a[1]);
  if (cats.length) {
    html += `<div class="panel"><h3>¿En qué se va la plata?</h3>${cats.map(([c, v]) => `
      <div class="hbar"><span>${FIN_CAT_EMOJI[c] || '•'} ${esc(c)}</span><div class="bar"><i style="width:${pct(v / f.salidas)}"></i></div><b>${money(v)}</b></div>`).join('')}</div>`;
  }

  // Fijos
  html += `<div class="section-title row-between"><span>Fijos del mes</span><button class="link small" data-act="fin-settings">Editar</button></div>`;
  html += f.fixed.length ? `<div class="list">${f.fixed.map(x => moveRow(x, true)).join('')}</div>`
    : `<div class="hint">Todavía no cargaste ingresos ni egresos fijos.</div>`;

  // Movimientos
  html += `<div class="section-title">Movimientos</div>`;
  if (!f.moves.length) {
    html += `<div class="empty small"><div>Sin movimientos en ${monthName(mk)}.</div><button class="btn ghost" data-act="new-move" style="margin-top:12px">Anotar un movimiento</button></div>`;
  } else {
    const byDate = {};
    for (const m of [...f.moves].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)) (byDate[m.date] = byDate[m.date] || []).push(m);
    for (const [d, ms] of Object.entries(byDate)) {
      const net = sum(ms.map(m => m.type === 'ingreso' ? m.amount : -m.amount));
      html += `<div class="date-sep"><span>${cap(dayTitle(d))} ${parseKey(d).getDate()}</span><span>${net >= 0 ? '+' : '−'}${money(Math.abs(net))}</span></div>
        <div class="list">${ms.map(m => moveRow(m)).join('')}</div>`;
    }
  }

  // Últimos 6 meses
  const months = [];
  for (let i = 5; i >= 0; i--) { const k = monthKeyOf(addMonths(parseKey(mk), -i)); months.push({ k, ...monthFin(k) }); }
  const max = Math.max(1, ...months.map(m => Math.max(m.ingresos, m.salidas)));
  html += `<div class="panel"><h3>Últimos 6 meses <small><i class="dot in"></i>ingresos <i class="dot out"></i>salidas</small></h3>
    <div class="pairs">${months.map(m => `<div class="pcol ${m.k === mk ? 'hi' : ''}"><div class="ptrack">
      <i class="in" style="height:${pct(m.ingresos / max)}"></i><i class="out" style="height:${pct(m.salidas / max)}"></i></div>
      <small>${MONTH_SHORT[parseKey(m.k).getMonth()]}</small></div>`).join('')}</div></div>`;
  return html;
};

function moveRow(m, fixed = false) {
  const sign = m.type === 'ingreso' ? '+' : '−';
  const title = fixed ? m.name : (m.note || m.cat);
  const sub = [fixed ? 'Fijo mensual' : m.cat !== title ? m.cat : '', FIN_TYPES[m.type].name, m.scope === 'negocio' ? '📷 Negocio' : ''].filter(Boolean).join(' · ');
  return `<button data-act="${fixed ? 'fin-settings' : 'edit-move'}" data-id="${m.id}">
    <span class="emoji sm" style="--c:${m.type === 'ingreso' ? 'var(--green)' : m.type === 'gasto' ? '#ff9f43' : '#ff6b6b'}">${FIN_CAT_EMOJI[m.cat] || '•'}</span>
    <span class="info"><span class="name">${esc(title)}</span><span class="sub">${sub}</span></span>
    <span class="right amount ${m.type === 'ingreso' ? 'pos' : ''}">${sign}${money(m.amount)}</span></button>`;
}

/* ================= Formulario de movimiento ================= */
function renderMoveForm() {
  const d = draft;
  return `
    <div class="sheet-head"><button class="link" data-act="close-sheet">Cancelar</button>
      <h2>${d.id ? 'Editar' : 'Nuevo'} movimiento</h2><button class="link" data-act="save-move">Guardar</button></div>
    ${seg(Object.entries(FIN_TYPES).map(([v, t]) => [v, t.name]), d.type, 'mv-type')}
    <div class="hint">${FIN_TYPES[d.type].hint}</div>
    <div class="amount-wrap"><span>${esc(FIN().currency)}</span>
      <input class="amount-input" data-bind="amountRaw" inputmode="decimal" placeholder="0" value="${esc(d.amountRaw)}" autocomplete="off"></div>
    <div class="label">Categoría</div>
    <div class="chips left">${FIN_CATS[d.type].map(c => `<button class="chip ${d.cat === c ? 'on' : ''}" data-act="mv-cat" data-v="${esc(c)}">${FIN_CAT_EMOJI[c] || ''} ${esc(c)}</button>`).join('')}</div>
    <div class="label">¿Personal o del negocio?</div>
    ${seg([['personal', '🙋 Personal'], ['negocio', '📷 Negocio']], d.scope, 'mv-scope')}
    <div class="form-row">
      <div style="flex:1"><div class="label">Fecha</div><input class="text-input" type="date" data-bind="date" value="${d.date}" max="${todayKey()}"></div>
    </div>
    <div class="label">Nota (opcional)</div>
    <input class="text-input" data-bind="note" placeholder="${d.type === 'ingreso' ? 'Ej: sesión de fotos Marca X' : 'Ej: almuerzo, nafta, Lightroom'}" maxlength="50" value="${esc(d.note)}">
    <div class="form-actions">
      <button class="btn" data-act="save-move">${d.id ? 'Guardar cambios' : 'Agregar'}</button>
      ${d.id ? '<button class="btn danger" data-act="delete-move">Eliminar movimiento</button>' : ''}
    </div>`;
}

/* ================= Configuración de finanzas ================= */
function renderFinSettings() {
  const fin = FIN(), mi = monthlyIncomeItem(), fx = draft.fx;
  const others = activeFixed().filter(f => !f.main);
  return `
    <div class="sheet-head"><span style="width:52px"></span><h2>Configurar finanzas</h2><button class="link" data-act="close-sheet">Listo</button></div>
    <div class="label">Moneda</div>
    <div class="chips left">${CURRENCIES.map(c => `<button class="chip ${fin.currency === c ? 'on' : ''}" data-act="fin-currency" data-v="${c}">${c}</button>`).join('')}</div>

    <div class="label">Ingreso mensual</div>
    <div class="amount-wrap small"><span>${esc(fin.currency)}</span>
      <input class="amount-input" data-fin="income" inputmode="decimal" placeholder="0" value="${mi ? mi.amount : ''}"></div>
    <div class="hint">Lo que te entra fijo cada mes. Se suma solo a cada mes; los trabajos extra los anotás como movimientos.</div>

    <div class="label">Meta de ahorro</div>
    <div class="chips left">${[10, 15, 20, 30, 40].map(g => `<button class="chip ${fin.savingsGoal === g ? 'on' : ''}" data-act="fin-goal" data-v="${g}">${g}%</button>`).join('')}</div>

    <div class="label">Meta de facturación del negocio (por mes)</div>
    <div class="amount-wrap small"><span>${esc(fin.currency)}</span>
      <input class="amount-input" data-fin="bizGoal" inputmode="decimal" placeholder="0" value="${fin.bizGoal || ''}"></div>

    <div class="label">Otros fijos mensuales</div>
    ${others.length ? `<div class="list">${others.map(f => `<div>
      <span class="emoji sm" style="--c:${f.type === 'ingreso' ? 'var(--green)' : '#ff6b6b'}">${FIN_CAT_EMOJI[f.cat] || '•'}</span>
      <span class="info"><span class="name">${esc(f.name)}</span><span class="sub">${FIN_TYPES[f.type].name} · ${esc(f.cat)}${f.scope === 'negocio' ? ' · 📷 Negocio' : ''}</span></span>
      <span class="right amount">${money(f.amount)}</span>
      <button class="x" data-act="fixed-del" data-id="${f.id}" aria-label="Quitar">×</button></div>`).join('')}</div>`
      : '<div class="hint" style="margin-bottom:8px">Alquiler, servicios, internet, suscripciones, cuota del equipo…</div>'}

    <div class="panel inset">
      ${seg([['egreso', 'Egreso fijo'], ['ingreso', 'Ingreso fijo']], fx.type, 'fx-type')}
      <input class="text-input" data-bind-fx="name" placeholder="Nombre (ej: Alquiler, Adobe)" maxlength="30" value="${esc(fx.name)}" style="margin-top:10px">
      <div class="amount-wrap small"><span>${esc(fin.currency)}</span>
        <input class="amount-input" data-bind-fx="amountRaw" inputmode="decimal" placeholder="0" value="${esc(fx.amountRaw)}"></div>
      <div class="chips left">${FIN_CATS[fx.type].map(c => `<button class="chip sm ${fx.cat === c ? 'on' : ''}" data-act="fx-cat" data-v="${esc(c)}">${FIN_CAT_EMOJI[c] || ''} ${esc(c)}</button>`).join('')}</div>
      <div style="margin-top:10px">${seg([['personal', '🙋 Personal'], ['negocio', '📷 Negocio']], fx.scope, 'fx-scope')}</div>
      <button class="btn ghost" data-act="fixed-add" style="margin-top:12px">+ Agregar fijo</button>
    </div>`;
}
const blankFx = () => ({ type: 'egreso', name: '', amountRaw: '', cat: 'Alquiler', scope: 'personal' });

document.addEventListener('input', e => {
  const k = e.target.dataset.bindFx;
  if (k && draft && draft.fx) draft.fx[k] = e.target.value;
});
document.addEventListener('change', e => {
  const k = e.target.dataset.fin;
  if (!k) return;
  const v = parseAmount(e.target.value);
  if (k === 'income') setMonthlyIncome(v);
  if (k === 'bizGoal') FIN().bizGoal = v;
  FIN().setupDone = true; save(); render();
});

/* ================= Acciones ================= */
const newMoveDraft = () => {
  const mk = ui.finMonth, cur = monthKeyOf(today());
  return { id: null, type: 'gasto', amountRaw: '', cat: 'Comida', scope: 'personal', note: '', date: mk === cur ? todayKey() : `${mk}-01` };
};

Object.assign(actions, {
  'fin-prev': () => { ui.finMonth = prevMonthKey(ui.finMonth); render(); },
  'fin-next': () => { ui.finMonth = monthKeyOf(addMonths(parseKey(ui.finMonth), 1)); render(); },
  'new-move': () => { draft = newMoveDraft(); openSheet(renderMoveForm); setTimeout(() => $('.amount-input')?.focus(), 350); },
  'edit-move': el => {
    const m = FIN().moves.find(x => x.id === el.dataset.id);
    draft = { ...m, amountRaw: String(m.amount).replace('.', ',') }; openSheet(renderMoveForm);
  },
  'mv-type': el => { draft.type = el.dataset.v; if (!FIN_CATS[draft.type].includes(draft.cat)) draft.cat = FIN_CATS[draft.type][0]; refreshSheet(); },
  'mv-cat': el => { draft.cat = el.dataset.v; if (BIZ_CATS.includes(draft.cat)) draft.scope = 'negocio'; refreshSheet(); },
  'mv-scope': el => { draft.scope = el.dataset.v; refreshSheet(); },
  'save-move': () => {
    const amount = parseAmount(draft.amountRaw);
    if (!(amount > 0)) { toast('Ingresá un monto'); return; }
    if (!draft.date) draft.date = todayKey();
    const m = { type: draft.type, amount, cat: draft.cat, scope: draft.scope, note: (draft.note || '').trim(), date: draft.date };
    if (draft.id) Object.assign(FIN().moves.find(x => x.id === draft.id), m);
    else FIN().moves.push({ id: uid(), ts: Date.now(), ...m });
    ui.finMonth = m.date.slice(0, 7);
    save(); closeSheet(); render();
    toast(draft.id ? 'Movimiento guardado' : `${FIN_TYPES[m.type].name} anotado: ${money(amount)}`);
  },
  'delete-move': () => {
    const m = FIN().moves.find(x => x.id === draft.id);
    FIN().moves = FIN().moves.filter(x => x !== m);
    save(); closeSheet(); render();
    toast('Movimiento eliminado', () => { FIN().moves.push(m); save(); render(); });
  },
  'fin-settings': () => { draft = { fx: blankFx() }; openSheet(renderFinSettings); },
  'fin-currency': el => { FIN().currency = el.dataset.v; FIN().setupDone = true; save(); refreshSheet(); render(); },
  'fin-goal': el => { FIN().savingsGoal = +el.dataset.v; save(); refreshSheet(); render(); },
  'fx-type': el => { draft.fx.type = el.dataset.v; draft.fx.cat = FIN_CATS[el.dataset.v][0]; refreshSheet(); },
  'fx-cat': el => { draft.fx.cat = el.dataset.v; if (BIZ_CATS.includes(el.dataset.v)) draft.fx.scope = 'negocio'; refreshSheet(); },
  'fx-scope': el => { draft.fx.scope = el.dataset.v; refreshSheet(); },
  'fixed-add': () => {
    const fx = draft.fx, amount = parseAmount(fx.amountRaw);
    if (!fx.name.trim()) { toast('Ponele un nombre'); return; }
    if (!(amount > 0)) { toast('Ingresá un monto'); return; }
    addFixed({ type: fx.type, name: fx.name.trim(), amount, cat: fx.cat, scope: fx.scope });
    FIN().setupDone = true; draft.fx = blankFx(); save(); refreshSheet(); render(); toast('Fijo agregado');
  },
  'fixed-del': el => {
    const f = FIN().fixed.find(x => x.id === el.dataset.id);
    if (!confirm(`¿Quitar "${f.name}" de los fijos? Los meses anteriores no cambian.`)) return;
    endFixed(f); save(); refreshSheet(); render();
  },
});
