'use strict';
/* Preguntas iniciales: arman el perfil, las finanzas y una lista de hábitos sugeridos. */

const OB_STEPS = 7;
let ob = null;

function initOnboarding() {
  const p = state.profile, fin = state.finance, mi = typeof monthlyIncomeItem === 'function' ? monthlyIncomeItem() : null;
  ob = {
    step: 0,
    ans: {
      name: p.name, areas: [...p.areas], energy: p.energy || 'morning', howMany: p.howMany || 5,
      stage: p.stage || (p.onboarded ? 'none' : null), specialties: [...p.specialties],
      currency: fin.currency, incomeRaw: mi ? String(mi.amount) : '', savingsGoal: fin.savingsGoal,
    },
    picks: null, sugg: null,
  };
}
function startOnboarding() { initOnboarding(); goTab('onboarding'); }

function suggestHabits(a) {
  const areas = [...a.areas];
  if (a.stage && a.stage !== 'none') for (const c of ['negocio', 'creatividad']) if (!areas.includes(c)) areas.push(c);
  if (!areas.length) areas.push('salud', 'mente', 'productividad');
  const have = new Set(activeHabits().map(h => h.libId).filter(Boolean));
  const pools = areas.map(c => HABIT_LIBRARY.filter(l => l.cat === c && !have.has(l.id)));
  const out = [];
  for (let i = 0; out.length < 12 && pools.some(p => p.length); i++) {
    const p = pools[i % pools.length];
    if (p.length) out.push(p.shift());
  }
  return out;
}

const option = (act, v, on, title, desc = '') =>
  `<button class="option ${on ? 'on' : ''}" data-act="${act}" data-v="${v}"><b>${title}</b>${desc ? `<span>${desc}</span>` : ''}</button>`;

VIEWS.onboarding = function renderOnboarding() {
  if (!ob) initOnboarding();
  const a = ob.ans, s = ob.step;
  let body = '', canNext = true;

  if (s === 0) {
    body = `<div class="ob-emoji">👋</div><h1>Armemos tu app</h1>
      <p class="sub">Unas preguntas rápidas para proponerte hábitos, configurar tus finanzas y tu plan de negocio. Después podés cambiar todo.</p>
      <div class="label">¿Cómo te llamás?</div>
      <input class="text-input" data-ob="name" placeholder="Tu nombre" maxlength="24" value="${esc(a.name)}" autocomplete="given-name">`;
  } else if (s === 1) {
    body = `<h1>¿Qué querés mejorar?</h1><p class="sub">Elegí todas las que quieras.</p>
      <div class="options grid">${Object.entries(CATEGORIES).filter(([k]) => k !== 'otro').map(([k, c]) =>
        option('ob-area', k, a.areas.includes(k), `${c.emoji} ${c.name}`)).join('')}</div>`;
    canNext = a.areas.length > 0;
  } else if (s === 2) {
    body = `<h1>¿Cuándo tenés más energía?</h1><p class="sub">Ahí te ubico los hábitos que más cuestan (ejercicio, foco, proyectos).</p>
      <div class="options">${['morning', 'afternoon', 'evening'].map(t => option('ob-energy', t, a.energy === t, `${TIMES[t].emoji} ${TIMES[t].name}`)).join('')}</div>`;
  } else if (s === 3) {
    body = `<h1>¿Con cuántos hábitos arrancás?</h1><p class="sub">Empezar con pocos y sostenerlos funciona mejor que querer cambiar todo de golpe.</p>
      <div class="options">
        ${option('ob-many', 3, a.howMany === 3, '3 · Tranqui', 'Ideal si recién empezás.')}
        ${option('ob-many', 5, a.howMany === 5, '5 · Equilibrado', 'Un buen desafío sin abrumarte.')}
        ${option('ob-many', 8, a.howMany === 8, '8 · A full', 'Si ya tenés rutina y querés más.')}
      </div>`;
  } else if (s === 4) {
    body = `<h1>Tu negocio de foto y video</h1><p class="sub">¿En qué etapa estás?</p>
      <div class="options">${Object.entries(BIZ_STAGES).map(([k, st]) => option('ob-stage', k, a.stage === k, st.name, st.desc)).join('')}
        ${option('ob-stage', 'none', a.stage === 'none', 'No tengo un negocio de foto/video')}</div>
      ${a.stage && a.stage !== 'none' ? `<div class="label">¿Qué hacés? (opcional)</div>
        <div class="chips left">${SPECIALTIES.map(sp => `<button class="chip ${a.specialties.includes(sp) ? 'on' : ''}" data-act="ob-spec" data-v="${esc(sp)}">${esc(sp)}</button>`).join('')}</div>` : ''}`;
    canNext = !!a.stage;
  } else if (s === 5) {
    body = `<h1>Tus finanzas</h1><p class="sub">Para llevar ingresos, gastos y egresos.</p>
      <div class="label">Moneda</div>
      <div class="chips left">${CURRENCIES.map(c => `<button class="chip ${a.currency === c ? 'on' : ''}" data-act="ob-cur" data-v="${c}">${c}</button>`).join('')}</div>
      <div class="label">¿Cuánto te ingresa por mes, más o menos?</div>
      <div class="amount-wrap small"><span>${a.currency}</span><input class="amount-input" data-ob="incomeRaw" inputmode="decimal" placeholder="0" value="${esc(a.incomeRaw)}"></div>
      <div class="hint">Lo fijo. Si varía mucho, dejalo vacío y anotá cada ingreso.</div>
      <div class="label">¿Cuánto te gustaría ahorrar?</div>
      <div class="chips left">${[10, 15, 20, 30, 40].map(g => `<button class="chip ${a.savingsGoal === g ? 'on' : ''}" data-act="ob-save" data-v="${g}">${g}%</button>`).join('')}</div>`;
  } else {
    if (!ob.sugg) { ob.sugg = suggestHabits(a); ob.picks = new Set(ob.sugg.slice(0, a.howMany).map(l => l.id)); }
    body = `<h1>Tu rutina sugerida</h1><p class="sub">Según tus respuestas. Marcá o desmarcá lo que quieras; todo se puede editar después.</p>
      <div class="list">${ob.sugg.map(l => `
        <button class="${ob.picks.has(l.id) ? 'picked' : ''}" data-act="ob-pick" data-v="${l.id}">
          <span class="box">${ob.picks.has(l.id) ? '✓' : ''}</span>
          <span class="emoji sm" style="--c:${CATEGORIES[l.cat].color}">${l.emoji}</span>
          <span class="info"><span class="name">${esc(l.name)}</span><span class="sub">${CATEGORIES[l.cat].name} · ${libFreqText(l)}</span></span>
        </button>`).join('') || '<div>Ya tenés todos los hábitos sugeridos para estas áreas.</div>'}</div>`;
  }

  const dots = Array.from({ length: OB_STEPS }, (_, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('');
  const last = s === OB_STEPS - 1;
  return `<div class="ob">
    <div class="ob-top"><div class="dots">${dots}</div><button class="link" data-act="ob-skip">${state.profile.onboarded ? 'Cancelar' : 'Saltar'}</button></div>
    <div class="ob-body">${body}</div>
    <div class="ob-actions">
      ${s > 0 ? '<button class="btn ghost" data-act="ob-back">Atrás</button>' : ''}
      <button class="btn" data-act="ob-next" ${canNext ? '' : 'disabled'}>${last ? `Crear ${plural(ob.picks ? ob.picks.size : 0, 'hábito', 'hábitos')}` : 'Siguiente'}</button>
    </div></div>`;
};

function finishOnboarding() {
  const a = ob.ans, p = state.profile;
  Object.assign(p, {
    name: a.name.trim(), areas: a.areas, energy: a.energy, howMany: a.howMany,
    stage: a.stage === 'none' ? null : a.stage, specialties: a.stage === 'none' ? [] : a.specialties, onboarded: true,
  });
  state.finance.currency = a.currency;
  state.finance.savingsGoal = a.savingsGoal;
  const income = parseAmount(a.incomeRaw);
  if (income > 0 || monthlyIncomeItem()) { setMonthlyIncome(income); state.finance.setupDone = true; }
  let n = 0;
  for (const l of ob.sugg || []) {
    if (!ob.picks.has(l.id)) continue;
    const { id, ...fields } = libraryToDraft(l);
    state.habits.push(newHabit(fields)); n++;
  }
  save(); ob = null; ui.selected = todayKey(); ui.weekOffset = 0;
  goTab('hoy');
  toast(n ? `¡Listo! ${plural(n, 'hábito creado', 'hábitos creados')} 🎉` : '¡Listo!');
}

document.addEventListener('input', e => { const k = e.target.dataset.ob; if (k && ob) ob.ans[k] = e.target.value; });

const toggleIn = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
Object.assign(actions, {
  'start-onboarding': () => startOnboarding(),
  'ob-skip': () => { state.profile.onboarded = true; save(); ob = null; goTab('hoy'); },
  'ob-back': () => { ob.step = Math.max(0, ob.step - 1); window.scrollTo(0, 0); render(); },
  'ob-next': () => {
    if (ob.step === OB_STEPS - 1) return finishOnboarding();
    ob.step++; if (ob.step === OB_STEPS - 1) ob.sugg = null;
    window.scrollTo(0, 0); render();
  },
  'ob-area': el => { ob.ans.areas = toggleIn(ob.ans.areas, el.dataset.v); render(); },
  'ob-energy': el => { ob.ans.energy = el.dataset.v; render(); },
  'ob-many': el => { ob.ans.howMany = +el.dataset.v; render(); },
  'ob-stage': el => { ob.ans.stage = el.dataset.v; render(); },
  'ob-spec': el => { ob.ans.specialties = toggleIn(ob.ans.specialties, el.dataset.v); render(); },
  'ob-cur': el => { ob.ans.currency = el.dataset.v; render(); },
  'ob-save': el => { ob.ans.savingsGoal = +el.dataset.v; render(); },
  'ob-pick': el => { const id = el.dataset.v; ob.picks.has(id) ? ob.picks.delete(id) : ob.picks.add(id); render(); },
});
