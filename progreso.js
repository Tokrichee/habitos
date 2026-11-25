'use strict';
/* Vista Progreso: análisis detallado por período, día de la semana, momento del día, área y hábito. */

ui.period = 'week';
const PERIODS = {
  week:  { days: 7,   name: 'Semana', prev: 'la semana anterior' },
  month: { days: 30,  name: 'Mes',    prev: 'el mes anterior' },
  year:  { days: 365, name: 'Año',    prev: 'el año anterior' },
};

function deltaBadge(cur, prev) {
  if (cur == null || prev == null) return '';
  const d = Math.round((cur - prev) * 100);
  if (d === 0) return '<span class="delta">= 0</span>';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</span>`;
}

VIEWS.stats = function renderStats() {
  const habits = activeHabits(), t = today();
  const head = `<div class="top"><div><h1>Progreso</h1><div class="date">Análisis de tus hábitos</div></div></div>
    ${seg(Object.entries(PERIODS).map(([v, p]) => [v, p.name]), ui.period, 'period')}`;
  if (!habits.length) return head + `<div class="empty"><div class="big">📊</div><div>Cuando tengas hábitos, acá vas a ver tus rachas y estadísticas.</div></div>`;

  const P = PERIODS[ui.period];
  const from = addDays(t, -(P.days - 1));
  const prevTo = addDays(from, -1), prevFrom = addDays(prevTo, -(P.days - 1));
  const cur = groupRate(habits, from, t), prev = groupRate(habits, prevFrom, prevTo);

  // Recorrido día por día
  let perfect = 0, activeDays = 0;
  const wd = Array.from({ length: 7 }, () => ({ d: 0, t: 0 }));
  const daily = [];
  for (let d = new Date(from); d <= t; d = addDays(d, 1)) {
    const p = dayProgress(d, habits);
    daily.push({ d, p });
    if (!p.total) continue;
    if (+d === +t && p.done < p.total) { if (p.done) { wd[d.getDay()].d += p.done; wd[d.getDay()].t += p.done; activeDays++; } continue; } // hoy todavía no terminó
    wd[d.getDay()].d += p.done; wd[d.getDay()].t += p.total;
    if (p.done === p.total) perfect++;
    if (p.done > 0) activeDays++;
  }
  const fk = keyOf(from), tk = keyOf(t);
  let checkins = 0;
  for (const h of habits) for (const k of Object.keys(state.log[h.id] || {})) if (k >= fk && k <= tk && isDone(h, k)) checkins++;
  const bestStreak = Math.max(0, ...habits.map(h => streaks(h).current));

  // Gráfico principal
  let chart;
  if (ui.period === 'year') {
    const items = [];
    for (let i = 11; i >= 0; i--) {
      const ms = addMonths(t, -i), me = addDays(addMonths(t, -i + 1), -1);
      items.push({ v: groupRate(habits, ms, me), label: MONTH_SHORT[ms.getMonth()][0].toUpperCase(), hi: i === 0 });
    }
    chart = bars(items);
  } else {
    chart = bars(daily.map(({ d, p }, i) => ({
      v: p.total ? p.frac : null, hi: i === daily.length - 1,
      label: ui.period === 'week' ? DAY_LETTER[d.getDay()] : (i % 5 === 0 || i === daily.length - 1 ? d.getDate() : ''),
    })), { height: 120 });
  }

  // Día de la semana
  const wdRates = WEEK_ORDER.map(d => ({ d, r: wd[d].t ? wd[d].d / wd[d].t : null }));
  const wdBars = bars(wdRates.map(x => ({ v: x.r, label: DAY_LETTER[x.d] })), { height: 80 });
  const withData = wdRates.filter(x => x.r != null);
  const bestWd = withData.reduce((a, b) => (b.r > (a?.r ?? -1) ? b : a), null);
  const worstWd = withData.reduce((a, b) => (b.r < (a?.r ?? 2) ? b : a), null);

  // Momento del día y área
  const byTime = TIME_ORDER.map(tm => ({ tm, r: groupRate(habits.filter(h => habitTime(h) === tm), from, t) })).filter(x => x.r != null);
  const byCat = Object.keys(CATEGORIES).map(c => ({ c, r: groupRate(habits.filter(h => h.category === c), from, t) })).filter(x => x.r != null);
  const hbar = (label, r, color) => `<div class="hbar"><span>${label}</span><div class="bar"><i style="width:${pct(r)};${color ? `background:${color}` : ''}"></i></div><b>${pct(r)}</b></div>`;

  // Ranking de hábitos
  const ranked = habits.map(h => ({ h, r: rangeRate(habitRange(h, from, t)), pr: rangeRate(habitRange(h, prevFrom, prevTo)), s: streaks(h) }))
    .sort((a, b) => (b.r ?? -1) - (a.r ?? -1));

  // Conclusiones
  const insights = [];
  if (cur != null && prev != null) {
    const d = Math.round((cur - prev) * 100);
    insights.push(d >= 3 ? `📈 Mejoraste <b>${d} puntos</b> respecto a ${P.prev}.`
      : d <= -3 ? `📉 Bajaste <b>${-d} puntos</b> respecto a ${P.prev}. Volvé de a poco: un hábito por vez.`
      : `➡️ Te mantenés estable respecto a ${P.prev}.`);
  }
  if (perfect) insights.push(`⭐ Tuviste <b>${plural(perfect, 'día perfecto', 'días perfectos')}</b> en este período.`);
  if (bestWd && worstWd && bestWd.d !== worstWd.d && bestWd.r - worstWd.r >= .1) {
    insights.push(`💪 Tu mejor día es el <b>${DAY_LONG[bestWd.d]}</b> (${pct(bestWd.r)}).`);
    insights.push(`😴 El día que más te cuesta es el <b>${DAY_LONG[worstWd.d]}</b> (${pct(worstWd.r)}). Probá dejarle menos hábitos.`);
  }
  if (byTime.length > 1) {
    const b = byTime.reduce((a, x) => (x.r > a.r ? x : a));
    insights.push(`${TIMES[b.tm].emoji} Rendís mejor en el momento <b>${TIMES[b.tm].name.toLowerCase()}</b> (${pct(b.r)}).`);
  }
  const top = ranked.find(x => x.r != null);
  if (top && top.r >= .6) insights.push(`🏆 Tu hábito más constante: <b>${esc(top.h.name)}</b> (${pct(top.r)}).`);
  const low = [...ranked].reverse().find(x => x.r != null && x.r < .6);
  if (low && low !== top) insights.push(`⚠️ <b>${esc(low.h.name)}</b> necesita atención (${pct(low.r)}). ¿Lo hacés más fácil o lo pasás a menos días?`);

  return head + `
    <div class="hero-stat">
      <div>${ring(cur || 0, 'var(--accent)', 96, 9)}<b>${cur == null ? '–' : pct(cur)}</b></div>
      <div><div class="sub">Cumplimiento · últimos ${P.days} días</div>
        <div class="big-delta">${deltaBadge(cur, prev)} <small>vs ${P.prev}</small></div></div>
    </div>
    <div class="tiles">
      <div class="tile"><b>${perfect}</b><span>Días perfectos</span></div>
      <div class="tile"><b>${checkins}</b><span>Hábitos cumplidos</span></div>
      <div class="tile"><b>🔥 ${bestStreak}</b><span>Mejor racha activa</span></div>
    </div>
    ${insights.length ? `<div class="panel insights"><h3>Lo que dicen tus números</h3>${insights.map(i => `<p>${i}</p>`).join('')}</div>` : ''}
    <div class="panel"><h3>${ui.period === 'year' ? 'Mes a mes' : 'Día a día'} <small>% de hábitos hechos</small></h3>${chart}</div>
    <div class="panel"><h3>Por día de la semana</h3>${wdBars}</div>
    ${byTime.length > 1 ? `<div class="panel"><h3>Por momento del día</h3>${byTime.map(x => hbar(`${TIMES[x.tm].emoji} ${TIMES[x.tm].name}`, x.r)).join('')}</div>` : ''}
    ${byCat.length > 1 ? `<div class="panel"><h3>Por área</h3>${byCat.map(x => hbar(`${CATEGORIES[x.c].emoji} ${CATEGORIES[x.c].name}`, x.r, CATEGORIES[x.c].color)).join('')}</div>` : ''}
    <div class="section-title">Ranking de hábitos</div>
    ${ranked.map(({ h, r, pr, s }) => `
      <button class="habit-row" data-act="open-detail" data-id="${h.id}" style="--c:${h.color}">
        <div class="row-head">
          <span class="emoji">${esc(h.emoji)}</span>
          <span class="info"><span class="name">${esc(h.name)}</span><span class="sub">🔥 ${streakLabel(s.current, s.weekly)} · mejor ${s.best}</span></span>
          <span class="meta"><b>${r == null ? '–' : pct(r)}</b>${deltaBadge(r, pr)}</span>
        </div>
        ${heatmap(h, ui.period === 'week' ? 8 : ui.period === 'month' ? 12 : 20)}
      </button>`).join('')}`;
};

actions.period = el => { ui.period = el.dataset.v; render(); };
