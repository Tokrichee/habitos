'use strict';
/* Negocio de foto y video: facturación, tip del día, reto creativo, hábitos para crecer, plan e ideas. */

ui.roadmapStage = null;
const dayNumber = (d = today()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
const mod = (n, m) => ((n % m) + m) % m;
const tipIndex = () => mod(dayNumber() + state.biz.tipShift, TIPS.length);
function tipOfDay() { return TIPS[tipIndex()]; }
const weekKey = () => keyOf(mondayOf(today()));
const challengeOfWeek = () => CHALLENGES[mod(Math.floor(dayNumber(mondayOf(today())) / 7), CHALLENGES.length)];

VIEWS.negocio = function renderNegocio() {
  const p = state.profile, biz = state.biz, fin = FIN();
  const mk = monthKeyOf(today()), f = monthFin(mk);

  let html = `<div class="top"><div><h1>Tu negocio</h1>
    <div class="date">Foto y video${p.stage ? ` · ${esc(BIZ_STAGES[p.stage].name)}` : ''}</div></div></div>`;
  if (p.specialties.length) html += `<div class="chips left tags">${p.specialties.map(s => `<span class="chip sm">${esc(s)}</span>`).join('')}</div>`;

  if (!p.stage) {
    html += `<div class="panel cta"><h3>¿En qué etapa está tu negocio?</h3>
      <p class="sub">Con esto te armo un plan de crecimiento a medida.</p>
      <div class="options">${Object.entries(BIZ_STAGES).map(([k, s]) => `<button class="option" data-act="biz-stage" data-v="${k}"><b>${s.name}</b><span>${s.desc}</span></button>`).join('')}</div></div>`;
  }

  // Facturación
  const goal = fin.bizGoal, prog = goal ? f.bizIn / goal : 0;
  html += `<div class="panel">
    <h3>Facturación de ${MONTHS[today().getMonth()]} <button class="link small" data-act="fin-settings">${goal ? 'Meta' : 'Poner meta'}</button></h3>
    <div class="big-money">${money(f.bizIn)}${goal ? `<small> de ${money(goal)}</small>` : ''}</div>
    ${goal ? `<div class="bar thick"><i style="width:${pct(Math.min(1, prog))};background:${prog >= 1 ? 'var(--green)' : 'var(--accent)'}"></i></div>
      <p class="sub">${prog >= 1 ? '¡Meta del mes cumplida! 🎉' : `Te faltan ${money(goal - f.bizIn)} · ${pct(prog)} de la meta`}</p>` : ''}
    <div class="flows small"><div><span>Gastos del negocio</span><b>${money(f.bizOut)}</b></div>
      <div><span>Ganancia</span><b class="${f.bizIn - f.bizOut < 0 ? 'neg' : 'pos'}">${money(f.bizIn - f.bizOut)}</b></div></div>
    <div class="btn-row"><button class="btn sm" data-act="biz-income">+ Trabajo cobrado</button><button class="btn sm ghost" data-act="biz-expense">+ Gasto del negocio</button></div>
  </div>`;

  // Tip del día
  const tip = tipOfDay(), ti = tipIndex(), fav = biz.favTips.includes(ti);
  html += `<div class="panel tip">
    <div class="tip-cat">💡 Tip del día · ${esc(tip.cat)}</div>
    <h2>${esc(tip.title)}</h2><p>${esc(tip.text)}</p>
    <div class="btn-row"><button class="btn sm ghost" data-act="tip-fav">${fav ? '♥ Guardado' : '♡ Guardar'}</button>
      <button class="btn sm ghost" data-act="tip-next">Otro tip ›</button></div></div>`;

  // Reto creativo
  const wk = weekKey(), doneCh = !!biz.challenges[wk], totalCh = Object.keys(biz.challenges).length;
  html += `<div class="panel challenge ${doneCh ? 'done' : ''}">
    <div class="tip-cat">🎯 Reto creativo de la semana</div>
    <h2>${esc(challengeOfWeek())}</h2>
    <div class="btn-row"><button class="btn sm ${doneCh ? 'ghost' : ''}" data-act="challenge-done">${doneCh ? '✓ ¡Hecho!' : 'Lo hice'}</button>
    <span class="sub">${totalCh ? `${plural(totalCh, 'reto completado', 'retos completados')}` : 'Cambia cada lunes'}</span></div></div>`;

  // Hábitos para crecer
  const have = new Set(activeHabits().map(h => h.libId).filter(Boolean));
  const sugg = HABIT_LIBRARY.filter(l => (l.cat === 'negocio' || l.cat === 'creatividad'));
  html += `<div class="section-title row-between"><span>Hábitos para crecer</span><button class="link small" data-act="biz-library">Ver todos</button></div>
    <div class="list">${sugg.slice(0, 8).map(l => `
      <button data-act="biz-add-habit" data-v="${l.id}" ${have.has(l.id) ? 'disabled' : ''}>
        <span class="emoji sm" style="--c:${CATEGORIES[l.cat].color}">${l.emoji}</span>
        <span class="info"><span class="name">${esc(l.name)}</span><span class="sub">${libFreqText(l)}${l.note ? ` · ${esc(l.note)}` : ''}</span></span>
        <span class="right">${have.has(l.id) ? '✓' : '+'}</span></button>`).join('')}</div>`;

  // Plan de crecimiento
  const st = ui.roadmapStage || p.stage || 'inicio', items = ROADMAP[st];
  const doneN = items.filter((_, i) => biz.roadmap[`${st}-${i}`]).length;
  html += `<div class="section-title">Plan de crecimiento</div>
    ${seg(Object.entries(BIZ_STAGES).map(([k, s]) => [k, k === 'inicio' ? 'Empezando' : k === 'ocasional' ? 'Creciendo' : 'Profesional']), st, 'roadmap-stage')}
    <div class="panel" style="margin-top:10px">
      <h3>${esc(BIZ_STAGES[st].name)} <small>${doneN}/${items.length}</small></h3>
      <div class="bar" style="margin-bottom:12px"><i style="width:${pct(doneN / items.length)}"></i></div>
      ${items.map((txt, i) => { const on = biz.roadmap[`${st}-${i}`]; return `
        <button class="todo ${on ? 'on' : ''}" data-act="roadmap-toggle" data-v="${st}-${i}"><span class="box">${on ? '✓' : ''}</span><span>${esc(txt)}</span></button>`; }).join('')}
    </div>`;

  // Banco de ideas
  const ideas = [...biz.ideas].sort((a, b) => (a.done - b.done) || b.ts - a.ts);
  html += `<div class="section-title">Banco de ideas</div>
    <div class="idea-add"><input class="text-input" id="idea-input" placeholder="Idea para una sesión, video o post…" maxlength="140" enterkeyhint="done">
      <button class="icon-btn accent" data-act="idea-add" aria-label="Agregar idea">+</button></div>
    ${ideas.length ? `<div class="list">${ideas.map(i => `<div class="${i.done ? 'struck' : ''}">
      <button class="box-btn" data-act="idea-toggle" data-id="${i.id}"><span class="box">${i.done ? '✓' : ''}</span></button>
      <span class="info"><span class="name wrap">${esc(i.text)}</span><span class="sub">${parseKey(i.date).getDate()} ${MONTH_SHORT[parseKey(i.date).getMonth()]}</span></span>
      <button class="x" data-act="idea-del" data-id="${i.id}" aria-label="Borrar">×</button></div>`).join('')}</div>`
      : '<div class="hint">Anotá cualquier idea apenas aparece. Las marcás cuando las hacés.</div>'}`;

  // Tips guardados
  if (biz.favTips.length) {
    html += `<div class="section-title">Tips guardados</div><div class="list">${biz.favTips.map(i => TIPS[i] ? `
      <div><span class="info"><span class="name wrap">${esc(TIPS[i].title)}</span><span class="sub wrap">${esc(TIPS[i].text)}</span></span>
      <button class="x" data-act="tip-unfav" data-v="${i}" aria-label="Quitar">×</button></div>` : '').join('')}</div>`;
  }
  return html;
};

function addIdea() {
  const inp = $('#idea-input'), text = inp.value.trim();
  if (!text) return;
  state.biz.ideas.push({ id: uid(), text, date: todayKey(), ts: Date.now(), done: false });
  save(); render(); toast('Idea guardada 💡');
  $('#idea-input')?.focus();
}
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'idea-input') addIdea(); });

Object.assign(actions, {
  'biz-stage': el => { state.profile.stage = el.dataset.v; ui.roadmapStage = null; save(); render(); },
  'biz-income': () => { draft = { ...newMoveDraft(), date: todayKey(), type: 'ingreso', cat: 'Fotografía', scope: 'negocio' }; openSheet(renderMoveForm); },
  'biz-expense': () => { draft = { ...newMoveDraft(), date: todayKey(), type: 'egreso', cat: 'Equipo', scope: 'negocio' }; openSheet(renderMoveForm); },
  'tip-next': () => { state.biz.tipShift++; save(); render(); },
  'tip-fav': () => {
    const i = tipIndex(), favs = state.biz.favTips;
    state.biz.favTips = favs.includes(i) ? favs.filter(x => x !== i) : [...favs, i];
    save(); render();
  },
  'tip-unfav': el => { state.biz.favTips = state.biz.favTips.filter(x => x !== +el.dataset.v); save(); render(); },
  'challenge-done': () => {
    const wk = weekKey();
    if (state.biz.challenges[wk]) delete state.biz.challenges[wk];
    else { state.biz.challenges[wk] = true; toast('¡Reto cumplido! 🎉'); }
    save(); render();
  },
  'biz-add-habit': el => {
    const lib = HABIT_LIBRARY.find(l => l.id === el.dataset.v);
    state.habits.push(newHabit((({ id, libCat, ...rest }) => rest)(libraryToDraft(lib))));
    save(); render(); toast(`"${lib.name}" agregado a tus hábitos`);
  },
  'biz-library': () => { draft = { libCat: 'negocio' }; openSheet(renderLibrary); },
  'roadmap-stage': el => { ui.roadmapStage = el.dataset.v; render(); },
  'roadmap-toggle': el => {
    const k = el.dataset.v;
    if (state.biz.roadmap[k]) delete state.biz.roadmap[k]; else { state.biz.roadmap[k] = todayKey(); haptic(); }
    save(); render();
  },
  'idea-add': () => addIdea(),
  'idea-toggle': el => { const i = state.biz.ideas.find(x => x.id === el.dataset.id); i.done = !i.done; save(); render(); },
  'idea-del': el => {
    const i = state.biz.ideas.find(x => x.id === el.dataset.id);
    state.biz.ideas = state.biz.ideas.filter(x => x !== i); save(); render();
    toast('Idea borrada', () => { state.biz.ideas.push(i); save(); render(); });
  },
});
